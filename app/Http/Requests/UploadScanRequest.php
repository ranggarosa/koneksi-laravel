<?php

namespace App\Http\Requests;

use App\Models\Letter;
use Illuminate\Foundation\Http\FormRequest;

class UploadScanRequest extends FormRequest
{
    /**
     * Determine if the user is authorized to make this request.
     */
    public function authorize(): bool
    {
        /** @var Letter|null $letter */
        $letter = $this->route('letter');

        return $letter && $this->user()?->can('uploadScan', $letter);
    }

    /**
     * Get the validation rules that apply to the request.
     *
     * @return array<string, \Illuminate\Contracts\Validation\ValidationRule|array<mixed>|string>
     */
    public function rules(): array
    {
        return [
            'scan_file' => [
                'required',
                'file',
                'mimes:pdf',
                'max:10240', // 10MB maximum limit
            ],
        ];
    }

    public function messages(): array
    {
        return [
            'scan_file.required' => 'Pilih berkas PDF hasil scan fisik terlebih dahulu.',
            'scan_file.mimes' => 'Format berkas harus berupa dokumen PDF (.pdf).',
            'scan_file.max' => 'Ukuran berkas scan tidak boleh melebihi 10 Megabyte.',
        ];
    }
}
