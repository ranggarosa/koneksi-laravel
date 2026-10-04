<?php

namespace App\Services;

use App\Models\Letter;
use App\Models\LetterCounter;
use App\Models\RecycledNumberPool;
use Carbon\Carbon;
use Carbon\CarbonInterface;
use Illuminate\Support\Facades\DB;

class NumberingService
{
    private const ROMAN_MONTHS = [
        1 => 'I', 2 => 'II', 3 => 'III', 4 => 'IV', 5 => 'V', 6 => 'VI',
        7 => 'VII', 8 => 'VIII', 9 => 'IX', 10 => 'X', 11 => 'XI', 12 => 'XII',
    ];

    /**
     * Convert an integer month (1-12) to Roman numeral.
     */
    public function toRoman(int $month): string
    {
        return self::ROMAN_MONTHS[$month] ?? 'I';
    }

    /**
     * Allocate an atomic reference sequence number for a letter.
     * Enforces Constitution Principle I: Atomic Sequence Numbering using PostgreSQL lockForUpdate.
     *
     * @return array{reference_number: string, sequence_number: int, month: int, month_roman: string, year: int, was_recycled: bool}
     */
    public function allocate(string $templateCode, CarbonInterface|string $date, ?int $letterId = null): array
    {
        $parsedDate = $date instanceof CarbonInterface ? $date : Carbon::parse($date);
        $month = (int) $parsedDate->format('n');
        $year = (int) $parsedDate->format('Y');
        $monthRoman = $this->toRoman($month);

        return DB::transaction(function () use ($templateCode, $month, $monthRoman, $year, $letterId) {
            // 1. Check if an unclaimed sequence number exists in the FIFO recycled pool
            $recycled = $this->claimRecycledNumber($templateCode, $month, $year, $letterId);

            if ($recycled) {
                $sequence = $recycled->sequence_number;
                $referenceNumber = sprintf('%04d.%s/%s/%d', $sequence, $templateCode, $monthRoman, $year);

                return [
                    'reference_number' => $referenceNumber,
                    'sequence_number' => $sequence,
                    'month' => $month,
                    'month_roman' => $monthRoman,
                    'year' => $year,
                    'was_recycled' => true,
                ];
            }

            // 2. Otherwise increment counter atomically
            $counter = LetterCounter::where('template_code', $templateCode)
                ->where('month', $month)
                ->where('year', $year)
                ->lockForUpdate()
                ->first();

            if (! $counter) {
                $counter = LetterCounter::create([
                    'template_code' => $templateCode,
                    'month' => $month,
                    'year' => $year,
                    'last_sequence' => 1,
                ]);
                $sequence = 1;
            } else {
                $counter->increment('last_sequence');
                $sequence = $counter->last_sequence;
            }

            $referenceNumber = sprintf('%04d.%s/%s/%d', $sequence, $templateCode, $monthRoman, $year);

            return [
                'reference_number' => $referenceNumber,
                'sequence_number' => $sequence,
                'month' => $month,
                'month_roman' => $monthRoman,
                'year' => $year,
                'was_recycled' => false,
            ];
        });
    }

    /**
     * Release a rejected or expired letter's number back into the recycled number pool.
     */
    public function releaseNumberToPool(Letter $letter, string $reason): ?RecycledNumberPool
    {
        if (! $letter->sequence_number || ! $letter->template) {
            return null;
        }

        $templateCode = $letter->template->code;
        $date = Carbon::parse($letter->letter_date);
        $month = (int) $date->format('n');
        $year = (int) $date->format('Y');

        return DB::transaction(function () use ($letter, $templateCode, $month, $year, $reason) {
            // Check if already pooled
            $existing = RecycledNumberPool::where('letter_id', $letter->id)->first();
            if ($existing) {
                return $existing;
            }

            return RecycledNumberPool::create([
                'template_code' => $templateCode,
                'month' => $month,
                'year' => $year,
                'sequence_number' => $letter->sequence_number,
                'letter_id' => $letter->id,
                'reason' => $reason,
                'is_claimed' => false,
            ]);
        });
    }

    /**
     * Claim an unclaimed sequence number from the FIFO recycled pool.
     */
    public function claimRecycledNumber(string $templateCode, int $month, int $year, ?int $letterId = null): ?RecycledNumberPool
    {
        $recycled = RecycledNumberPool::where('template_code', $templateCode)
            ->where('month', $month)
            ->where('year', $year)
            ->where('is_claimed', false)
            ->orderBy('sequence_number', 'asc')
            ->lockForUpdate()
            ->first();

        if ($recycled) {
            $recycled->update([
                'is_claimed' => true,
                'claimed_by_letter_id' => $letterId,
            ]);
        }

        return $recycled;
    }
}

