<?php

namespace Tests\Feature;

use App\Console\Commands\CheckExpiredReservationsCommand;
use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\RecycledNumberPool;
use App\Models\User;
use App\Services\LetterService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class TakeNumberTest extends TestCase
{
    use RefreshDatabase;

    private User $drafter;
    private User $approver;
    private LetterTemplate $template;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->drafter = User::factory()->create([
            'email' => 'drafter@koneksi.local',
            'role' => User::ROLE_DRAFTER,
        ]);

        $this->approver = User::factory()->create([
            'email' => 'approver@koneksi.local',
            'role' => User::ROLE_APPROVER,
        ]);

        $this->template = LetterTemplate::create([
            'code' => 'PKS',
            'name' => 'Perjanjian Kerja Sama',
            'description' => 'Test',
            'content_schema' => [],
            'default_tiers' => ['approver'],
            'is_active' => true,
        ]);
    }

    public function test_rejects_backdated_reservation_request(): void
    {
        $response = $this->actingAs($this->drafter)->post(route('take-number.store'), [
            'template_id' => $this->template->id,
            'letter_date' => now()->subDays(2)->format('Y-m-d'), // Backdated!
            'subject' => 'PKS Mitra Vendor',
            'recipient' => 'PT Mitra Sejahtera',
            'approver_id' => $this->approver->id,
        ]);

        $response->assertSessionHasErrors(['letter_date']);
    }

    public function test_reserves_external_number_with_7_day_deadline(): void
    {
        $response = $this->actingAs($this->drafter)->post(route('take-number.store'), [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'PKS Mitra Vendor',
            'recipient' => 'PT Mitra Sejahtera',
            'approver_id' => $this->approver->id,
        ]);

        $response->assertRedirect();

        $letter = Letter::where('subject', 'PKS Mitra Vendor')->first();
        $this->assertNotNull($letter);
        $this->assertEquals('external', $letter->type);
        $this->assertEquals(Letter::STATUS_IN_REVIEW, $letter->status);
        $this->assertNotNull($letter->reference_number);

        // Approver signs off on Ambil Nomor request
        $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Nomor direservasi untuk dokumen fisik.',
        ]);

        $letter->refresh();
        $this->assertEquals(Letter::STATUS_PENDING_UPLOAD, $letter->status);
        $this->assertNotNull($letter->reconciliation_deadline);
        $this->assertTrue(
            Carbon::now()->addDays(6)->isBefore($letter->reconciliation_deadline)
        );
    }

    public function test_expiration_command_expires_overdue_reservations_and_pools_number(): void
    {
        /** @var LetterService $service */
        $service = app(LetterService::class);
        $letter = $service->reserveExternalNumber($this->drafter, [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'PKS Overdue',
            'recipient' => 'Vendor Lama',
            'approver_id' => $this->approver->id,
        ]);

        // Mock letter to pending_upload with past deadline (8 days ago)
        $letter->update([
            'status' => Letter::STATUS_PENDING_UPLOAD,
            'reconciliation_deadline' => now()->subDay(),
        ]);

        // Run expiration command
        $this->artisan('letters:check-expired')
            ->assertExitCode(0);

        $letter->refresh();
        $this->assertEquals(Letter::STATUS_EXPIRED, $letter->status);

        // Verify sequence number was placed in recycled pool
        $this->assertDatabaseHas('recycled_number_pools', [
            'template_code' => 'PKS',
            'sequence_number' => $letter->sequence_number,
            'letter_id' => $letter->id,
            'is_claimed' => false,
        ]);
    }
}
