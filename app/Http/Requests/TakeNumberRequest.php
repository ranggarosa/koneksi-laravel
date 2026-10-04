<?php

namespace App\Http\Requests;

use App\Models\Letter;
use Illuminate\Foundation\Http\FormRequest;
use Illuminate\Validation\Validator;

class TakeNumberRequest extends FormRequest
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
     * Enforces Constitution Principle I: Backdating is strictly rejected.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'template_id' => ['required', 'exists:letter_templates,id'],
            'letter_date' => ['required', 'date', 'after_or_equal:today'],
            'subject' => ['required', 'string', 'max:255'],
            'recipient' => ['required', 'string', 'max:255'],
            'approver_id' => ['required', 'exists:users,id'],
        ];
    }

    /**
     * Configure validator instance.
     */
    public function withValidator(Validator $validator): void
    {
        $validator->after(function (Validator $validator) {
            if ((int) $this->input('approver_id') === (int) $this->user()?->id) {
                $validator->errors()->add(
                    'approver_id',
                    'Pembuat naskah tidak dapat memilih dirinya sendiri sebagai pejabat penandatangan (Separation of Duties).'
                );
            }
        });
    }

    public function messages(): array
    {
        return [
            'template_id.required' => 'Pilih template naskah dinas untuk penomoran.',
            'letter_date.after_or_equal' => 'Tanggal naskah tidak boleh bertanggal mundur (backdated) dari hari ini.',
            'subject.required' => 'Perihal dokumen fisik wajib diisi.',
            'recipient.required' => 'Tujuan / Penerima dokumen fisik wajib diisi.',
            'approver_id.required' => 'Pilih pejabat yang berwenang menyetujui reservasi nomor.',
        ];
    }
}
