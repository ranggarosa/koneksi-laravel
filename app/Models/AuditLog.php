<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class AuditLog extends Model
{
    use HasFactory;

    // Audit logs are append-only; there is no updated_at column
    public const UPDATED_AT = null;

    protected $fillable = [
        'letter_id',
        'user_id',
        'actor_email',
        'action',
        'from_status',
        'to_status',
        'metadata',
    ];

    protected function casts(): array
    {
        return [
            'metadata' => 'array',
            'created_at' => 'datetime',
        ];
    }

    /**
     * Enforce Constitution Principle V: Audit logs are immutable and tamper-evident.
     */
    protected static function booted(): void
    {
        static::updating(function () {
            throw new DomainException('Audit logs are immutable and cannot be updated.');
        });

        static::deleting(function () {
            throw new DomainException('Audit logs are immutable and cannot be deleted.');
        });
    }

    public function letter(): BelongsTo
    {
        return $this->belongsTo(Letter::class, 'letter_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }
}
