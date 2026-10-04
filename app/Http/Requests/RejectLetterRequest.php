<?php

namespace App\Http\Requests;

use App\Models\Letter;
use Illuminate\Foundation\Http\FormRequest;

class RejectLetterRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var Letter|null $letter */
        $letter = $this->route('letter');

        return $letter && $this->user()?->can('review', $letter);
    }

    /**
     * Get the validation rules that apply to the request.
     * Rejection mandates explicit notes/reasons explaining why the letter was rejected.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'notes' => ['required', 'string', 'min:3', 'max:1000'],
        ];
    }

    public function messages(): array
    {
        return [
            'notes.required' => 'Alasan penolakan naskah wajib diisi secara jelas.',
            'notes.min' => 'Alasan penolakan minimal 3 karakter.',
        ];
    }
}
