<x-layouts.app>
    <x-slot name="title">Buku Agenda Naskah Dinas Resmi - Koneksi</x-slot>

    <div class="py-4 space-y-6">
        {{-- Page Header --}}
        <div class="md:flex md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-900/5">
            <div>
                <h1 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">
                    Buku Agenda Naskah Dinas Resmi
                </h1>
                <p class="mt-1 text-sm text-slate-500">
                    Buku register publik seluruh surat keluar dan naskah dinas yang telah disahkan secara hukum.
                </p>
            </div>
            <div class="mt-4 md:mt-0 text-sm text-slate-500">
                Total Arsip: <strong class="text-slate-900 font-mono">{{ $letters->total() }}</strong> Naskah
            </div>
        </div>

        {{-- Filters & Search Bar --}}
        <div class="bg-white p-4 rounded-xl shadow-sm ring-1 ring-slate-900/5">
            <form method="GET" action="{{ route('agenda.index') }}" class="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div class="sm:col-span-2">
                    <label for="q" class="block text-xs font-medium text-slate-700">Pencarian</label>
                    <input type="text" name="q" id="q" value="{{ request('q') }}" placeholder="Cari nomor surat, perihal, atau mitra..." class="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 text-xs">
                </div>
                <div>
                    <label for="template_id" class="block text-xs font-medium text-slate-700">Jenis Template</label>
                    <select name="template_id" id="template_id" class="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 text-xs">
                        <option value="">-- Seluruh Jenis --</option>
                        @foreach ($templates as $tmpl)
                            <option value="{{ $tmpl->id }}" {{ request('template_id') == $tmpl->id ? 'selected' : '' }}>
                                [{{ $tmpl->code }}] {{ $tmpl->name }}
                            </option>
                        @endforeach
                    </select>
                </div>
                <div class="flex items-end gap-2">
                    <button type="submit" class="flex-1 inline-flex justify-center items-center rounded-md bg-blue-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-blue-500">
                        Cari
                    </button>
                    @if (request()->hasAny(['q', 'template_id', 'year']))
                        <a href="{{ route('agenda.index') }}" class="inline-flex items-center rounded-md bg-white px-3 py-2 text-xs font-semibold text-slate-700 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                            Reset
                        </a>
                    @endif
                </div>
            </form>
        </div>

        {{-- Agenda Table --}}
        <div class="bg-white shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl overflow-hidden">
            @if ($letters->isEmpty())
                <div class="text-center py-12 px-4">
                    <x-icons.book-open class="mx-auto h-12 w-12 text-slate-300" />
                    <h3 class="mt-2 text-sm font-semibold text-slate-900">Tidak ada naskah dinas dalam agenda</h3>
                    <p class="mt-1 text-sm text-slate-500">Naskah yang telah selesai diparaf dan disahkan akan tercatat otomatis di buku agenda ini.</p>
                </div>
            @else
                <div class="overflow-x-auto">
                    <table class="min-w-full divide-y divide-slate-200">
                        <thead class="bg-slate-50">
                            <tr>
                                <th scope="col" class="py-3.5 pl-4 pr-3 text-left text-xs font-semibold uppercase tracking-wider text-slate-500 sm:pl-6">Nomor Agenda & Referensi</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Tanggal Naskah</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Perihal</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Penerima / Mitra</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Jenis Dokumen</th>
                                <th scope="col" class="px-3 py-3.5 text-left text-xs font-semibold uppercase tracking-wider text-slate-500">Pengesahan</th>
                            </tr>
                        </thead>
                        <tbody class="divide-y divide-slate-200 bg-white">
                            @foreach ($letters as $letter)
                                <tr class="hover:bg-slate-50/75 transition-colors">
                                    <td class="whitespace-nowrap py-4 pl-4 pr-3 text-sm font-mono font-semibold text-blue-600 sm:pl-6">
                                        @auth
                                            <a href="{{ route('letters.show', $letter) }}" class="hover:underline">
                                                {{ $letter->reference_number }}
                                            </a>
                                        @else
                                            <span>{{ $letter->reference_number }}</span>
                                        @endauth
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500 font-medium">
                                        {{ $letter->letter_date ? $letter->letter_date->format('d M Y') : '-' }}
                                    </td>
                                    <td class="px-3 py-4 text-sm text-slate-900 max-w-sm">
                                        <div class="font-medium text-slate-900 truncate">{{ $letter->subject }}</div>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-600 font-medium">
                                        {{ $letter->recipient }}
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                        <span class="inline-flex items-center rounded-md bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700">
                                            {{ $letter->template?->code ?? strtoupper($letter->type) }}
                                        </span>
                                    </td>
                                    <td class="whitespace-nowrap px-3 py-4 text-sm text-slate-500">
                                        <span class="inline-flex items-center rounded-md px-2 py-0.5 text-xs font-medium ring-1 ring-inset {{ $letter->signature_type === 'digital' ? 'bg-blue-50 text-blue-700 ring-blue-600/20' : 'bg-purple-50 text-purple-700 ring-purple-600/20' }}">
                                            {{ $letter->signature_type === 'digital' ? 'Digital' : 'Tanda Tangan Basah' }}
                                        </span>
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
