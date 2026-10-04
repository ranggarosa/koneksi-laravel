@props(['auditLogs'])

<div class="flow-root">
    <ul role="list" class="-mb-8">
        @forelse ($auditLogs as $index => $log)
            <li>
                <div class="relative pb-8">
                    @if (! $loop->last)
                        <span class="absolute left-4 top-4 -ml-px h-full w-0.5 bg-slate-200" aria-hidden="true"></span>
                    @endif
                    <div class="relative flex space-x-3">
                        <div>
                            <span class="h-8 w-8 rounded-full bg-slate-100 ring-4 ring-white flex items-center justify-center text-slate-500">
                                <x-icons.clock class="h-4 w-4" />
                            </span>
                        </div>
                        <div class="flex min-w-0 flex-1 justify-between space-x-4 pt-1.5">
                            <div>
                                <p class="text-sm font-medium text-slate-900">
                                    {{ $log->actor_email }}
                                    <span class="font-normal text-slate-500">
                                        {{ match ($log->action) {
                                            'created_draft' => 'membuat draf surat',
                                            'approved_tier' => 'menyetujui tahap peninjauan',
                                            'finalized_digital' => 'mengesahkan surat dengan tanda tangan digital',
                                            'approved_awaiting_wet_signature' => 'menyetujui naskah, menunggu tanda tangan basah',
                                            'rejected_letter' => 'menolak naskah dinas',
                                            'uploaded_scan' => 'mengunggah berkas scan tanda tangan basah',
                                            'reserved_external' => 'melakukan reservasi nomor surat eksternal',
                                            'expired_reservation' => 'reservasi nomor kedaluwarsa otomatis',
                                            default => $log->action,
                                        } }}
                                    </span>
                                </p>
                                @if (! empty($log->metadata['notes']))
                                    <p class="mt-1 text-xs text-slate-600 bg-slate-50 rounded p-2 border border-slate-100 italic">
                                        "{{ $log->metadata['notes'] }}"
                                    </p>
                                @endif
                            </div>
                            <div class="whitespace-nowrap text-right text-xs text-slate-400">
                                <time datetime="{{ $log->created_at?->toIso8601String() }}">
                                    {{ $log->created_at?->format('d M Y H:i') }}
                                </time>
                            </div>
                        </div>
                    </div>
                </div>
            </li>
        @empty
            <li class="text-xs text-slate-400">Belum ada riwayat audit.</li>
        @endforelse
    </ul>
</div>
