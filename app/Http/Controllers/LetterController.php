<?php

namespace App\Http\Controllers;

use App\Http\Requests\StoreLetterRequest;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use App\Services\LetterService;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\View\View;

class LetterController extends Controller
{
    public function __construct(
        protected LetterService $letterService
    ) {}

    /**
     * Display a listing of letters based on user permissions.
     */
    public function index(Request $request): View
    {
        $user = $request->user();
        $query = Letter::with(['template', 'user'])->latest();

        // Drafter sees letters they drafted
        if ($user->isDrafter() && ! $user->isAdmin()) {
            $query->where('user_id', $user->id);
        } elseif ($user->isReviewer() || $user->isApprover()) {
            // Reviewers and Approvers see letters assigned to them or approved
            $query->where(function ($q) use ($user) {
                $q->whereHas('workflows', function ($w) use ($user) {
                    $w->where('user_id', $user->id);
                })->orWhere('status', Letter::STATUS_APPROVED);
            });
        }

        $letters = $query->paginate(15);

        return view('letters.index', compact('letters'));
    }

    /**
     * Show the form for creating a new internal draft.
     */
    public function create(Request $request): View
    {
        $this->authorize('create', Letter::class);

        $templates = LetterTemplate::active()->get();
        $reviewers = User::active()->where('role', User::ROLE_REVIEWER)->where('id', '!=', $request->user()->id)->get();
        $approvers = User::active()->where('role', User::ROLE_APPROVER)->where('id', '!=', $request->user()->id)->get();

        return view('letters.create', compact('templates', 'reviewers', 'approvers'));
    }

    /**
     * Store a newly created letter draft.
     */
    public function store(StoreLetterRequest $request): RedirectResponse
    {
        $letter = $this->letterService->createDraft(
            $request->user(),
            $request->validated()
        );

        return redirect()
            ->route('letters.show', $letter)
            ->with('status', "Draf naskah dinas berhasil dibuat dengan nomor referensi {$letter->reference_number}.");
    }

    /**
     * Display the specified letter.
     */
    public function show(Letter $letter, Request $request): View
    {
        $this->authorize('view', $letter);

        $letter->load(['template', 'user', 'workflows.user', 'auditLogs.user']);

        return view('letters.show', compact('letter'));
    }

    /**
     * Download or stream the verified letter PDF document.
     */
    public function downloadPdf(Letter $letter, \App\Services\DocumentService $documentService): \Symfony\Component\HttpFoundation\Response
    {
        $this->authorize('view', $letter);

        if (! $letter->file_path) {
            return redirect()
                ->route('letters.show', $letter)
                ->with('error', 'Berkas PDF naskah dinas belum tersedia atau belum selesai digenerate.');
        }

        $disk = $documentService->getStorageDisk();

        if (in_array($disk, ['s3', 'r2'], true)) {
            return redirect()->away($documentService->getDownloadUrl($letter));
        }

        if (! \Illuminate\Support\Facades\Storage::disk($disk)->exists($letter->file_path)) {
            return redirect()
                ->route('letters.show', $letter)
                ->with('error', 'Berkas fisik PDF tidak ditemukan pada media penyimpanan.');
        }

        $filename = \Illuminate\Support\Str::slug(str_replace(['.', '/'], '-', $letter->reference_number ?? "letter-{$letter->id}")) . '.pdf';

        return \Illuminate\Support\Facades\Storage::disk($disk)->download($letter->file_path, $filename);
    }
}

