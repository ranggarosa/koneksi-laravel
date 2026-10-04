<?php

namespace Tests\Feature;

use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class LetterDraftTest extends TestCase
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
            'description' => 'Surat Peringatan Pertama',
            'content_schema' => [
                'employee_name' => 'string',
                'infraction_detail' => 'string',
            ],
            'default_tiers' => ['reviewer', 'approver'],
            'is_active' => true,
        ]);
    }

    public function test_drafter_can_create_internal_draft_and_allocates_atomic_number(): void
    {
        $response = $this->actingAs($this->drafter)->post(route('letters.store'), [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan - Indisipliner',
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'content_data' => [
                'employee_name' => 'Budi Santoso',
                'infraction_detail' => 'Keterlambatan berulang',
            ],
            'reviewers' => [
                ['user_id' => $this->reviewer->id, 'role_type' => 'reviewer'],
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $response->assertRedirect();
        
        $this->assertDatabaseHas('letters', [
            'template_id' => $this->template->id,
            'user_id' => $this->drafter->id,
            'status' => Letter::STATUS_IN_REVIEW,
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
        ]);

        $letter = Letter::where('recipient', 'Budi Santoso')->first();
        $this->assertNotNull($letter);
        $this->assertNotNull($letter->reference_number);
        $this->assertStringContainsString('.SP1/', $letter->reference_number);

        // Verify workflow tiers created
        $this->assertDatabaseHas('approval_workflows', [
            'letter_id' => $letter->id,
            'user_id' => $this->reviewer->id,
            'step_order' => 1,
            'role_type' => 'reviewer',
            'status' => ApprovalWorkflow::STATUS_PENDING,
        ]);

        $this->assertDatabaseHas('approval_workflows', [
            'letter_id' => $letter->id,
            'user_id' => $this->approver->id,
            'step_order' => 2,
            'role_type' => 'approver',
            'status' => ApprovalWorkflow::STATUS_WAITING,
        ]);
    }

    public function test_draft_creation_fails_validation_if_required_fields_missing(): void
    {
        $response = $this->actingAs($this->drafter)->post(route('letters.store'), [
            'template_id' => $this->template->id,
            // Missing subject, recipient, signature_type, reviewers
        ]);

        $response->assertSessionHasErrors(['subject', 'recipient', 'signature_type', 'reviewers']);
    }

    public function test_drafter_cannot_select_self_in_approval_workflow_tiers(): void
    {
        $response = $this->actingAs($this->drafter)->post(route('letters.store'), [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan - Indisipliner',
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'content_data' => [],
            'reviewers' => [
                ['user_id' => $this->drafter->id, 'role_type' => 'reviewer'], // Drafter assigning self!
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $response->assertSessionHasErrors(['reviewers']);
        $this->assertDatabaseMissing('letters', ['subject' => 'Surat Peringatan - Indisipliner']);
    }

    public function test_user_without_drafter_or_admin_role_cannot_create_draft(): void
    {
        $response = $this->actingAs($this->reviewer)->post(route('letters.store'), [
            'template_id' => $this->template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan',
            'recipient' => 'Budi Santoso',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'reviewers' => [
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $response->assertForbidden();
    }
}
