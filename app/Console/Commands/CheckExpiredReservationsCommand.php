<?php

namespace App\Console\Commands;

use App\Models\Letter;
use App\Services\AuditService;
use App\Services\NumberingService;
use Illuminate\Console\Command;

class CheckExpiredReservationsCommand extends Command
{
    /**
     * The name and signature of the console command.
     *
     * @var string
     */
    protected $signature = 'letters:check-expired';

    /**
     * The console command description.
     *
     * @var string
     */
    protected $description = 'Check for overdue pending upload reservations and release reference numbers to recycled pool';

    /**
     * Execute the console command.
     */
    public function handle(NumberingService $numberingService, AuditService $auditService): int
    {
        $expiredLetters = Letter::where('status', Letter::STATUS_PENDING_UPLOAD)
            ->whereNotNull('reconciliation_deadline')
            ->where('reconciliation_deadline', '<', now())
            ->get();

        $count = $expiredLetters->count();

        foreach ($expiredLetters as $letter) {
            $fromStatus = $letter->status;
            $letter->update(['status' => Letter::STATUS_EXPIRED]);

            // Release number back to recycled number pool
            $numberingService->releaseNumberToPool(
                $letter,
                'Reservasi nomor eksternal kedaluwarsa (melebihi batas rekonsiliasi 7 hari)'
            );

            $auditService->log(
                letter: $letter,
                action: 'expired_reservation',
                fromStatus: $fromStatus,
                toStatus: Letter::STATUS_EXPIRED,
                metadata: [
                    'reference_number' => $letter->reference_number,
                    'reconciliation_deadline' => $letter->reconciliation_deadline?->toIso8601String(),
                ]
            );
        }

        $this->info("Processed {$count} expired reservation(s).");

        return self::SUCCESS;
    }
}
