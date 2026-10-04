<?php

namespace App\Http\Controllers;

use App\Http\Requests\TakeNumberRequest;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use App\Services\LetterService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class TakeNumberController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {}

    /**
     * Show the form for requesting an external number reservation.
     */
    public function create(Request $request): View
    {
        $this->authorize('create', Letter::class);

        $templates = LetterTemplate::active()->get();
        $approvers = User::active()
            ->where('role', User::ROLE_APPROVER)
            ->where('id', '!=', $request->user()->id)
            ->get();

        return view('take-number.create', compact('templates', 'approvers'));
    }

    /**
     * Store the external number reservation request.
     */
    public function store(TakeNumberRequest $request): RedirectResponse
    {
        $letter = $this->letterService->reserveExternalNumber(
            $request->user(),
            $request->validated()
        );

        return redirect()
            ->route('letters.show', $letter)
            ->with('status', "Nomor surat eksternal berhasil direservasi: {$letter->reference_number}. Menunggu persetujuan pejabat penandatangan.");
    }
}
