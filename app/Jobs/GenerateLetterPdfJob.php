<?php

namespace App\Jobs;

use App\Models\Letter;
use App\Services\DocumentService;
use Illuminate\Contracts\Queue\ShouldQueue;
use Illuminate\Foundation\Queue\Queueable;

class GenerateLetterPdfJob implements ShouldQueue
{
    use Queueable;

    public int $tries = 3;
    public array $backoff = [5, 15];

    /**
     * Create a new job instance.
     */
    public function __construct(
        public int $letterId
    ) {}

    /**
     * Execute the job.
     */
    public function handle(DocumentService $documentService): void
    {
        $letter = Letter::find($this->letterId);

        if (! $letter) {
            return;
        }

        $documentService->generateLetterPdf($letter);
    }
}
