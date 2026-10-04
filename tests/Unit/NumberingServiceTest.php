<?php

namespace Tests\Unit;

use App\Models\LetterCounter;
use App\Models\RecycledNumberPool;
use App\Services\NumberingService;
use Carbon\Carbon;
use Illuminate\Foundation\Testing\RefreshDatabase;
use Tests\TestCase;

class NumberingServiceTest extends TestCase
{
    use RefreshDatabase;

    private NumberingService $service;

    protected function setUp(): void
    {
        parent::setUp();
        $this->service = new NumberingService();
    }

    public function test_to_roman_converts_months_accurately(): void
    {
        $expected = [
            1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
            7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
        ];

        foreach ($expected as $month => $roman) {
            $this->assertEquals($roman, $this->service->toRoman($month));
        }
    }

    public function test_allocates_sequential_number_on_first_request(): void
    {
        $date = Carbon::create(2026, 10, 4);
        $result = $this->service->allocate('SKK', $date);

        $this->assertEquals(1, $result['sequence_number']);
        $this->assertEquals('X', $result['month_roman']);
        $this->assertEquals(2026, $result['year']);
        $this->assertEquals('0001.SKK/X/2026', $result['reference_number']);

        $this->assertDatabaseHas('letter_counters', [
            'template_code' => 'SKK',
            'month' => 10,
            'year' => 2026,
            'last_sequence' => 1,
        ]);
    }

    public function test_increments_sequence_for_subsequent_letters_in_same_month(): void
    {
        $date = Carbon::create(2026, 10, 4);

        $first = $this->service->allocate('SKK', $date);
        $second = $this->service->allocate('SKK', $date);

        $this->assertEquals(1, $first['sequence_number']);
        $this->assertEquals('0001.SKK/X/2026', $first['reference_number']);

        $this->assertEquals(2, $second['sequence_number']);
        $this->assertEquals('0002.SKK/X/2026', $second['reference_number']);
    }

    public function test_partitions_sequence_by_template_code(): void
    {
        $date = Carbon::create(2026, 10, 4);

        $skk = $this->service->allocate('SKK', $date);
        $sp1 = $this->service->allocate('SP1', $date);

        $this->assertEquals(1, $skk['sequence_number']);
        $this->assertEquals('0001.SKK/X/2026', $skk['reference_number']);

        $this->assertEquals(1, $sp1['sequence_number']);
        $this->assertEquals('0001.SP1/X/2026', $sp1['reference_number']);
    }

    public function test_partitions_sequence_by_month_and_year(): void
    {
        $oct2026 = Carbon::create(2026, 10, 4);
        $nov2026 = Carbon::create(2026, 11, 1);
        $oct2027 = Carbon::create(2027, 10, 4);

        $res1 = $this->service->allocate('SKK', $oct2026);
        $res2 = $this->service->allocate('SKK', $nov2026);
        $res3 = $this->service->allocate('SKK', $oct2027);

        $this->assertEquals('0001.SKK/X/2026', $res1['reference_number']);
        $this->assertEquals('0001.SKK/XI/2026', $res2['reference_number']);
        $this->assertEquals('0001.SKK/X/2027', $res3['reference_number']);
    }
}
