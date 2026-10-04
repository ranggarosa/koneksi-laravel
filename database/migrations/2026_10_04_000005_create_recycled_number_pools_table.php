<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::create('recycled_number_pools', function (Blueprint $table) {
            $table->id();
            $table->string('template_code', 50);
            $table->smallInteger('month');
            $table->smallInteger('year');
            $table->integer('sequence_number');
            $table->foreignId('released_from_letter_id')->nullable()->constrained('letters')->nullOnDelete();
            $table->boolean('is_claimed')->default(false);
            $table->foreignId('claimed_by_letter_id')->nullable()->constrained('letters')->nullOnDelete();
            $table->timestamp('released_at')->useCurrent();
            $table->timestamp('claimed_at')->nullable();
            $table->timestamps();

            $table->index(['template_code', 'month', 'year', 'is_claimed', 'sequence_number'], 'idx_recycled_lookup');
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('recycled_number_pools');
    }
};
