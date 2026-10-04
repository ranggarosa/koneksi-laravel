<?php

namespace App\Services;

use App\Models\ApprovalWorkflow;
use App\Models\Letter;
use App\Models\LetterTemplate;
use App\Models\User;
use Carbon\Carbon;
use Illuminate\Support\Facades\DB;

class LetterService
{
    public function __construct(
        protected NumberingService $numberingService,
        protected AuditService $auditService
    ) {}

    /**
     * Create an internal letter draft, allocate an atomic reference number,
     * setup approval workflow tiers, and record an immutable audit log.
     *
     * @param  array<string, mixed>  $data
     */
    public function createDraft(User $drafter, array $data): Letter
    {
        return DB::transaction(function () use ($drafter, $data) {
            $template = LetterTemplate::findOrFail($data['template_id']);

            // 1. Allocate unique atomic sequence number
            $numberInfo = $this->numberingService->allocate(
                $template->code,
                $data['letter_date']
            );

            // 2. Persist letter record
            $letter = Letter::create([
                'template_id' => $template->id,
                'user_id' => $drafter->id,
                'type' => 'internal',
                'reference_number' => $numberInfo['reference_number'],
                'sequence_number' => $numberInfo['sequence_number'],
                'month_roman' => $numberInfo['month_roman'],
                'year' => $numberInfo['year'],
                'letter_date' => $data['letter_date'],
                'subject' => $data['subject'],
                'recipient' => $data['recipient'],
                'content_data' => $data['content_data'] ?? [],
                'signature_type' => $data['signature_type'],
                'status' => Letter::STATUS_IN_REVIEW,
            ]);

            // 3. Create sequential approval tiers
            $reviewers = $data['reviewers'] ?? [];
            foreach ($reviewers as $index => $reviewer) {
                ApprovalWorkflow::create([
                    'letter_id' => $letter->id,
                    'user_id' => $reviewer['user_id'],
                    'step_order' => $index + 1,
                    'role_type' => $reviewer['role_type'],
                    'status' => $index === 0
                        ? ApprovalWorkflow::STATUS_PENDING
                        : ApprovalWorkflow::STATUS_WAITING,
                ]);
            }

            // 4. Record audit log
            $this->auditService->log(
                letter: $letter,
                action: 'created_draft',
                fromStatus: null,
                toStatus: Letter::STATUS_IN_REVIEW,
                metadata: [
                    'reference_number' => $letter->reference_number,
                    'template_code' => $template->code,
                    'signature_type' => $letter->signature_type,
                    'reviewers_count' => count($reviewers),
                    'was_recycled' => $numberInfo['was_recycled'],
                ],
                actor: $drafter
            );

            return $letter;
        });
    }

    /**
     * Approve the current sequential step for a letter.
     */
    public function approveStep(Letter $letter, User $reviewer, ?string $notes = null): Letter
    {
        return DB::transaction(function () use ($letter, $reviewer, $notes) {
            /** @var ApprovalWorkflow $step */
            $step = $letter->workflows()
                ->where('user_id', $reviewer->id)
                ->where('status', ApprovalWorkflow::STATUS_PENDING)
                ->firstOrFail();

            $step->update([
                'status' => ApprovalWorkflow::STATUS_APPROVED,
                'notes' => $notes,
            ]);

            // Check if there is a next sequential tier
            $nextStep = $letter->workflows()
                ->where('step_order', $step->step_order + 1)
                ->first();

            if ($nextStep) {
                // Advance next step to pending
                $nextStep->update(['status' => ApprovalWorkflow::STATUS_PENDING]);

                $this->auditService->log(
                    letter: $letter,
                    action: 'approved_tier',
                    fromStatus: $letter->status,
                    toStatus: $letter->status,
                    metadata: [
                        'step_order' => $step->step_order,
                        'role_type' => $step->role_type,
                        'notes' => $notes,
                        'next_step_order' => $nextStep->step_order,
                    ],
                    actor: $reviewer
                );
            } else {
                // Final tier reached
                $fromStatus = $letter->status;

                if ($letter->type === 'external') {
                    $deadline = Carbon::now()->addDays(7);
                    $letter->update([
                        'status' => Letter::STATUS_PENDING_UPLOAD,
                        'reconciliation_deadline' => $deadline,
                    ]);

                    $this->auditService->log(
                        letter: $letter,
                        action: 'approved_external_reservation',
                        fromStatus: $fromStatus,
                        toStatus: Letter::STATUS_PENDING_UPLOAD,
                        metadata: [
                            'notes' => $notes,
                            'reconciliation_deadline' => $deadline->toIso8601String(),
                            'reference_number' => $letter->reference_number,
                        ],
                        actor: $reviewer
                    );
                } elseif ($letter->signature_type === Letter::SIGNATURE_DIGITAL) {
                    $letter->update(['status' => Letter::STATUS_APPROVED]);

                    $this->auditService->log(
                        letter: $letter,
                        action: 'finalized_digital',
                        fromStatus: $fromStatus,
                        toStatus: Letter::STATUS_APPROVED,
                        metadata: [
                            'notes' => $notes,
                            'reference_number' => $letter->reference_number,
                        ],
                        actor: $reviewer
                    );

                    \App\Jobs\GenerateLetterPdfJob::dispatch($letter->id);
                } else {
                    $letter->update(['status' => Letter::STATUS_AWAITING_WET_SIGNATURE]);

                    $this->auditService->log(
                        letter: $letter,
                        action: 'approved_awaiting_wet_signature',
                        fromStatus: $fromStatus,
                        toStatus: Letter::STATUS_AWAITING_WET_SIGNATURE,
                        metadata: [
                            'notes' => $notes,
                            'reference_number' => $letter->reference_number,
                        ],
                        actor: $reviewer
                    );
                }
            }

            return $letter;
        });
    }

