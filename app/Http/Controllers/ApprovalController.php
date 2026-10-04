<?php

namespace App\Http\Controllers;

use App\Http\Requests\ApproveLetterRequest;
use App\Http\Requests\RejectLetterRequest;
use App\Models\Letter;
use App\Services\LetterService;
use Illuminate\Http\RedirectResponse;

class ApprovalController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {}

    /**
     * Approve the letter at the current workflow step.
     */
    public function approve(Letter $letter, ApproveLetterRequest $request): RedirectResponse
    {
        $this->letterService->approveStep(
            $letter,
            $request->user(),
            $request->input('notes')
        );

        return redirect()
            ->route('letters.show', $letter)
            ->with('status', 'Persetujuan naskah dinas berhasil dicatat.');
    }

    /**
     * Terminally reject the letter at the current workflow step.
     */
    public function reject(Letter $letter, RejectLetterRequest $request): RedirectResponse
    {
        $this->letterService->rejectStep(
            $letter,
            $request->user(),
            $request->input('notes')
        );

        return redirect()
            ->route('letters.show', $letter)
            ->with('error', 'Naskah dinas telah ditolak. Nomor surat telah dikembalikan ke pool daur ulang.');
    }
}
