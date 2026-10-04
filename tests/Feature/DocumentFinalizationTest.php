<?php

namespace Tests\Feature;

use App\Jobs\GenerateLetterPdfJob;
use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use App\Services\DocumentService;
use App\Services\LetterService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Queue;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class DocumentFinalizationTest extends TestCase
{
    use RefreshDatabase;

    private User $drafter;
    private User $approver;
    private LetterTemplate $template;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');
        Storage::fake('r2');

        $this->drafter = User::factory()->create([
            'email' => 'drafter@koneksi.local',
            'role' => User::ROLE_DRAFTER,
        ]);

        $this->approver = User::factory()->create([
            'email' => 'approver@koneksi.local',
            'role' => User::ROLE_APPROVER,
        ]);

        $this->template = LetterTemplate::create([
            'code' => 'SKK',
            'name' => 'Surat Keterangan Kerja',
            'description' => 'Test',
            'content_schema' => [],
            'default_tiers' => ['approver'],
            'is_active' => true,
        ]);
    }

    public function test_digital_signature_approval_dispatches_pdf_generation_job(): void
    {
        Queue::fake();

        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->createDraft($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Keterangan Kerja Digital',
            'recipient' => 'Jane Doe',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'reviewers' => [
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $response = $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Tanda tangan digital',
        ]);

        $response->assertRedirect();
        $this->assertEquals(Letter::STATUS_APPROVED, $letter->fresh()->status);

        Queue::assertPushed(GenerateLetterPdfJob::class, function ($job) use ($letter) {
            return $job->letterId === $letter->id;
        });
    }

    public function test_wet_signature_workflow_transitions_to_awaiting_and_allows_scan_upload(): void
    {
        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->createDraft($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Keputusan Wet Signature',
            'recipient' => 'Jane Doe',
            'signature_type' => Letter::SIGNATURE_WET,
            'reviewers' => [
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        // Approver signs
        $resApprove = $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Silakan dicetak dan ditandatangani fisik.',
        ]);
        $resApprove->assertRedirect();

        // Status is awaiting wet signature
        $this->assertEquals(Letter::STATUS_AWAITING_WET_SIGNATURE, $letter->fresh()->status);

        // Drafter uploads scanned PDF
        $file = UploadedFile::fake()->create('signed_letter.pdf', 500, 'application/pdf');

        $resUpload = $this->actingAs($this->drafter)->post(route('letters.scan.store', $letter), [
            'scan_file' => $file,
        ]);
        $resUpload->assertRedirect();

        $letter->refresh();
        $this->assertEquals(Letter::STATUS_APPROVED, $letter->status);
        $this->assertNotNull($letter->file_path);
    }

    public function test_scan_upload_rejects_non_pdf_files(): void
    {
        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->createDraft($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Keputusan Wet Signature',
            'recipient' => 'Jane Doe',
            'signature_type' => Letter::SIGNATURE_WET,
            'reviewers' => [
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $letter->update(['status' => Letter::STATUS_AWAITING_WET_SIGNATURE]);

        $invalidFile = UploadedFile::fake()->create('document.exe', 100, 'application/octet-stream');

        $response = $this->actingAs($this->drafter)->post(route('letters.scan.store', $letter), [
            'scan_file' => $invalidFile,
        ]);

        $response->assertSessionHasErrors(['scan_file']);
        $this->assertEquals(Letter::STATUS_AWAITING_WET_SIGNATURE, $letter->fresh()->status);
    }
}
