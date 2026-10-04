<?php

namespace App\Http\Controllers;

use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use Illuminate\Http\Request;
use Illuminate\View\View;

class DashboardController extends Controller
{
    /**
     * Display role-filtered metrics and active tasks on the dashboard.
     */
    public function index(Request $request): View
    {
        $user = $request->user();

        // 1. Pending reviews waiting for this user's approval
        $pendingReviews = Letter::whereHas('workflows', function ($w) use ($user) {
            $w->where('user_id', $user->id)->where('status', ApprovalWorkflow::STATUS_PENDING);
        })->with(['template', 'user'])->get();

        // 2. Letters drafted by current user
        $myDrafts = Letter::where('user_id', $user->id)
            ->latest()
            ->take(5)
            ->get();

        // 3. Overall KPI Metrics
        $metrics = [
            'pending_my_approval' => $pendingReviews->count(),
            'total_drafted' => Letter::where('user_id', $user->id)->count(),
            'approved_count' => Letter::approved()->count(),
            'pending_upload_count' => Letter::where('status', Letter::STATUS_PENDING_UPLOAD)->count(),
        ];

        // 4. Overdue or soon-to-expire upload reconciliations (Ambil Nomor)
        $urgentUploads = Letter::where('status', Letter::STATUS_PENDING_UPLOAD)
            ->whereNotNull('reconciliation_deadline')
            ->orderBy('reconciliation_deadline')
            ->take(5)
            ->get();

        return view('dashboard.index', compact('metrics', 'pendingReviews', 'myDrafts', 'urgentUploads'));
    }
}
