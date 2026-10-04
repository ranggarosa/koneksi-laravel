<x-layouts.app>
    <x-slot name="title">Ambil Nomor Surat Eksternal - Koneksi</x-slot>

    <div class="max-w-3xl mx-auto py-6">
        <div class="mb-6">
            <h1 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">
                Reservasi Nomor Surat Eksternal (Ambil Nomor)
            </h1>
            <p class="mt-1 text-sm text-slate-500">
                Alokasikan nomor surat resmi untuk dokumen fisik eksternal (misal: Perjanjian Kerja Sama). Naskah membutuhkan persetujuan 1 tahap pejabat penandatangan dan memiliki batas rekonsiliasi unggah berkas selama 7 hari.
            </p>
        </div>

        <div class="bg-amber-50 rounded-lg p-4 border border-amber-200 mb-6">
            <div class="flex">
                <x-icons.exclamation class="h-5 w-5 text-amber-600 mr-3 flex-shrink-0 mt-0.5" />
                <div class="text-xs text-amber-800">
                    <p class="font-semibold">Aturan Kebijakan Penomoran (Konstitusi Prinsip I):</p>
                    <p class="mt-1">
                        Penomoran mundur (backdating) tidak diperkenankan. Setelah nomor disetujui, hasil scan fisik yang telah bertandatangan basah wajib diunggah dalam tempo maksimal 7 hari kalender. Nomor yang tidak direkonsiliasi akan kedaluwarsa otomatis dan dikembalikan ke pool daur ulang.
                    </p>
                </div>
            </div>
        </div>

        <form action="{{ route('take-number.store') }}" method="POST" class="space-y-6 bg-white p-6 sm:p-8 rounded-xl shadow-sm ring-1 ring-slate-900/5">
            @csrf

            <div class="grid grid-cols-1 gap-y-6 sm:grid-cols-2 gap-x-4">
                {{-- Template --}}
                <div class="sm:col-span-1">
                    <label for="template_id" class="block text-sm font-medium leading-6 text-slate-900">Jenis Dokumen</label>
                    <div class="mt-2">
                        <select id="template_id" name="template_id" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                            <option value="">-- Pilih Jenis Naskah --</option>
                            @foreach ($templates as $tmpl)
                                <option value="{{ $tmpl->id }}" {{ old('template_id') == $tmpl->id ? 'selected' : '' }}>
                                    [{{ $tmpl->code }}] {{ $tmpl->name }}
                                </option>
                            @endforeach
                        </select>
                    </div>
                </div>

                {{-- Letter Date (Min today!) --}}
                <div class="sm:col-span-1">
                    <label for="letter_date" class="block text-sm font-medium leading-6 text-slate-900">Tanggal Naskah</label>
                    <div class="mt-2">
                        <input type="date" name="letter_date" id="letter_date" min="{{ now()->format('Y-m-d') }}" value="{{ old('letter_date', now()->format('Y-m-d')) }}" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    </div>
                </div>

                {{-- Subject --}}
                <div class="sm:col-span-2">
                    <label for="subject" class="block text-sm font-medium leading-6 text-slate-900">Perihal Dokumen</label>
                    <div class="mt-2">
                        <input type="text" name="subject" id="subject" value="{{ old('subject') }}" placeholder="Contoh: Perjanjian Kerja Sama Pengadaan Layanan Cloud" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    </div>
                </div>

                {{-- Recipient --}}
                <div class="sm:col-span-2">
                    <label for="recipient" class="block text-sm font-medium leading-6 text-slate-900">Nama Mitra / Penerima Dokumen</label>
                    <div class="mt-2">
                        <input type="text" name="recipient" id="recipient" value="{{ old('recipient') }}" placeholder="Contoh: PT Solusi Teknologi Nusantara" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                    </div>
                </div>

                {{-- Approver Selection --}}
                <div class="sm:col-span-2">
                    <label for="approver_id" class="block text-sm font-medium leading-6 text-slate-900">Pejabat Berwenang (Penandatangan)</label>
                    <div class="mt-2">
                        <select id="approver_id" name="approver_id" required class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm">
                            <option value="">-- Pilih Pejabat Penandatangan --</option>
                            @foreach ($approvers as $appr)
                                <option value="{{ $appr->id }}" {{ old('approver_id') == $appr->id ? 'selected' : '' }}>
                                    {{ $appr->name }} ({{ $appr->email }})
                                </option>
                            @endforeach
                        </select>
                    </div>
                    <p class="mt-1 text-xs text-slate-500">Pejabat ini yang akan menandatangani dokumen dan menyetujui reservasi nomor.</p>
                </div>
            </div>

            <div class="border-t border-slate-200 pt-6 flex items-center justify-end gap-x-4">
                <a href="{{ route('letters.index') }}" class="text-sm font-semibold leading-6 text-slate-700 hover:text-slate-900">Batal</a>
                <button type="submit" class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                    <x-icons.document-text class="w-4 h-4 mr-2" />
                    Ajukan Reservasi Nomor
                </button>
            </div>
        </form>
    </div>
</x-layouts.app>
