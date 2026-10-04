<?php

namespace App\Http\Controllers;

use App\Models\Letter;
use App\Models\LetterTemplate;
use Illuminate\Http\Request;
use Illuminate\View\View;

class AgendaController extends Controller
{
    /**
     * Display the public letter agenda book.
     */
    public function index(Request $request): View
    {
        $query = Letter::query()
            ->approved()
            ->with(['template', 'user'])
            ->orderBy('letter_date', 'desc')
            ->orderBy('sequence_number', 'desc');

        // Search query
        if ($search = $request->input('q')) {
            $query->where(function ($q) use ($search) {
                $q->where('reference_number', 'like', "%{$search}%")
                    ->orWhere('subject', 'like', "%{$search}%")
                    ->orWhere('recipient', 'like', "%{$search}%");
            });
        }

        // Year filter
        if ($year = $request->input('year')) {
            $query->where('year', $year);
        }

        // Template filter
        if ($templateId = $request->input('template_id')) {
            $query->where('template_id', $templateId);
        }

        $letters = $query->paginate(20)->withQueryString();
        $templates = LetterTemplate::active()->get();
        $years = Letter::approved()->distinct()->pluck('year')->filter()->sortDesc();

        return view('agenda.index', compact('letters', 'templates', 'years'));
    }
}
