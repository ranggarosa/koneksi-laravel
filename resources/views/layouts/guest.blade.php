<!DOCTYPE html>
<html lang="{{ str_replace('_', '-', app()->getLocale()) }}" class="h-full bg-slate-50">
<head>
    <meta charset="utf-8">
    <meta name="viewport" content="width=device-width, initial-scale=1">
    <meta name="csrf-token" content="{{ csrf_token() }}">

    <title>{{ config('app.name', 'Koneksi Naskah Dinas') }}</title>

    <!-- Fonts -->
    <link rel="preconnect" href="https://fonts.googleapis.com">
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
    <link href="https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap" rel="stylesheet">

    <!-- Styles / Scripts -->
    @vite(['resources/css/app.css', 'resources/js/app.js'])
</head>
<body class="h-full font-sans antialiased text-slate-800">
    <div class="min-h-full flex flex-col justify-center py-12 sm:px-6 lg:px-8">
        <div class="sm:mx-auto sm:w-full sm:max-w-md text-center">
            <div class="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-blue-600 text-white shadow-md mb-4">
                <x-icons.document-text class="w-7 h-7" />
            </div>
            <h2 class="text-2xl font-bold tracking-tight text-slate-900">KONEKSI</h2>
            <p class="mt-1 text-sm text-slate-500">Sistem Pengelolaan Naskah Dinas & Penomoran Surat</p>
        </div>

        <div class="mt-8 sm:mx-auto sm:w-full sm:max-w-md">
            {{-- Flash Messages --}}
            @if (session('status'))
                <div class="mb-4 rounded-md bg-emerald-50 p-4 ring-1 ring-emerald-600/20">
                    <div class="flex items-center">
                        <x-icons.check class="h-5 w-5 text-emerald-600 mr-2 flex-shrink-0" />
                        <p class="text-sm font-medium text-emerald-800">{{ session('status') }}</p>
                    </div>
                </div>
            @endif

            @if (session('error'))
                <div class="mb-4 rounded-md bg-rose-50 p-4 ring-1 ring-rose-600/20">
                    <div class="flex items-center">
                        <x-icons.x-circle class="h-5 w-5 text-rose-600 mr-2 flex-shrink-0" />
                        <p class="text-sm font-medium text-rose-800">{{ session('error') }}</p>
                    </div>
                </div>
            @endif

            <div class="bg-white py-8 px-6 shadow-sm ring-1 ring-slate-900/5 sm:rounded-xl sm:px-10">
                {{ $slot }}
            </div>
        </div>
    </div>
</body>
</html>
