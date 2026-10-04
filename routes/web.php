<?php

use App\Http\Controllers\AgendaController;
use App\Http\Controllers\ApprovalController;
use App\Http\Controllers\AuthController;
use App\Http\Controllers\DashboardController;
use App\Http\Controllers\DevController;
use App\Http\Controllers\LetterController;
use App\Http\Controllers\ScanController;
use App\Http\Controllers\TakeNumberController;
use Illuminate\Support\Facades\Route;

// Public agenda route (no auth required)
Route::get('/agenda', [AgendaController::class, 'index'])->name('agenda.index');

// Authentication Routes
Route::middleware('guest')->group(function () {
    Route::get('/login', [AuthController::class, 'showLoginForm'])->name('login');
    Route::post('/login', [AuthController::class, 'login']);
});

Route::post('/logout', [AuthController::class, 'logout'])->middleware('auth')->name('logout');

// Local Development Quick Switch User (Constitution Principle II & US5)
if (app()->isLocal()) {
    Route::post('/dev/switch-user/{role}', [DevController::class, 'switchUser'])->name('dev.switch-user');
}

// Protected Application Routes
Route::middleware(['auth'])->group(function () {
    Route::get('/', function () {
        return redirect()->route('dashboard');
    });

    Route::get('/dashboard', [DashboardController::class, 'index'])->name('dashboard');

    // Correspondence Management
    Route::resource('letters', LetterController::class)->only(['index', 'create', 'store', 'show']);
    Route::get('/letters/{letter}/download', [LetterController::class, 'downloadPdf'])->name('letters.download');

    // Multi-tier Sequential Approval & Rejection
    Route::post('/letters/{letter}/approve', [ApprovalController::class, 'approve'])->name('letters.approve');
    Route::post('/letters/{letter}/reject', [ApprovalController::class, 'reject'])->name('letters.reject');

    // Wet Signature Scan Upload & Verification
    Route::get('/letters/{letter}/upload-scan', [ScanController::class, 'create'])->name('letters.scan.create');
    Route::post('/letters/{letter}/upload-scan', [ScanController::class, 'store'])->name('letters.scan.store');

    // Standalone External Number Reservation (Ambil Nomor)
    Route::get('/take-number', [TakeNumberController::class, 'create'])->name('take-number.create');
    Route::post('/take-number', [TakeNumberController::class, 'store'])->name('take-number.store');
});
