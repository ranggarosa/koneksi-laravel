<x-layouts.app>
    <x-slot name="title">Unggah Hasil Pindai Naskah Fisik - {{ $letter->reference_number }}</x-slot>

    <div class="max-w-2xl mx-auto py-6">
        <div class="mb-6">
            <nav class="flex text-sm font-medium text-slate-500 mb-2">
                <a href="{{ route('letters.index') }}" class="hover:text-slate-700">Naskah Dinas</a>
                <span class="mx-2 text-slate-400">/</span>
                <a href="{{ route('letters.show', $letter) }}" class="hover:text-slate-700 font-mono">{{ $letter->reference_number }}</a>
                <span class="mx-2 text-slate-400">/</span>
                <span class="text-slate-900">Unggah Scan</span>
            </nav>
            <h1 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">
                Unggah Hasil Pindai (Scan) Naskah Fisik
            </h1>
            <p class="mt-1 text-sm text-slate-500">
                Unggah dokumen PDF hasil pemindaian surat fisik yang telah dibubuhi tanda tangan basah dan cap resmi.
            </p>
        </div>

        <div class="bg-white p-6 sm:p-8 rounded-xl shadow-sm ring-1 ring-slate-900/5 space-y-6">
            <div class="bg-slate-50 p-4 rounded-lg border border-slate-200">
                <div class="flex items-center justify-between mb-2">
                    <span class="text-xs font-semibold uppercase tracking-wider text-slate-500">Nomor Referensi</span>
                    <x-status-badge :status="$letter->status" />
                </div>
                <div class="font-mono font-bold text-lg text-slate-900">{{ $letter->reference_number }}</div>
                <div class="text-sm text-slate-600 mt-1">{{ $letter->subject }}</div>
                <div class="text-xs text-slate-500 mt-0.5">Penerima: {{ $letter->recipient }}</div>
            </div>

            <form action="{{ route('letters.scan.store', $letter) }}" method="POST" enctype="multipart/form-data" class="space-y-6">
                @csrf

                <div>
                    <label for="scan_file" class="block text-sm font-medium leading-6 text-slate-900">
                        Berkas Dokumen PDF (*.pdf)
                    </label>
                    <div class="mt-2 flex justify-center rounded-lg border border-dashed border-slate-900/25 px-6 py-10 hover:border-blue-500 transition-colors">
                        <div class="text-center">
                            <x-icons.document-text class="mx-auto h-12 w-12 text-slate-300" />
                            <div class="mt-4 flex text-sm leading-6 text-slate-600 justify-center">
                                <label for="scan_file" class="relative cursor-pointer rounded-md bg-white font-semibold text-blue-600 focus-within:outline-none focus-within:ring-2 focus-within:ring-blue-600 focus-within:ring-offset-2 hover:text-blue-500">
                                    <span>Pilih berkas dari komputer</span>
                                    <input id="scan_file" name="scan_file" type="file" accept="application/pdf" required class="sr-only">
                                </label>
                            </div>
                            <p class="text-xs leading-5 text-slate-600 mt-1">Hanya format PDF hingga ukuran maksimum 10MB</p>
                        </div>
                    </div>
                </div>

                <div class="border-t border-slate-200 pt-6 flex items-center justify-end gap-x-4">
                    <a href="{{ route('letters.show', $letter) }}" class="text-sm font-semibold leading-6 text-slate-700 hover:text-slate-900">Batal</a>
                    <button type="submit" class="inline-flex items-center justify-center rounded-md bg-blue-600 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        <x-icons.check class="w-4 h-4 mr-2" />
                        Verifikasi & Sahkan Dokumen
                    </button>
                </div>
            </form>
        </div>
    </div>
</x-layouts.app>
