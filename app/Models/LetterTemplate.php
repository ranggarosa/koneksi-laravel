<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Builder;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Relations\HasMany;

class LetterTemplate extends Model
{
    use HasFactory;

    protected $fillable = [
        'code',
        'name',
        'description',
        'is_external',
        'default_tiers',
        'content_schema',
        'is_active',
    ];

    protected function casts(): array
    {
        return [
            'is_external' => 'boolean',
            'is_active' => 'boolean',
            'default_tiers' => 'array',
            'content_schema' => 'array',
        ];
    }

    public function letters(): HasMany
    {
        return $this->hasMany(Letter::class, 'template_id');
    }

    public function counters(): HasMany
    {
        return $this->hasMany(LetterCounter::class, 'template_code', 'code');
    }

    public function scopeActive(Builder $query): Builder
    {
        return $query->where('is_active', true);
    }

    public function scopeInternal(Builder $query): Builder
    {
        return $query->where('is_external', false);
    }

    public function scopeExternal(Builder $query): Builder
    {
        return $query->where('is_external', true);
    }
}
