<?php

namespace App\Models;

use DomainException;
use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;
use Illuminate\Database\Eloquent\Relations\HasMany;
use Illuminate\Database\Eloquent\SoftDeletes;

class Letter extends Model
{
    use HasFactory, SoftDeletes;

    // Status Constants
    public const STATUS_DRAFT = 'draft';
    public const STATUS_IN_REVIEW = 'in_review';
    public const STATUS_AWAITING_WET_SIGNATURE = 'awaiting_wet_signature';
    public const STATUS_PENDING_UPLOAD = 'pending_upload';
    public const STATUS_APPROVED = 'approved';
    public const STATUS_REJECTED = 'rejected';
    public const STATUS_CANCELLED = 'cancelled';
    public const STATUS_EXPIRED = 'expired';
    public const STATUS_VOIDED = 'voided';

    // Signature Type Constants
    public const SIGNATURE_DIGITAL = 'digital';
    public const SIGNATURE_WET = 'wet';

    protected $fillable = [
        'template_id',
        'user_id',
        'type',
        'reference_number',
        'sequence_number',
        'month_roman',
        'year',
        'letter_date',
        'subject',
        'recipient',
        'content_data',
        'signature_type',
        'status',
        'file_path',
        'reconciliation_deadline',
    ];

    protected function casts(): array
    {
        return [
            'content_data' => 'array',
            'letter_date' => 'date',
            'reconciliation_deadline' => 'datetime',
            'sequence_number' => 'integer',
            'year' => 'integer',
        ];
    }

    /**
     * Boot the model.
     * Enforces Constitution Principle III: Hard deletes on official or numbered letters are strictly prohibited.
     */
    protected static function booted(): void
    {
        static::deleting(function (Letter $letter) {
            if ($letter->isForceDeleting() && $letter->status !== self::STATUS_DRAFT) {
                throw new DomainException('Official letters and issued reference numbers cannot be permanently deleted from the database. Use void or cancel status transitions.');
            }
        });
    }

    public function template(): BelongsTo
    {
        return $this->belongsTo(LetterTemplate::class, 'template_id');
    }

    public function user(): BelongsTo
    {
        return $this->belongsTo(User::class, 'user_id');
    }

    public function workflows(): HasMany
    {
        return $this->hasMany(ApprovalWorkflow::class)->orderBy('step_order');
    }

    public function auditLogs(): HasMany
    {
        return $this->hasMany(AuditLog::class)->orderBy('created_at');
    }

    public function scopeApproved(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_APPROVED);
    }

    public function scopeInReview(Builder $query): Builder
    {
        return $query->where('status', self::STATUS_IN_REVIEW);
    }

    public function isDraft(): bool
    {
        return $this->status === self::STATUS_DRAFT;
    }

    public function isInReview(): bool
    {
        return $this->status === self::STATUS_IN_REVIEW;
    }

    public function isApproved(): bool
    {
        return $this->status === self::STATUS_APPROVED;
    }

    public function isRejected(): bool
    {
        return $this->status === self::STATUS_REJECTED;
    }

    public function isAwaitingWetSignature(): bool
    {
        return $this->status === self::STATUS_AWAITING_WET_SIGNATURE;
    }

    public function isPendingUpload(): bool
    {
        return $this->status === self::STATUS_PENDING_UPLOAD;
    }

    public function isExpired(): bool
    {
        return $this->status === self::STATUS_EXPIRED;
    }

    public function isVoided(): bool
    {
        return $this->status === self::STATUS_VOIDED;
    }
}