    /**
     * Reserve an external letter reference number with 1-tier Approver sign-off.
     *
     * @param  array<string, mixed>  $data
     */
    public function reserveExternalNumber(User $drafter, array $data): Letter
    {
        return DB::transaction(function () use ($drafter, $data) {
            $template = LetterTemplate::findOrFail($data['template_id']);

            // 1. Allocate atomic reference sequence number
            $numberInfo = $this->numberingService->allocate(
                $template->code,
                $data['letter_date']
            );

            // 2. Persist external letter
            $letter = Letter::create([
                'template_id' => $template->id,
                'user_id' => $drafter->id,
                'type' => 'external',
                'reference_number' => $numberInfo['reference_number'],
                'sequence_number' => $numberInfo['sequence_number'],
                'month_roman' => $numberInfo['month_roman'],
                'year' => $numberInfo['year'],
                'letter_date' => $data['letter_date'],
                'subject' => $data['subject'],
                'recipient' => $data['recipient'],
                'content_data' => [],
                'signature_type' => Letter::SIGNATURE_WET,
                'status' => Letter::STATUS_IN_REVIEW,
            ]);

            // 3. Create 1-tier Approver workflow
            ApprovalWorkflow::create([
                'letter_id' => $letter->id,
                'user_id' => $data['approver_id'],
                'step_order' => 1,
                'role_type' => 'approver',
                'status' => ApprovalWorkflow::STATUS_PENDING,
            ]);

            // 4. Record audit log
            $this->auditService->log(
                letter: $letter,
                action: 'reserved_external',
                fromStatus: null,
                toStatus: Letter::STATUS_IN_REVIEW,
                metadata: [
                    'reference_number' => $letter->reference_number,
                    'template_code' => $template->code,
                    'approver_id' => $data['approver_id'],
                    'was_recycled' => $numberInfo['was_recycled'],
                ],
                actor: $drafter
            );

            return $letter;
        });
    }

    /**
     * Terminally reject the letter, freeze remaining steps, and release number to recycled pool.
     */
    public function rejectStep(Letter $letter, User $reviewer, string $notes): Letter
    {
        return DB::transaction(function () use ($letter, $reviewer, $notes) {
            /** @var ApprovalWorkflow $step */
            $step = $letter->workflows()
                ->where('user_id', $reviewer->id)
                ->where('status', ApprovalWorkflow::STATUS_PENDING)
                ->firstOrFail();

            $step->update([
                'status' => ApprovalWorkflow::STATUS_REJECTED,
                'notes' => $notes,
            ]);

            // Cancel any remaining waiting steps
            $letter->workflows()
                ->where('status', ApprovalWorkflow::STATUS_WAITING)
                ->update(['status' => ApprovalWorkflow::STATUS_REJECTED]);

            $fromStatus = $letter->status;
            $letter->update(['status' => Letter::STATUS_REJECTED]);

            // Release reference sequence number into recycled pool
            $this->numberingService->releaseNumberToPool($letter, "Ditolak oleh {$reviewer->name}: {$notes}");

            $this->auditService->log(
                letter: $letter,
                action: 'rejected_letter',
                fromStatus: $fromStatus,
                toStatus: Letter::STATUS_REJECTED,
                metadata: [
                    'step_order' => $step->step_order,
                    'role_type' => $step->role_type,
                    'notes' => $notes,
                    'reference_number' => $letter->reference_number,
                ],
                actor: $reviewer
            );

            return $letter;
        });
    }
}

