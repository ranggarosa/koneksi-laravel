<x-layouts.app>
    <x-slot name="title">Dashboard - Koneksi Naskah Dinas</x-slot>

    <div class="py-4 space-y-6">
        {{-- Welcome Header --}}
        <div class="md:flex md:items-center md:justify-between bg-white p-6 rounded-xl shadow-sm ring-1 ring-slate-900/5">
            <div class="min-w-0 flex-1">
                <div class="flex items-center gap-3">
                    <h1 class="text-2xl font-bold leading-7 text-slate-900 sm:truncate sm:tracking-tight">
                        Selamat Datang, {{ Auth::user()->name }}
                    </h1>
                    <span class="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 uppercase tracking-wider ring-1 ring-inset ring-blue-700/10">
                        {{ Auth::user()->role }}
                    </span>
                </div>
                <p class="mt-1 text-sm text-slate-500">
                    Sistem Pengelolaan Naskah Dinas & Administrasi Penomoran Terpadu Koneksi Core.
                </p>
            </div>
            @if (Auth::user()?->isDrafter() || Auth::user()?->isAdmin())
                <div class="mt-4 flex md:ml-4 md:mt-0 gap-3">
                    <a href="{{ route('take-number.create') }}" class="inline-flex items-center rounded-md bg-white px-3.5 py-2 text-sm font-semibold text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 hover:bg-slate-50">
                        <x-icons.plus class="w-4 h-4 mr-1.5" />
                        Ambil Nomor Eksternal
                    </a>
                    <a href="{{ route('letters.create') }}" class="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                        <x-icons.plus class="w-4 h-4 mr-1.5" />
                        Buat Draf Naskah
                    </a>
                </div>
            @endif
        </div>

        {{-- Metrics Overview Cards --}}
        <div class="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-4">
            <div class="overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
                <div class="flex items-center">
                    <div class="flex-shrink-0 rounded-lg bg-amber-50 p-3 text-amber-600">
                        <x-icons.clock class="h-6 w-6" />
                    </div>
                    <div class="ml-4 w-0 flex-1">
                        <dl>
                            <dt class="truncate text-xs font-medium uppercase tracking-wider text-slate-500">Menunggu Tindakan Saya</dt>
                            <dd class="text-2xl font-bold tracking-tight text-slate-900">{{ $metrics['pending_my_approval'] }}</dd>
                        </dl>
                    </div>
                </div>
            </div>

            <div class="overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
                <div class="flex items-center">
                    <div class="flex-shrink-0 rounded-lg bg-blue-50 p-3 text-blue-600">
                        <x-icons.document-text class="h-6 w-6" />
                    </div>
                    <div class="ml-4 w-0 flex-1">
                        <dl>
                            <dt class="truncate text-xs font-medium uppercase tracking-wider text-slate-500">Draf Naskah Dibuat</dt>
                            <dd class="text-2xl font-bold tracking-tight text-slate-900">{{ $metrics['total_drafted'] }}</dd>
                        </dl>
                    </div>
                </div>
            </div>

            <div class="overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
                <div class="flex items-center">
                    <div class="flex-shrink-0 rounded-lg bg-emerald-50 p-3 text-emerald-600">
                        <x-icons.check class="h-6 w-6" />
                    </div>
                    <div class="ml-4 w-0 flex-1">
                        <dl>
                            <dt class="truncate text-xs font-medium uppercase tracking-wider text-slate-500">Naskah Resmi Disahkan</dt>
                            <dd class="text-2xl font-bold tracking-tight text-slate-900">{{ $metrics['approved_count'] }}</dd>
                        </dl>
                    </div>
                </div>
            </div>

            <div class="overflow-hidden rounded-xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5">
                <div class="flex items-center">
                    <div class="flex-shrink-0 rounded-lg bg-sky-50 p-3 text-sky-600">
                        <x-icons.arrow-path class="h-6 w-6" />
                    </div>
                    <div class="ml-4 w-0 flex-1">
                        <dl>
                            <dt class="truncate text-xs font-medium uppercase tracking-wider text-slate-500">Menunggu Unggah Scan</dt>
                            <dd class="text-2xl font-bold tracking-tight text-slate-900">{{ $metrics['pending_upload_count'] }}</dd>
                        </dl>
                    </div>
                </div>
            </div>
        </div>

        {{-- Pending Tasks Waiting for This User --}}
        @if ($pendingReviews->isNotEmpty())
            <div class="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-amber-50/50 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <x-icons.exclamation class="w-5 h-5 text-amber-600" />
                        <h2 class="text-base font-semibold text-slate-900">Perlu Tindakan Anda (Peninjauan / Penandatanganan)</h2>
                    </div>
                    <span class="text-xs font-medium text-amber-800 bg-amber-100 px-2 py-0.5 rounded-full">
                        {{ $pendingReviews->count() }} Naskah
                    </span>
                </div>
                <div class="divide-y divide-slate-200">
                    @foreach ($pendingReviews as $letter)
                        <div class="p-6 flex items-center justify-between hover:bg-slate-50/75 transition-colors">
                            <div class="space-y-1">
                                <div class="flex items-center gap-2">
                                    <span class="font-mono font-bold text-sm text-blue-600">{{ $letter->reference_number }}</span>
                                    <span class="text-xs bg-slate-100 text-slate-600 px-2 py-0.5 rounded">
                                        {{ $letter->template?->code ?? strtoupper($letter->type) }}
                                    </span>
                                    <x-status-badge :status="$letter->status" />
                                </div>
                                <h3 class="text-base font-medium text-slate-900">{{ $letter->subject }}</h3>
                                <p class="text-xs text-slate-500">
                                    Diajukan oleh: <strong class="text-slate-700">{{ $letter->user?->name }}</strong> &bull; Kepada: {{ $letter->recipient }} &bull; Tanggal: {{ $letter->letter_date?->format('d M Y') }}
                                </p>
                            </div>
                            <div>
                                <a href="{{ route('letters.show', $letter) }}" class="inline-flex items-center rounded-md bg-amber-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-amber-500">
                                    Tinjau Naskah
                                </a>
                            </div>
                        </div>
                    @endforeach
                </div>
            </div>
        @endif

        {{-- Urgent Upload Reconciliations (Ambil Nomor) --}}
        @if ($urgentUploads->isNotEmpty())
            <div class="bg-white rounded-xl shadow-sm ring-1 ring-slate-900/5 overflow-hidden">
                <div class="px-6 py-4 border-b border-slate-200 bg-sky-50/50 flex items-center justify-between">
                    <div class="flex items-center gap-2">
                        <x-icons.arrow-path class="w-5 h-5 text-sky-600" />
                        <h2 class="text-base font-semibold text-slate-900">Reservasi Menunggu Unggah Scan (Ambil Nomor)</h2>
                    </div>
                </div>
                <div class="divide-y divide-slate-200">
                    @foreach ($urgentUploads as $letter)
                        <div class="p-4 flex items-center justify-between hover:bg-slate-50">
                            <div>
                                <div class="font-mono font-bold text-sm text-slate-900">{{ $letter->reference_number }}</div>
                                <div class="text-xs text-slate-600">{{ $letter->subject }} (Mitra: {{ $letter->recipient }})</div>
                                <div class="text-xs text-amber-600 mt-0.5 font-medium">
                                    Batas Akhir: {{ $letter->reconciliation_deadline?->format('d M Y H:i') }}
                                </div>
                            </div>
                            @if (Auth::id() === $letter->user_id || Auth::user()?->isAdmin())
                                <a href="{{ route('letters.scan.create', $letter) }}" class="inline-flex items-center rounded-md bg-indigo-600 px-3 py-1.5 text-xs font-semibold text-white shadow-sm hover:bg-indigo-500">
                                    Unggah Scan
                                </a>
                            @endif
                        </div>
                    @endforeach
                </div>
            </div>
        @endif
    </div>
</x-layouts.app>
