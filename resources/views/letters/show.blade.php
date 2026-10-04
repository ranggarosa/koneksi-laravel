<x-layouts.app>
    <x-slot name="title">{{ $letter->reference_number ?? 'Draf Surat' }} - Detail Naskah Dinas</x-slot>

    <div class="py-4 space-y-6 max-w-5xl mx-auto">
        {{-- Breadcrumb & Back --}}
        <div class="flex items-center justify-between">
            <nav class="flex text-sm font-medium text-slate-500">
                <a href="{{ route('letters.index') }}" class="hover:text-slate-700">Naskah Dinas</a>
                <span class="mx-2 text-slate-400">/</span>
                <span class="text-slate-900 font-mono">{{ $letter->reference_number ?? 'Draf' }}</span>
            </nav>
            <div class="flex gap-2">
                @if ($letter->status === \App\Models\Letter::STATUS_APPROVED)
                    <a href="{{ route('letters.download', $letter) }}" class="inline-flex items-center rounded-md bg-blue-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-blue-500">
                        <x-icons.document-text class="w-4 h-4 mr-1.5" />
                        Unduh Dokumen PDF
                    </a>
                @endif

                @if (in_array($letter->status, [\App\Models\Letter::STATUS_AWAITING_WET_SIGNATURE, \App\Models\Letter::STATUS_PENDING_UPLOAD], true) && (Auth::id() === $letter->user_id || Auth::user()?->isAdmin()))
                    <a href="{{ route('letters.scan.create', $letter) }}" class="inline-flex items-center rounded-md bg-indigo-600 px-3.5 py-2 text-sm font-semibold text-white shadow-sm hover:bg-indigo-500">
                        <x-icons.arrow-path class="w-4 h-4 mr-1.5" />
                        Unggah Hasil Scan Fisik
                    </a>
                @endif
            </div>
        </div>

        {{-- Main Document Header Card --}}
        <div class="bg-white p-6 sm:p-8 rounded-xl shadow-sm ring-1 ring-slate-900/5">
            <div class="md:flex md:items-center md:justify-between border-b border-slate-200 pb-6">
                <div>
                    <div class="flex items-center gap-3">
                        <h1 class="text-2xl font-bold font-mono text-slate-900">
                            {{ $letter->reference_number ?? 'Draf (Belum Diberi Nomor)' }}
                        </h1>
                        <x-status-badge :status="$letter->status" />
                    </div>
                    <p class="mt-1 text-base text-slate-600 font-medium">
                        {{ $letter->subject }}
                    </p>
                </div>
                <div class="mt-4 md:mt-0 text-right">
                    <span class="inline-flex items-center rounded-md bg-blue-50 px-2.5 py-1 text-xs font-semibold text-blue-700 ring-1 ring-inset ring-blue-700/10">
                        {{ $letter->template?->code ?? strtoupper($letter->type) }}
                    </span>
                    <p class="mt-1 text-xs text-slate-500">
                        {{ $letter->template?->name ?? 'Surat Eksternal' }}
                    </p>
                </div>
            </div>

            {{-- Metadata Grid --}}
            <div class="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6 py-6 border-b border-slate-200 text-sm">
                <div>
                    <span class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Pembuat Draf</span>
                    <span class="mt-1 block font-semibold text-slate-900">{{ $letter->user?->name ?? '-' }}</span>
                    <span class="text-xs text-slate-500">{{ $letter->user?->email }}</span>
                </div>
                <div>
                    <span class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Tujuan / Penerima</span>
                    <span class="mt-1 block font-semibold text-slate-900">{{ $letter->recipient }}</span>
                </div>
                <div>
                    <span class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Tanggal Naskah</span>
                    <span class="mt-1 block font-semibold text-slate-900">{{ $letter->letter_date ? $letter->letter_date->format('d M Y') : '-' }}</span>
                </div>
                <div>
                    <span class="block text-xs font-medium text-slate-400 uppercase tracking-wider">Metode Pengesahan</span>
                    <span class="mt-1 block font-semibold text-slate-900">
                        {{ $letter->signature_type === 'digital' ? 'Tanda Tangan Digital' : 'Tanda Tangan Basah' }}
                    </span>
                    @if ($letter->reconciliation_deadline)
                        <span class="text-xs text-amber-600 block mt-0.5">
                            Batas Upload: {{ $letter->reconciliation_deadline->format('d M Y') }}
                        </span>
                    @endif
                </div>
            </div>

            {{-- Custom Template Fields if any --}}
            @if (! empty($letter->content_data))
                <div class="py-6 border-b border-slate-200">
                    <h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Isian Spesifik Dokumen</h3>
                    <dl class="grid grid-cols-1 sm:grid-cols-2 gap-4 text-sm bg-slate-50 p-4 rounded-lg">
                        @foreach ($letter->content_data as $key => $value)
                            <div>
                                <dt class="text-xs font-medium text-slate-500">{{ ucwords(str_replace('_', ' ', $key)) }}</dt>
                                <dd class="mt-0.5 font-semibold text-slate-800">{{ is_array($value) ? json_encode($value) : $value }}</dd>
                            </div>
                        @endforeach
                    </dl>
                </div>
            @endif

            {{-- Sequential Approval Stepper --}}
            <div class="py-6 border-b border-slate-200">
                <h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Alur Persetujuan Bertingkat</h3>
                <div class="space-y-3">
                    @forelse ($letter->workflows as $wf)
                        <div class="flex items-center justify-between p-4 rounded-lg border {{ $wf->status === 'pending' ? 'border-amber-300 bg-amber-50/50 ring-1 ring-amber-400/30' : ($wf->status === 'approved' ? 'border-emerald-200 bg-emerald-50/30' : ($wf->status === 'rejected' ? 'border-rose-200 bg-rose-50/30' : 'border-slate-200 bg-white')) }}">
                            <div class="flex items-center gap-3">
                                <div class="w-8 h-8 rounded-full flex items-center justify-center font-bold text-xs {{ $wf->status === 'approved' ? 'bg-emerald-600 text-white' : ($wf->status === 'rejected' ? 'bg-rose-600 text-white' : ($wf->status === 'pending' ? 'bg-amber-600 text-white' : 'bg-slate-200 text-slate-600')) }}">
                                    {{ $wf->step_order }}
                                </div>
                                <div>
                                    <div class="text-sm font-semibold text-slate-900">
                                        {{ $wf->user?->name ?? 'Belum Ditugaskan' }}
                                        <span class="ml-1 text-xs font-normal uppercase text-slate-500">({{ $wf->role_type }})</span>
                                    </div>
                                    @if ($wf->notes)
                                        <p class="text-xs text-slate-600 mt-0.5 italic">Catatan: "{{ $wf->notes }}"</p>
                                    @endif
                                </div>
                            </div>
                            <x-status-badge :status="$wf->status" />
                        </div>
                    @empty
                        <p class="text-xs text-slate-400">Tidak ada alur persetujuan terdaftar.</p>
                    @endforelse
                </div>
            </div>

            {{-- Interactive Sign-off / Review Action Panel --}}
            @php
                $activeStep = $letter->workflows->firstWhere('status', \App\Models\ApprovalWorkflow::STATUS_PENDING);
                $canReview = $activeStep && $activeStep->user_id === Auth::id() && $letter->user_id !== Auth::id();
            @endphp

            @if ($canReview)
                <div class="py-6 border-b border-slate-200 bg-blue-50/40 -mx-6 sm:-mx-8 px-6 sm:px-8 mt-6">
                    <h3 class="text-base font-semibold text-slate-900 mb-1">
                        Konfirmasi Persetujuan / Penolakan (Tahap {{ $activeStep->step_order }} - {{ ucfirst($activeStep->role_type) }})
                    </h3>
                    <p class="text-xs text-slate-600 mb-4">
                        Anda ditugaskan untuk meninjau atau menandatangani naskah dinas ini. Berikan catatan bila diperlukan.
                    </p>

                    <div class="grid grid-cols-1 md:grid-cols-2 gap-6">
                        {{-- Approve Form --}}
                        <form action="{{ route('letters.approve', $letter) }}" method="POST" class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                            @csrf
                            <h4 class="text-xs font-semibold uppercase tracking-wider text-emerald-700">Setujui Naskah Dinas</h4>
                            <div>
                                <label for="approve_notes" class="block text-xs font-medium text-slate-700">Catatan Persetujuan (Opsional)</label>
                                <textarea name="notes" id="approve_notes" rows="2" class="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 text-xs"></textarea>
                            </div>
                            <button type="submit" class="w-full inline-flex justify-center items-center rounded-md bg-emerald-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-emerald-500">
                                <x-icons.check class="w-4 h-4 mr-1.5" />
                                Setujui & Lanjutkan
                            </button>
                        </form>

                        {{-- Reject Form --}}
                        <form action="{{ route('letters.reject', $letter) }}" method="POST" class="bg-white p-4 rounded-lg border border-slate-200 shadow-sm space-y-3">
                            @csrf
                            <h4 class="text-xs font-semibold uppercase tracking-wider text-rose-700">Tolak Naskah Dinas</h4>
                            <div>
                                <label for="reject_notes" class="block text-xs font-medium text-slate-700">Alasan Penolakan (Wajib Diisi)</label>
                                <textarea name="notes" id="reject_notes" rows="2" required placeholder="Tuliskan alasan penolakan naskah..." class="mt-1 block w-full rounded-md border-0 py-1.5 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 text-xs"></textarea>
                            </div>
                            <button type="submit" class="w-full inline-flex justify-center items-center rounded-md bg-rose-600 px-3 py-2 text-xs font-semibold text-white shadow-sm hover:bg-rose-500">
                                <x-icons.x-circle class="w-4 h-4 mr-1.5" />
                                Tolak Naskah & Daur Ulang Nomor
                            </button>
                        </form>
                    </div>
                </div>
            @endif

            {{-- Audit Logs Timeline --}}
            <div class="pt-6">
                <h3 class="text-sm font-semibold text-slate-900 uppercase tracking-wider mb-4">Riwayat Jejak Audit Dokumen</h3>
                <x-audit-timeline :audit-logs="$letter->auditLogs" />
            </div>
        </div>
    </div>
</x-layouts.app>
