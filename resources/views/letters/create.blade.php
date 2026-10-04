<x-layouts.app>
    <x-slot name="title">Buat Draf Naskah Dinas Baru - Koneksi</x-slot>

    <div class="max-w-4xl mx-auto py-4">
        <div class="md:flex md:items-center md:justify-between mb-6">
            <div class="min-w-0 flex-1">
                <h1 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">
                    Buat Naskah Dinas Baru
                </h1>
                <p class="mt-1 text-sm text-slate-500">
                    Isi formulir untuk mengalokasikan nomor surat atomik dan memulai alur persetujuan naskah dinas.
                </p>
            </div>
            <div class="mt-4 flex md:ml-4 md:mt-0">
                <a href="{{ route('letters.index') }}" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                    Batal
                </a>
            </div>
        </div>

        <form action="{{ route('letters.store') }}" method="POST" class="space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-sm ring-1 ring-slate-900/5">
            @csrf

            <div class="grid grid-cols-1 gap-y-6 gap-x-4 sm:grid-cols-6">
                {{-- Template Selection --}}
                <div class="sm:col-span-3">
                    <label for="template_id" class="block text-sm font-medium leading-6 text-slate-900">Jenis / Template Surat</label>
                    <div class="mt-2">
                        <select id="template_id" name="template_id" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                            <option value="">-- Pilih Template Naskah Dinas --</option>
                            @foreach ($templates as $tmpl)
                                <option value="{{ $tmpl->id }}" {{ old('template_id') == $tmpl->id ? 'selected' : '' }}>
                                    [{{ $tmpl->code }}] {{ $tmpl->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>
                </div>

                {{-- Letter Date --}}
                <div class="sm:col-span-3">
                    <label for="letter_date" class="block text-sm font-medium leading-6 text-slate-900">Tanggal Naskah</label>
                    <div class="mt-2">
                        <input type="date" name="letter_date" id="letter_date" value="{{ old('letter_date', now()->format('Y-m-d')) }}" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    </div>
                </div>

                {{-- Subject --}}
                <div class="sm:col-span-6">
                    <label for="subject" class="block text-sm font-medium leading-6 text-slate-900">Perihal / Hal</label>
                    <div class="mt-2">
                        <input type="text" name="subject" id="subject" value="{{ old('subject') }}" placeholder="Contoh: Surat Keterangan Kerja untuk Karyawan" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    </div>
                </div>

                {{-- Recipient --}}
                <div class="sm:col-span-6">
                    <label for="recipient" class="block text-sm font-medium leading-6 text-slate-900">Tujuan / Nama Penerima</label>
                    <div class="mt-2">
                        <input type="text" name="recipient" id="recipient" value="{{ old('recipient') }}" placeholder="Contoh: Budi Santoso / PT Mitra Utama" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    </div>
                </div>

                {{-- Signature Type --}}
                <div class="sm:col-span-6">
                    <label class="block text-sm font-medium leading-6 text-slate-900">Metode Pengesahan / Tanda Tangan</label>
                    <div class="mt-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
                        <label class="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none border-slate-300 has-[:checked]:border-blue-600 has-[:checked]:ring-2 has-[:checked]:ring-blue-600">
                            <input type="radio" name="signature_type" value="digital" class="sr-only" {{ old('signature_type', 'digital') === 'digital' ? 'checked' : '' }}>
                            <div class="flex flex-col">
                                <span class="block text-sm font-semibold text-slate-900">Tanda Tangan Digital</span>
                                <span class="mt-1 flex items-center text-xs text-slate-500">PDF digenerate otomatis dengan qr/tanda tangan elektronik saat disetujui</span>
                            </div>
                        </label>
                        <label class="relative flex cursor-pointer rounded-lg border bg-white p-4 shadow-sm focus:outline-none border-slate-300 has-[:checked]:border-blue-600 has-[:checked]:ring-2 has-[:checked]:ring-blue-600">
                            <input type="radio" name="signature_type" value="wet" class="sr-only" {{ old('signature_type') === 'wet' ? 'checked' : '' }}>
                            <div class="flex flex-col">
                                <span class="block text-sm font-semibold text-slate-900">Tanda Tangan Basah (Fisik)</span>
                                <span class="mt-1 flex items-center text-xs text-slate-500">Cetak fisik, tandatangan basah, lalu unggah kembali hasil pindai (scan)</span>
                            </div>
                        </label>
                    </div>
                </div>
            </div>

            {{-- Sequential Approval Workflow Setup --}}
            <div class="border-t border-slate-200 pt-6">
                <h3 class="text-base font-semibold leading-6 text-slate-900">Alur Peninjauan & Penandatangan</h3>
                <p class="mt-1 text-sm text-slate-500">
                    Tentukan urutan pejabat peninjau (Reviewer) dan pejabat penandatangan akhir (Approver). Catatan: Pembuat naskah tidak dapat memilih dirinya sendiri sebagai peninjau.
                </p>

                <div class="mt-4 space-y-4">
                    {{-- Optional Tier 1: Reviewer --}}
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold uppercase tracking-wider text-slate-600">Tingkat 1 (Peninjauan Awal)</span>
                            <span class="text-xs text-slate-500">Opsional untuk surat tertentu</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-slate-700">Pilih Pejabat Peninjau (Reviewer)</label>
                                <select name="reviewers[0][user_id]" class="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 sm:text-sm">
                                    <option value="">-- Lewati Tahap Peninjau (Langsung ke Penandatangan) --</option>
                                    @foreach ($reviewers as $rev)
                                        <option value="{{ $rev->id }}">{{ $rev->name }} ({{ $rev->email }})</option>
                                    @endforeach
                                </select>
                                <input type="hidden" name="reviewers[0][role_type]" value="reviewer">
                            </div>
                        </div>
                    </div>

                    {{-- Mandatory Tier 2: Approver (Signer) --}}
                    <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                        <div class="flex items-center justify-between mb-2">
                            <span class="text-xs font-semibold uppercase tracking-wider text-slate-600">Tingkat Akhir (Penandatangan Dokumen)</span>
                            <span class="text-xs font-medium text-blue-600">Wajib Diisi</span>
                        </div>
                        <div class="grid grid-cols-1 sm:grid-cols-2 gap-4">
                            <div>
                                <label class="block text-xs font-medium text-slate-700">Pilih Pejabat Penandatangan (Approver)</label>
                                <select name="reviewers[1][user_id]" required class="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 sm:text-sm">
                                    <option value="">-- Pilih Penandatangan Akhir --</option>
                                    @foreach ($approvers as $appr)
                                        <option value="{{ $appr->id }}">{{ $appr->name }} ({{ $appr->email }})</option>
                                    @endforeach
                                </select>
                                <input type="hidden" name="reviewers[1][role_type]" value="approver">
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div class="border-t border-slate-200 pt-6 flex items-center justify-end gap-x-4">
                <a href="{{ route('letters.index') }}" class="text-sm font-semibold leading-6 text-slate-700 hover:text-slate-900">Batal</a>
                <button type="submit" class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    <x-icons.document-text class="w-4 h-4 mr-2" />
                    Terbitkan Draf & Alokasikan Nomor
                </button>
            </div>
        </form>
    </div>

    <script>
        // Clean up empty optional reviewer before submission
        document.querySelector('form').addEventListener('submit', function(e) {
            const firstReviewerSelect = document.querySelector('select[name="reviewers[0][user_id]"]');
            if (firstReviewerSelect && !firstReviewerSelect.value) {
                // If reviewer 0 is not selected, re-index approver as tier 0 so array is compact
                const approverSelect = document.querySelector('select[name="reviewers[1][user_id]"]');
                const approverHidden = document.querySelector('input[name="reviewers[1][role_type]"]');
                firstReviewerSelect.closest('.bg-slate-50').remove();
                if (approverSelect) approverSelect.name = 'reviewers[0][user_id]';
                if (approverHidden) approverHidden.name = 'reviewers[0][role_type]';
            }
        });
    </script>
</x-layouts.app>
