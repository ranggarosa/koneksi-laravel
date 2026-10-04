<?php

namespace Tests\Feature;

use App\Models\AuditLog;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use App\Services\AuditService;
use DomainException;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class AuditLogTest extends TestCase
{
    use RefreshDatabase;

    public function test_audit_service_creates_immutable_log_entry(): void
    {
        $user = User::factory()->create([
            'email' => 'drafter@koneksi.local',
            'role' => User::ROLE_DRAFTER,
        ]);

        $service = new AuditService();

        $log = $service->log(
            letter: null,
            action: 'test_action',
            fromStatus: null,
            toStatus: Letter::STATUS_DRAFT,
            metadata: ['ip' => '127.0.0.1'],
            actor: $user
        );

        $this->assertDatabaseHas('audit_logs', [
            'id' => $log->id,
            'actor_email' => 'drafter@koneksi.local',
            'action' => 'test_action',
            'to_status' => Letter::STATUS_DRAFT,
        ]);
        $this->assertEquals(['ip' => '127.0.0.1'], $log->metadata);
    }

    public function test_audit_log_cannot_be_updated(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Audit logs are immutable and cannot be updated.');

        $log = AuditLog::create([
            'actor_email' => 'admin@koneksi.local',
            'action' => 'initial_action',
        ]);

        $log->update(['action' => 'tampered_action']);
    }

    public function test_audit_log_cannot_be_deleted(): void
    {
        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Audit logs are immutable and cannot be deleted.');

        $log = AuditLog::create([
            'actor_email' => 'admin@koneksi.local',
            'action' => 'initial_action',
        ]);

        $log->delete();
    }

    public function test_official_or_numbered_letters_cannot_be_permanently_deleted(): void
    {
        $template = LetterTemplate::create([
            'code' => 'SKK',
            'name' => 'Surat Keterangan Kerja',
            'description' => 'Test template',
            'content_schema' => [],
            'default_tiers' => ['approver'],
            'is_active' => true,
        ]);

        $user = User::factory()->create(['role' => User::ROLE_DRAFTER]);

        $letter = Letter::create([
            'template_id' => $template->id,
            'user_id' => $user->id,
            'type' => 'internal',
            'reference_number' => '0001.SKK/X/2026',
            'sequence_number' => 1,
            'month_roman' => 'X',
            'year' => 2026,
            'letter_date' => now(),
            'subject' => 'Surat Keterangan',
            'recipient' => 'Jane Doe',
            'content_data' => ['employee_name' => 'Jane Doe'],
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'status' => Letter::STATUS_IN_REVIEW,
        ]);

        $this->expectException(DomainException::class);
        $this->expectExceptionMessage('Official letters and issued reference numbers cannot be permanently deleted');

        $letter->forceDelete();
    }

    public function test_draft_letter_can_be_soft_deleted_and_force_deleted(): void
    {
        $template = LetterTemplate::create([
            'code' => 'SKK',
            'name' => 'Surat Keterangan Kerja',
            'description' => 'Test template',
            'content_schema' => [],
            'default_tiers' => ['approver'],
            'is_active' => true,
        ]);

        $user = User::factory()->create(['role' => User::ROLE_DRAFTER]);

        $letter = Letter::create([
            'template_id' => $template->id,
            'user_id' => $user->id,
            'type' => 'internal',
            'subject' => 'Draft Surat',
            'recipient' => 'Jane Doe',
            'content_data' => [],
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'status' => Letter::STATUS_DRAFT,
        ]);

        $letter->delete();
        $this->assertSoftDeleted('letters', ['id' => $letter->id]);

        $letter->forceDelete();
        $this->assertDatabaseMissing('letters', ['id' => $letter->id]);
    }
}
