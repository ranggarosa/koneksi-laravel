@props(['status'])

@php
    $config = match ($status) {
        'draft' => ['class' => 'bg-slate-100 text-slate-700 ring-slate-600/20', 'label' => 'Draft'],
        'in_review' => ['class' => 'bg-amber-50 text-amber-700 ring-amber-600/20', 'label' => 'Dalam Peninjauan'],
        'awaiting_wet_signature' => ['class' => 'bg-indigo-50 text-indigo-700 ring-indigo-600/20', 'label' => 'Menunggu TTD Basah'],
        'pending_upload' => ['class' => 'bg-sky-50 text-sky-700 ring-sky-600/20', 'label' => 'Menunggu Unggah'],
        'approved' => ['class' => 'bg-emerald-50 text-emerald-700 ring-emerald-600/20', 'label' => 'Disahkan'],
        'rejected' => ['class' => 'bg-rose-50 text-rose-700 ring-rose-600/20', 'label' => 'Ditolak'],
        'cancelled' => ['class' => 'bg-gray-100 text-gray-700 ring-gray-600/20', 'label' => 'Dibatalkan'],
        'expired' => ['class' => 'bg-orange-50 text-orange-700 ring-orange-600/20', 'label' => 'Kedaluwarsa'],
        'voided' => ['class' => 'bg-purple-50 text-purple-700 ring-purple-600/20', 'label' => 'Void'],
        default => ['class' => 'bg-slate-100 text-slate-700 ring-slate-600/20', 'label' => ucfirst($status ?? '-')],
    };
@endphp

<span class="inline-flex items-center rounded-md px-2 py-1 text-xs font-medium ring-1 ring-inset {{ $config['class'] }}">
    {{ $config['label'] }}
</span>
