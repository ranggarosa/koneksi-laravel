<?php

namespace App\Services;

use App\Models\AuditLog;
use App\Models\Letter;
use App\Models\User;
use Illuminate\Support\Facades\Auth;

class AuditService
{
    /**
     * Record an immutable audit log event.
     *
     * @param  Letter|int|null  $letter
     * @param  array<string, mixed>  $metadata
     */
    public function log(
        Letter|int|null $letter,
        string $action,
        ?string $fromStatus = null,
        ?string $toStatus = null,
        array $metadata = [],
        ?User $actor = null
    ): AuditLog {
        $letterId = $letter instanceof Letter ? $letter->id : $letter;
        $user = $actor ?? Auth::user();

        return AuditLog::create([
            'letter_id' => $letterId,
            'user_id' => $user?->id,
            'actor_email' => $user?->email ?? 'system@koneksi.local',
            'action' => $action,
            'from_status' => $fromStatus,
            'to_status' => $toStatus,
            'metadata' => empty($metadata) ? null : $metadata,
        ]);
    }
}
