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
        Schema::create('letter_counters', function (Blueprint $table) {
            $table->id();
            $table->string('template_code', 50);
            $table->smallInteger('month'); // 1-12
            $table->smallInteger('year'); // e.g. 2026
            $table->integer('current_sequence')->default(0);
            $table->timestamps();

            $table->unique(['template_code', 'month', 'year']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letter_counters');
    }
};
