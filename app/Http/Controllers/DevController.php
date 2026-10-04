<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\RedirectResponse;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Auth;

class DevController extends Controller
{
    /**
     * Instantly switch authenticated session to another seeded role for testing.
     * Enforces Constitution Principle II: Guarded strictly by app()->isLocal().
     */
    public function switchUser(string $role, Request $request): RedirectResponse
    {
        abort_unless(app()->isLocal(), 404);

        $targetEmail = match ($role) {
            'admin' => 'admin@koneksi.local',
            'drafter' => 'drafter@koneksi.local',
            'reviewer' => 'reviewer@koneksi.local',
            'approver' => 'approver@koneksi.local',
            default => null,
        };

        if ($targetEmail) {
            $user = User::where('email', $targetEmail)->first();
        } else {
            $user = User::where('role', $role)->where('is_active', true)->first();
        }

        if (! $user) {
            return back()->with('error', "Pengguna untuk peran '{$role}' tidak ditemukan.");
        }

        Auth::login($user);
        $request->session()->regenerate();

        return back()->with('status', "Beralih peran secara instan ke: {$user->name} [{$role}]");
    }
}
