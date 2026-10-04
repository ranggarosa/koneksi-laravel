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
        Schema::create('letters', function (Blueprint $table) {
            $table->id();
            $table->foreignId('template_id')->constrained('letter_templates')->onDelete('restrict');
            $table->foreignId('user_id')->constrained('users'); // Drafter / owner
            $table->string('type', 20)->default('internal'); // internal, external
            $table->string('reference_number', 100)->nullable()->index();
            $table->integer('sequence_number')->nullable();
            $table->string('month_roman', 10)->nullable();
            $table->smallInteger('year')->nullable();
            $table->date('letter_date');
            $table->string('subject');
            $table->string('recipient');
            $table->jsonb('content_data')->nullable();
            $table->string('signature_type', 20)->nullable(); // digital, wet
            $table->string('status', 50)->default('draft')->index();
            $table->string('file_path')->nullable();
            $table->timestamp('reconciliation_deadline')->nullable();
            $table->timestamps();
            $table->softDeletes();

            $table->index(['type', 'status']);
            $table->index(['created_at']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('letters');
    }
};
