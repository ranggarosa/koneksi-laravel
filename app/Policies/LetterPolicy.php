<?php

namespace App\Policies;

use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\User;

class LetterPolicy
{
    /**
     * Determine whether the user can view any letters.
     */
    public function viewAny(User $user): bool
    {
        return $user->is_active;
    }

    /**
     * Determine whether the user can view the specific letter.
     */
    public function view(User $user, Letter $letter): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($user->isAdmin() || $letter->status === Letter::STATUS_APPROVED) {
            return true;
        }

        if ($letter->user_id === $user->id) {
            return true;
        }

        return $letter->workflows()->where('user_id', $user->id)->exists();
    }

    /**
     * Determine whether the user can create letters.
     */
    public function create(User $user): bool
    {
        return $user->is_active && ($user->isDrafter() || $user->isAdmin());
    }

    /**
     * Determine whether the user can update the draft letter.
     */
    public function update(User $user, Letter $letter): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if ($letter->status !== Letter::STATUS_DRAFT) {
            return false;
        }

        return $user->isAdmin() || $letter->user_id === $user->id;
    }

    /**
     * Determine whether the user can delete the draft letter.
     */
    public function delete(User $user, Letter $letter): bool
    {
        if (! $user->is_active) {
            return false;
        }

        // Constitution Principle III: Hard deletes on official or numbered letters are strictly prohibited
        if ($letter->status !== Letter::STATUS_DRAFT) {
            return false;
        }

        return $user->isAdmin() || $letter->user_id === $user->id;
    }

    /**
     * Determine whether the user can review or sign the letter at the current step.
     * Enforces Constitution Principle IV: Strict Separation of Duties.
     */
    public function review(User $user, Letter $letter): bool
    {
        if (! $user->is_active) {
            return false;
        }

        // Strict Separation of Duties: Drafter cannot approve/review their own letter!
        if ($letter->user_id === $user->id) {
            return false;
        }

        // Check if there is an active pending step for this user
        return $letter->workflows()
            ->where('user_id', $user->id)
            ->where('status', ApprovalWorkflow::STATUS_PENDING)
            ->exists();
    }

    /**
     * Determine whether the user can upload a wet signature physical scan.
     */
    public function uploadScan(User $user, Letter $letter): bool
    {
        if (! $user->is_active) {
            return false;
        }

        if (! in_array($letter->status, [Letter::STATUS_AWAITING_WET_SIGNATURE, Letter::STATUS_PENDING_UPLOAD], true)) {
            return false;
        }

        return $user->isAdmin() || $letter->user_id === $user->id;
    }
}
