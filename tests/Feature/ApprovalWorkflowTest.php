<?php

namespace Tests\Feature;

use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\RecycledNumberPool;
use App\Models\User;
use App\Services\LetterService;
use App\Services\NumberingService;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class ApprovalWorkflowTest extends TestCase
{
    use RefreshDatabase;

    private User $drafter;
    private User $reviewer;
    private User $approver;
    private LetterTemplate $template;

    protected function setUp(): void
    {
        parent::setUp();

        $this->drafter = User::factory()->create([
            'email' => 'drafter@koneksi.local',
            'role' => User::ROLE_DRAFTER,
        ]);

        $this->reviewer = User::factory()->create([
            'email' => 'reviewer@koneksi.local',
            'role' => User::ROLE_REVIEWER,
        ]);

        $this->approver = User::factory()->create([
            'email' => 'approver@koneksi.local',
            'role' => User::ROLE_APPROVER,
        ]);

        $this->template = LetterTemplate::create([
            'code' => 'SP1',
            'name' => 'Surat Peringatan 1',
            'description' => 'Test',
            'content_schema' => [],
            'default_tiers' => ['reviewer', 'approver'],
            'is_active' => true,
        ]);
    }

    public function test_approver_cannot_approve_out_of_sequence(): void
    {
        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->createDraft($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan',
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'reviewers' => [
                ['user_id' => $this->reviewer->id, 'role_type' => 'reviewer'],
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        // Approver attempts to approve while Step 1 is still pending
        $response = $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Langsung saya tandatangani',
        ]);

        $response->assertForbidden();
    }

    public function test_sequential_approval_advances_tiers_correctly(): void
    {
        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->createDraft($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan',
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'reviewers' => [
                ['user_id' => $this->reviewer->id, 'role_type' => 'reviewer'],
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        // 1. Reviewer approves Step 1
        $res1 = $this->actingAs($this->reviewer)->post(route('letters.approve', $letter), [
            'notes' => 'Naskah sudah sesuai format',
        ]);
        $res1->assertRedirect();

        $step1 = $letter->workflows()->where('step_order', 1)->first();
        $this->assertEquals(ApprovalWorkflow::STATUS_APPROVED, $step1->status);
        $this->assertEquals('Naskah sudah sesuai format', $step1->notes);

        $step2 = $letter->workflows()->where('step_order', 2)->first();
        $this->assertEquals(ApprovalWorkflow::STATUS_PENDING, $step2->status);

        // Letter status is still in_review until final approver signs
        $this->assertEquals(Letter::STATUS_IN_REVIEW, $letter->fresh()->status);

        // 2. Approver signs Step 2 (Digital Signature)
        $res2 = $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Disetujui dan ditandatangani',
        ]);
        $res2->assertRedirect();

        $this->assertEquals(ApprovalWorkflow::STATUS_APPROVED, $step2->fresh()->status);
        $this->assertEquals(Letter::STATUS_APPROVED, $letter->fresh()->status);
    }

    public function test_rejection_requires_mandatory_notes_and_recycles_reference_number(): void
    {
        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->createDraft($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan',
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'reviewers' => [
                ['user_id' => $this->reviewer->id, 'role_type' => 'reviewer'],
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        // Attempt rejection without notes -> validation fails
        $resWithoutNotes = $this->actingAs($this->reviewer)->post(route('letters.reject', $letter), [
            'notes' => '',
        ]);
        $resWithoutNotes->assertSessionHasErrors(['notes']);

        // Reject with notes
        $response = $this->actingAs($this->reviewer)->post(route('letters.reject', $letter), [
            'notes' => 'Kesalahan pada pasal pelanggaran, mohon perbaiki.',
        ]);
        $response->assertRedirect();

        // Verify letter status is permanently rejected
        $this->assertEquals(Letter::STATUS_REJECTED, $letter->fresh()->status);

        // Verify step 1 is marked rejected
        $step1 = $letter->workflows()->where('step_order', 1)->first();
        $this->assertEquals(ApprovalWorkflow::STATUS_REJECTED, $step1->status);
        $this->assertEquals('Kesalahan pada pasal pelanggaran, mohon perbaiki.', $step1->notes);

        // Verify number was released into recycled pool
        $this->assertDatabaseHas('recycled_number_pools', [
            'template_code' => 'SP1',
            'sequence_number' => $letter->sequence_number,
            'letter_id' => $letter->id,
            'is_claimed' => false,
        ]);
    }
}
