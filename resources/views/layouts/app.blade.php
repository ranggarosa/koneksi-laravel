<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full bg-slate-50">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ $title ?? 'Koneksi Naskah Dinas' }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Styles / Scripts -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="h-full font-sans antialiased text-slate-800">
    <div class="min-h-full flex flex-col">
        {{-- Quick Switch Bar for Local Dev (Constitution Principle II & US5) --}}
        @if (app()->isLocal())
            @if (View::exists('components.quick-switch-bar'))
                <x-quick-switch-bar />
            @endif
        @endif

        {{-- Top Navigation Bar --}}
        <header class="bg-white border-b border-slate-200 sticky top-0 z-30">
            <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
                <div class="flex justify-between h-16">
                    <div class="flex">
                        <div class="flex-shrink-0 flex items-center gap-3">
                            <div class="w-9 h-9 rounded-lg bg-blue-600 flex items-center justify-center text-white shadow-sm">
                                <x-icons.document-text class="w-5 h-5" />
                            </div>
                            <span class="font-bold text-lg text-slate-900 tracking-tight">KONEKSI</span>
                        </div>
                        <nav class="hidden sm:ml-8 sm:flex sm:space-x-4 items-center">
                            <a href="{{ route('dashboard') }}" class="px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('dashboard') ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                                Dashboard
                            </a>
                            <a href="{{ route('letters.index') }}" class="px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('letters.*') && !request()->routeIs('letters.create') ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                                Naskah Dinas
                            </a>
                            @if (Auth::user()?->isDrafter() || Auth::user()?->isAdmin())
                                <a href="{{ route('letters.create') }}" class="px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('letters.create') ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                                    Buat Draf
                                </a>
                                <a href="{{ route('take-number.create') }}" class="px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('take-number.*') ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                                    Ambil Nomor
                                </a>
                            @endif
                            <a href="{{ route('agenda.index') }}" class="px-3 py-2 rounded-md text-sm font-medium {{ request()->routeIs('agenda.*') ? 'bg-slate-100 text-blue-600' : 'text-slate-600 hover:text-slate-900 hover:bg-slate-50' }}">
                                Buku Agenda
                            </a>
                        </nav>
                    </div>

                    <div class="flex items-center gap-4">
                        @auth
                            <div class="flex items-center gap-3">
                                <div class="text-right hidden sm:block">
                                    <div class="text-sm font-semibold text-slate-800">{{ Auth::user()->name }}</div>
                                    <div class="text-xs text-slate-500 uppercase tracking-wider font-medium">{{ Auth::user()->role }}</div>
                                </div>
                                <form method="POST" action="{{ route('logout') }}" class="inline">
                                    @csrf
                                    <button type="submit" class="p-2 text-slate-400 hover:text-slate-600 rounded-lg hover:bg-slate-100 transition-colors" title="Keluar">
                                        <x-icons.logout class="w-5 h-5" />
                                    </button>
                                </form>
                            </div>
                        @else
                            <a href="{{ route('login') }}" class="text-sm font-medium text-blue-600 hover:text-blue-500">Masuk</a>
                        @endauth
                    </div>
                </div>
            </div>
        </header>

        {{-- Page Flash Notifications --}}
        <div class="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mt-4 w-full">
            @if (session('status'))
                <div class="rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-600/20 mb-4">
                    <div class="flex items-center">
                        <x-icons.check class="h-5 w-5 text-emerald-600 mr-2 flex-shrink-0" />
                        <p class="text-sm font-medium text-emerald-800">{{ session('status') }}</p>
                    </div>
                </div>
            @endif

            @if (session('error'))
                <div class="rounded-md bg-rose-50 p-4 ring-1 ring-rose-600/20 mb-4">
                    <div class="flex items-center">
                        <x-icons.x-circle class="h-5 w-5 text-rose-600 mr-2 flex-shrink-0" />
                        <p class="text-sm font-medium text-rose-800">{{ session('error') }}</p>
                    </div>
                </div>
            @endif

            @if ($errors->any())
                <div class="rounded-md bg-rose-50 p-4 ring-1 ring-rose-600/20 mb-4">
                    <div class="flex items-start">
                        <x-icons.exclamation class="h-5 w-5 text-rose-600 mr-2 flex-shrink-0 mt-0.5" />
                        <div class="text-sm text-rose-800">
                            <p class="font-medium">Terdapat kesalahan pada isian formulir:</p>
                            <ul class="list-disc list-inside mt-1 text-xs space-y-1">
                                @foreach ($errors->all() as $error)
                                    <li>{{ $error }}</li>
                                @endforeach
                            </ul>
                        </div>
                    </div>
                </div>
            @endif
        </div>

        {{-- Main Page Body --}}
        <main class="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-6">
            {{ $slot ?? '' }}
            @yield('content')
        </main>

        {{-- Footer --}}
        <footer class="bg-white border-t border-slate-200 mt-auto">
            <div class="max-w-7xl mx-auto py-4 px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-400">
                Koneksi Naskah Dinas &bull; Versi 2.1.1 (Laravel 13.x) &bull; Ephemeral Cloud Safe
            </div>
        </footer>
    </div>
</body>
</html>
