@if (app()->isLocal())
    <div class="bg-slate-900 text-white text-xs px-4 py-2 border-b border-slate-700">
        <div class="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-2">
            <div class="flex items-center gap-2">
                <span class="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
                <span class="font-semibold uppercase tracking-wider text-[11px] text-slate-300">Quick Switch User:</span>
                <span class="text-slate-400">
                    Sesi Aktif: <strong class="text-white">{{ Auth::user()?->name ?? 'Tamu' }}</strong>
                    @if (Auth::check())
                        <span class="ml-1 uppercase text-[10px] bg-slate-800 px-1.5 py-0.5 rounded text-blue-400 font-mono">
                            {{ Auth::user()->role }}
                        </span>
                    @endif
                </span>
            </div>

            <div class="flex items-center gap-1.5">
                @foreach (['drafter' => 'Konseptor (Drafter)', 'reviewer' => 'Peninjau (Reviewer)', 'approver' => 'Penandatangan (Approver)', 'admin' => 'Admin'] as $role => $label)
                    <form method="POST" action="{{ route('dev.switch-user', ['role' => $role]) }}" class="inline">
                        @csrf
                        <button type="submit" class="px-2.5 py-1 rounded text-[11px] font-medium transition-colors {{ Auth::user()?->role === $role ? 'bg-blue-600 text-white shadow-sm ring-1 ring-blue-400' : 'bg-slate-800 text-slate-300 hover:bg-slate-700 hover:text-white' }}">
                            {{ $label }}
                        </button>
                    </form>
                @endforeach
            </div>
        </div>
    </div>
@endif
