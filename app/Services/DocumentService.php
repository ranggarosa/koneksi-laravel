<?php

namespace App\Services;

use App\Models\Letter;
use Barryvdh\DomPDF\Facade\Pdf;
use Illuminate\Http\UploadedFile;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Str;

class DocumentService
{
    public function __construct(
        protected AuditService $auditService
    ) {}

    /**
     * Get the active storage disk for documents (ephemeral protection).
     */
    public function getStorageDisk(): string
    {
        return config('filesystems.default', 'local');
    }

    /**
     * Compile and store the official letter PDF using Dompdf.
     */
    public function generateLetterPdf(Letter $letter): string
    {
        $disk = $this->getStorageDisk();
        $letter->load(['template', 'user', 'workflows.user']);

        $filename = Str::slug(str_replace(['.', '/'], '-', $letter->reference_number ?? "letter-{$letter->id}")) . '.pdf';
        $path = "letters/{$letter->year}/" . sprintf('%02d', $letter->letter_date?->month ?? 1) . "/{$filename}";

        // Render PDF binary
        if (class_exists(Pdf::class)) {
            $pdf = Pdf::loadView('pdf.letter-template', ['letter' => $letter])
                ->setPaper('a4', 'portrait');
            $pdfContent = $pdf->output();
        } else {
            // Fallback rendering
            $pdfContent = view('pdf.letter-template', ['letter' => $letter])->render();
        }

        Storage::disk($disk)->put($path, $pdfContent);

        $letter->update(['file_path' => $path]);

        $this->auditService->log(
            letter: $letter,
            action: 'generated_pdf',
            fromStatus: $letter->status,
            toStatus: $letter->status,
            metadata: [
                'file_path' => $path,
                'disk' => $disk,
            ]
        );

        return $path;
    }

    /**
     * Store an uploaded signed physical scan (wet signature).
     */
    public function storeUploadedScan(Letter $letter, UploadedFile $file): string
    {
        $disk = $this->getStorageDisk();
        $filename = 'scan-' . Str::slug(str_replace(['.', '/'], '-', $letter->reference_number ?? "letter-{$letter->id}")) . '-' . time() . '.pdf';
        $path = "scans/{$letter->year}/" . sprintf('%02d', $letter->letter_date?->month ?? 1) . "/{$filename}";

        Storage::disk($disk)->putFileAs(dirname($path), $file, basename($path));

        $fromStatus = $letter->status;
        $letter->update([
            'file_path' => $path,
            'status' => Letter::STATUS_APPROVED,
        ]);

        $this->auditService->log(
            letter: $letter,
            action: 'uploaded_scan',
            fromStatus: $fromStatus,
            toStatus: Letter::STATUS_APPROVED,
            metadata: [
                'file_path' => $path,
                'disk' => $disk,
                'original_filename' => $file->getClientOriginalName(),
                'file_size' => $file->getSize(),
            ]
        );

        return $path;
    }

    /**
     * Retrieve the secure download URL or stream for the letter's PDF.
     */
    public function getDownloadUrl(Letter $letter): string
    {
        if (! $letter->file_path) {
            throw new \RuntimeException('Naskah dinas belum memiliki berkas dokumen PDF yang diterbitkan.');
        }

        $disk = $this->getStorageDisk();

        // For S3 / Cloudflare R2, generate presigned URL valid for 15 minutes
        if (in_array($disk, ['s3', 'r2'], true)) {
            return Storage::disk($disk)->temporaryUrl($letter->file_path, now()->addMinutes(15));
        }

        // For local development, return local url
        return Storage::disk($disk)->url($letter->file_path);
    }
}
