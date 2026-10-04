<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\BelongsTo;

class RecycledNumberPool extends Model
{
    use HasFactory;

    protected $fillable = [
        'template_code',
        'month',
        'year',
        'sequence_number',
        'released_from_letter_id',
        'is_claimed',
        'claimed_by_letter_id',
        'released_at',
        'claimed_at',
    ];

    protected function casts(): array
    {
        return [
            'month' => 'integer',
            'year' => 'integer',
            'sequence_number' => 'integer',
            'is_claimed' => 'boolean',
            'released_at' => 'datetime',
            'claimed_at' => 'datetime',
        ];
    }

    public function releasedFromLetter(): BelongsTo
    {
        return $this->belongsTo(Letter::class, 'released_from_letter_id');
    }

    public function claimedByLetter(): BelongsTo
    {
        return $this->belongsTo(Letter::class, 'claimed_by_letter_id');
    }

    public function scopeUnclaimed(Builder $query): Builder
    {
        return $query->where('is_claimed', false);
    }
}
