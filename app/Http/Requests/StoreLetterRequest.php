<?php

namespace App\Http\Requests;

use App\Models\Letter;
use App\Models\User;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class StoreLetterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        return $this->user()?->can('create', Letter::class) ?? false;
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'template_id' => ['required', 'exists:letter_templates,id'],
            'letter_date' => ['required', 'date'],
            'subject' => ['required', 'string', 'max:255'],
            'recipient' => ['required', 'string', 'max:255'],
            'signature_type' => ['required', 'in:digital,wet'],
            'content_data' => ['nullable', 'array'],
            'reviewers' => ['required', 'array', 'min:1'],
            'reviewers.*.user_id' => ['required', 'exists:users,id'],
            'reviewers.*.role_type' => ['required', 'in:reviewer,approver'],
        ];
    }

    /**
     * Configure the validator instance.
     * Enforces Constitution Principle IV: Strict Separation of Duties.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            $currentUserId = $this->user()?->id;
            $reviewers = $this->input('reviewers', []);

            if (! is_array($reviewers)) {
                return;
            }

            $userIds = [];
            $hasApprover = false;

            foreach ($reviewers as $index => $reviewer) {
                $targetUserId = (int) ($reviewer['user_id'] ?? 0);
                $roleType = $reviewer['role_type'] ?? '';

                // Drafter cannot review or approve own letter
                if ($targetUserId === $currentUserId) {
                    $validator->errors()->add(
                        'reviewers',
                        'Drafter cannot be selected as a reviewer or approver (Separation of Duties).'
                    );
                }

                // Check for duplicate reviewers in sequence
                if (in_array($targetUserId, $userIds, true)) {
                    $validator->errors()->add(
                        "reviewers.{$index}.user_id",
                        'The same user cannot be assigned multiple times in the approval workflow.'
                    );
                }
                $userIds[] = $targetUserId;

                if ($roleType === 'approver') {
                    $hasApprover = true;
                }
            }

            // Ensure workflow terminates with an approver
            if (! empty($reviewers)) {
                $lastTier = end($reviewers);
                if (($lastTier['role_type'] ?? '') !== 'approver') {
                    $validator->errors()->add(
                        'reviewers',
                        'The final tier in the approval workflow must be an Approver.'
                    );
                }
            }
        });
    }

    /**
     * Custom validation messages.
     */
    public function messages(): array
    {
        return [
            'template_id.required' => 'Pilih template naskah dinas terlebih dahulu.',
            'subject.required' => 'Perihal surat wajib diisi.',
            'recipient.required' => 'Tujuan / Penerima surat wajib diisi.',
            'signature_type.required' => 'Tipe pengesahan (digital/basah) wajib dipilih.',
            'reviewers.required' => 'Tentukan alur peninjauan surat.',
            'reviewers.min' => 'Minimal satu pejabat peninjau atau penandatangan harus ditentukan.',
        ];
    }
}
