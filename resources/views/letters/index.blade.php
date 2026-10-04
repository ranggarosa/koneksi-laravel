<x-layouts.app>
    <x-slot name="title">Daftar Naskah Dinas - Koneksi</x-slot>

    <div class="py-4">
        <div class="sm:flex sm:items-center sm:justify-between mb-6">
            <div>
                <h1 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">
                    Naskah Dinas
                </h1>
                <p class="mt-1 text-sm text-slate-500">
                    Daftar seluruh naskah dinas, draf surat, dan status persetujuan berjenjang.
                </p>
            </div>
            @if (Auth::user()?->isDrafter() || Auth::user()?->isAdmin())
                <div class="mt-4 sm:ml-4 sm:mt-0 flex gap-3">
                    <a href="{{ route('take-number.create') }}" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                        <x-icons.plus class="w-4 h-4 mr-1.5" />
                        Ambil Nomor Eksternal
                    </a>
                    <a href="{{ route('letters.create') }}" class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        <x-icons.plus class="w-4 h-4 mr-1.5" />
                        Buat Draf Baru
                    </a>
                </div>
            @endif
        </div>

        <div class="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
            @if ($letters->isEmpty())
                <div class="text-center py-12 px-4">
                    <x-icons.document-text class="mx-auto h-12 w-12 text-slate-300" />
                    <h3 class="mt-2 text-sm font-semibold text-slate-900">Belum ada naskah dinas</h3>
                    <p class="mt-1 text-sm text-slate-500">Mulai dengan membuat draf surat baru untuk mengalokasikan nomor atomik.</p>
                    @if (Auth::user()?->isDrafter() || Auth::user()?->isAdmin())
                        <div class="mt-6">
                            <a href="{{ route('letters.create') }}" class="inline-flex items-center rounded-md bg-blue-600 px-3 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                                <x-icons.plus class="w-4 h-4 mr-1.5" />
                                Buat Draf Baru
                            </a>
                        </div>
                    @endif
                </div>
            @else
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:pl-6">Nomor Surat</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Perihal & Penerima</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jenis</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Status</th>
                                <th scope="col" class="relative py-3.5 pl-3 pr-4 sm:pr-6 text-right text-xs font-semibold uppercase tracking-wider text-slate-500">Aksi</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white">
                            @foreach ($letters as $letter)
                                <tr class="hover:bg-slate-50/75 transition-colors">
                                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono font-semibold text-blue-600 sm:pl-6">
                                        <a href="{{ route('letters.show', $letter) }}" class="hover:underline">
                                            {{ $letter->reference_number ?? 'Draf (Belum Bernomor)' }}
                                        </a>
                                    </td>
                                    <td class="px-3 py-4 text-sm text-slate-900 max-w-xs">
                                        <div class="font-medium text-slate-900 truncate">{{ $letter->subject }}</div>
                                        <div class="text-xs text-slate-500 truncate">Kepada: {{ $letter->recipient }}</div>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                            {{ $letter->template?->code ?? strtoupper($letter->type) }}
                                        </span>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                        {{ $letter->letter_date ? $letter->letter_date->format('d M Y') : '-' }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm">
                                        <x-status-badge :status="$letter->status" />
                                    </td>
                                    <td class="relative whitespace-nowrap py-4 pl-3 pr-4 text-right text-sm font-medium sm:pr-6">
                                        <a href="{{ route('letters.show', $letter) }}" class="text-blue-600 hover:text-blue-900">
                                            Buka Detail
                                        </a>
                                    </td>
                                </tr>
                            @endforeach
                        </tbody>
                    </table>
                </div>

                @if ($letters->hasPages())
                    <div class="p-4 border-t border-slate-200">
                        {{ $letters->links() }}
                    </div>
                @endif
            @endif
        </div>
    </div>
</x-layouts.app>
