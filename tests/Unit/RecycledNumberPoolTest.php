<?php

namespace Tests\Unit;

use App\Models\Letter;
use App\Models\LetterCounter;
use App\Models\LetterTemplate;
use App\Models\RecycledNumberPool;
use App\Models\User;
use App\Services\NumberingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class RecycledNumberPoolTest extends TestCase
{
    use RefreshDatabase;

    private NumberingService $service;
    private LetterTemplate $template;
    private User $drafter;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new NumberingService();

        $this->drafter = User::factory()->create(['role' => User::ROLE_DRAFTER]);

        $this->template = LetterTemplate::create([
            'code' => 'SKK',
            'name' => 'Surat Keterangan Kerja',
            'description' => 'Test template',
            'content_schema' => [],
            'default_tiers' => ['approver'],
            'is_active' => true,
        ]);
    }

    public function test_released_number_is_stored_in_recycled_pool(): void
    {
        $date = Carbon::create(2026, 10, 4);

        $letter = Letter::create([
            'template_id' => $this->template->id,
            'user_id' => $this->drafter->id,
            'type' => 'internal',
            'reference_number' => '0001.SKK/X/2026',
            'sequence_number' => 1,
            'month_roman' => 'X',
            'year' => 2026,
            'letter_date' => $date,
            'subject' => 'Surat Keterangan',
            'recipient' => 'Jane Doe',
            'content_data' => [],
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'status' => Letter::STATUS_IN_REVIEW,
        ]);

        $poolEntry = $this->service->releaseNumberToPool($letter, 'Rejected by reviewer');

        $this->assertNotNull($poolEntry);
        $this->assertDatabaseHas('recycled_number_pools', [
            'template_code' => 'SKK',
            'month' => 10,
            'year' => 2026,
            'sequence_number' => 1,
            'letter_id' => $letter->id,
            'is_claimed' => false,
            'reason' => 'Rejected by reviewer',
        ]);
    }

    public function test_subsequent_allocation_reuses_recycled_number_fifo(): void
    {
        $date = Carbon::create(2026, 10, 4);

        // 1. Allocate #1 and #2
        $num1 = $this->service->allocate('SKK', $date);
        $num2 = $this->service->allocate('SKK', $date);

        $this->assertEquals(1, $num1['sequence_number']);
        $this->assertEquals(2, $num2['sequence_number']);

        // 2. Mock a rejected letter with sequence #1 and release it
        $letter1 = Letter::create([
            'template_id' => $this->template->id,
            'user_id' => $this->drafter->id,
            'type' => 'internal',
            'reference_number' => $num1['reference_number'],
            'sequence_number' => 1,
            'month_roman' => 'X',
            'year' => 2026,
            'letter_date' => $date,
            'subject' => 'Surat 1',
            'recipient' => 'Jane Doe',
            'signature_type' => Letter::SIGNATURE_DIGITAL,
            'status' => Letter::STATUS_REJECTED,
        ]);

        $this->service->releaseNumberToPool($letter1, 'Naskah dibatalkan');

        // 3. Allocate next number - should reclaim sequence #1!
        $reused = $this->service->allocate('SKK', $date);

        $this->assertTrue($reused['was_recycled']);
        $this->assertEquals(1, $reused['sequence_number']);
        $this->assertEquals('0001.SKK/X/2026', $reused['reference_number']);

        // 4. Allocate again - pool is empty, counter continues from #3
        $num3 = $this->service->allocate('SKK', $date);

        $this->assertFalse($num3['was_recycled']);
        $this->assertEquals(3, $num3['sequence_number']);
        $this->assertEquals('0003.SKK/X/2026', $num3['reference_number']);
    }
}
