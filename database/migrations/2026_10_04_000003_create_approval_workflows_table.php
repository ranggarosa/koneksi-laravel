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
        Schema::create('approval_workflows', function (Blueprint $table) {
            $table->id();
            $table->foreignId('letter_id')->constrained('letters')->onDelete('cascade');
            $table->smallInteger('step_order')->default(1);
            $table->foreignId('user_id')->constrained('users'); // Assigned reviewer or approver
            $table->string('role_type', 20)->default('reviewer'); // reviewer, approver
            $table->string('status', 20)->default('pending'); // pending, approved, rejected
            $table->timestamp('action_date')->nullable();
            $table->text('notes')->nullable();
            $table->timestamps();

            $table->unique(['letter_id', 'step_order']);
            $table->index(['user_id', 'status']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::dropIfExists('approval_workflows');
    }
};
