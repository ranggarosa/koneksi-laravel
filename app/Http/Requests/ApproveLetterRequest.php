<?php

namespace App\Http\Requests;

use App\Models\Letter;
use Illuminate\Foundation\Http\FormRequest;

class ApproveLetterRequest extends FormRequest
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
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'notes' => ['nullable', 'string', 'max:1000'],
        ];
    }
}
