<?php

namespace Tests\Feature;

use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use App\Services\LetterService;
use Database\Seeders\LetterTemplateSeeder;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Tests\TestCase;

class RealLetterCasesTest extends TestCase
{
    use RefreshDatabase;

    private User $drafter;
    private User $reviewer;
    private User $approver;

    protected function setUp(): void
    {
        parent::setUp();
        Storage::fake('local');

        $this->seed(LetterTemplateSeeder::class);

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
    }

    public function test_case_1_skk_single_step_digital_approval(): void
    {
        $template = LetterTemplate::where('code', 'SKK')->firstOrFail();

        $response = $this->actingAs($this->drafter)->post(route('letters.store'), [
            'template_id' => $template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Keterangan Kerja Karyawan Tetap',
            'recipient' => 'Ahmad Fauzi',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'content_data' => [
                'employee_name' => 'Ahmad Fauzi',
                'employee_id' => 'EMP-2024-001',
                'department' => 'Engineering',
                'start_date' => '2024-01-15',
                'purpose' => 'Pengajuan KPR',
            ],
            'reviewers' => [
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $response->assertRedirect();
        $letter = Letter::where('subject', 'Surat Keterangan Kerja Karyawan Tetap')->firstOrFail();
        $this->assertEquals(Letter::STATUS_IN_REVIEW, $letter->status);
        $this->assertStringContainsString('.SKK/', $letter->reference_number);

        // Approver signs digitally
        $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Tanda tangan digital terverifikasi.',
        ]);

        $this->assertEquals(Letter::STATUS_APPROVED, $letter->fresh()->status);
    }

    public function test_case_2_sp1_two_tier_sequential_review(): void
    {
        $template = LetterTemplate::where('code', 'SP1')->firstOrFail();

        $response = $this->actingAs($this->drafter)->post(route('letters.store'), [
            'template_id' => $template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Peringatan Pertama - Keterlambatan',
            'recipient' => 'Doni Darmawan',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'content_data' => [
                'employee_name' => 'Doni Darmawan',
                'infraction_date' => '2026-10-01',
                'infraction_detail' => 'Keterlambatan berturut-turut selama 5 hari kerja',
                'sanction' => 'Teguran tertulis pertama',
            ],
            'reviewers' => [
                ['user_id' => $this->reviewer->id, 'role_type' => 'reviewer'],
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $response->assertRedirect();
        $letter = Letter::where('subject', 'Surat Peringatan Pertama - Keterlambatan')->firstOrFail();

        // 1. Reviewer approves
        $this->actingAs($this->reviewer)->post(route('letters.approve', $letter), [
            'notes' => 'Telah ditinjau sesuai bukti absensi.',
        ]);
        $this->assertEquals(Letter::STATUS_IN_REVIEW, $letter->fresh()->status);

        // 2. Approver signs
        $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Disahkan.',
        ]);
        $this->assertEquals(Letter::STATUS_APPROVED, $letter->fresh()->status);
    }

    public function test_case_3_sk_wet_signature_with_scan_upload(): void
    {
        $template = LetterTemplate::where('code', 'SK')->firstOrFail();

        $response = $this->actingAs($this->drafter)->post(route('letters.store'), [
            'template_id' => $template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Surat Keputusan Pengangkatan Tim Ad-Hoc',
            'recipient' => 'Seluruh Anggota Tim',
            'signature_type' => Letter::SIGNATURE_WET,
            'content_data' => [
                'decision_title' => 'Pembentukan Satgas Keamanan Siber',
                'legal_basis' => 'Peraturan Direksi No. 12 Tahun 2025',
                'stipulation' => 'Menetapkan susunan panitia ad-hoc pengawasan sistem',
            ],
            'reviewers' => [
                ['user_id' => $this->approver->id, 'role_type' => 'approver'],
            ],
        ]);

        $letter = Letter::where('subject', 'Surat Keputusan Pengangkatan Tim Ad-Hoc')->firstOrFail();

        // Approver signs wet signature workflow
        $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Naskah dicetak untuk tanda tangan basah pimpinan.',
        ]);

        $this->assertEquals(Letter::STATUS_AWAITING_WET_SIGNATURE, $letter->fresh()->status);

        // Drafter uploads scan
        $file = UploadedFile::fake()->create('sk_signed.pdf', 800, 'application/pdf');
        $this->actingAs($this->drafter)->post(route('letters.scan.store', $letter), [
            'scan_file' => $file,
        ]);

        $this->assertEquals(Letter::STATUS_APPROVED, $letter->fresh()->status);
    }

    public function test_case_4_pks_external_take_number_and_public_agenda(): void
    {
        $template = LetterTemplate::where('code', 'PKS')->firstOrFail();

        // 1. Drafter reserves external number
        $this->actingAs($this->drafter)->post(route('take-number.store'), [
            'template_id' => $template->id,
            'letter_date' => now()->format('Y-m-d'),
            'subject' => 'Perjanjian Kerja Sama Integrasi Data',
            'recipient' => 'PT Telekomunikasi Solusi',
            'approver_id' => $this->approver->id,
        ]);

        $letter = Letter::where('subject', 'Perjanjian Kerja Sama Integrasi Data')->firstOrFail();

        // 2. Approver approves reservation
        $this->actingAs($this->approver)->post(route('letters.approve', $letter), [
            'notes' => 'Nomor dialokasikan untuk draft MoU fisik.',
        ]);

        $this->assertEquals(Letter::STATUS_PENDING_UPLOAD, $letter->fresh()->status);

        // 3. Drafter uploads scan
        $file = UploadedFile::fake()->create('pks_signed.pdf', 1200, 'application/pdf');
        $this->actingAs($this->drafter)->post(route('letters.scan.store', $letter), [
            'scan_file' => $file,
        ]);

        $this->assertEquals(Letter::STATUS_APPROVED, $letter->fresh()->status);

        // 4. Verify public agenda book displays this approved letter
        $resAgenda = $this->get(route('agenda.index'));
        $resAgenda->assertOk();
        $resAgenda->assertSee($letter->reference_number);
        $resAgenda->assertSee('Perjanjian Kerja Sama Integrasi Data');
    }
}
