<?php

namespace App\Http\Controllers;

use App\Http\Requests\UploadScanRequest;
use App\Models\Letter;
use App\Services\DocumentService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class ScanController extends Controller
{
    public function __construct(
        protected DocumentService $documentService
    ) {}

    /**
     * Show the form for uploading a wet-signed physical scan.
     */
    public function create(Letter $letter, Request $request): View
    {
        $this->authorize('uploadScan', $letter);

        return view('letters.upload-scan', compact('letter'));
    }

    /**
     * Store and verify the uploaded PDF scan.
     */
    public function store(Letter $letter, UploadScanRequest $request): RedirectResponse
    {
        $this->documentService->storeUploadedScan($letter, $request->file('scan_file'));

        return redirect()
            ->route('letters.show', $letter)
            ->with('status', 'Berkas hasil pindai fisik naskah dinas berhasil diunggah. Status dokumen telah resmi Disahkan.');
    }
}
