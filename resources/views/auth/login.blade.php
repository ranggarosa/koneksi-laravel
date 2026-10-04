<x-layouts.guest>
    <form class="space-y-6" action="{{ route('login') }}" method="POST">
        @csrf

        <div>
            <label for="email" class="block text-sm font-medium leading-6 text-slate-900">Alamat Surel</label>
            <div class="mt-2">
                <input id="email" name="email" type="email" autocomplete="email" required value="{{ old('email', 'drafter@koneksi.local') }}" class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
            </div>
            @error('email')
                <p class="mt-1 text-xs text-rose-600 font-medium">{{ $message }}</p>
            @enderror
        </div>

        <div>
            <label for="password" class="block text-sm font-medium leading-6 text-slate-900">Kata Sandi</label>
            <div class="mt-2">
                <input id="password" name="password" type="password" autocomplete="current-password" required value="password" class="block w-full rounded-md border-0 py-2 text-slate-900 shadow-sm ring-1 ring-inset ring-slate-300 placeholder:text-slate-400 focus:ring-2 focus:ring-inset focus:ring-blue-600 sm:text-sm sm:leading-6">
            </div>
            @error('password')
                <p class="mt-1 text-xs text-rose-600 font-medium">{{ $message }}</p>
            @enderror
        </div>

        <div class="flex items-center justify-between">
            <div class="flex items-center">
                <input id="remember" name="remember" type="checkbox" class="h-4 w-4 rounded border-slate-300 text-blue-600 focus:ring-blue-600">
                <label for="remember" class="ml-2 block text-xs text-slate-700">Ingat sesi saya</label>
            </div>
            <div class="text-xs">
                <a href="{{ route('agenda.index') }}" class="font-medium text-blue-600 hover:text-blue-500">Lihat Buku Agenda Publik</a>
            </div>
        </div>

        <div>
            <button type="submit" class="flex w-full justify-center rounded-md bg-blue-600 px-3 py-2.5 text-sm font-semibold leading-6 text-white shadow-sm hover:bg-blue-500 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600">
                Masuk ke Sistem
            </button>
        </div>
    </form>

    {{-- Sample Credential Shortcut Sheet (Constitution Principle II) --}}
    <div class="mt-8 border-t border-slate-200 pt-6">
        <h4 class="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-3 text-center">Akun Contoh Pengujian (Demo)</h4>
        <div class="grid grid-cols-2 gap-2 text-xs">
            <button type="button" onclick="fillCredential('admin@koneksi.local', 'password')" class="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 transition-colors">
                <div class="font-bold text-slate-800">Admin</div>
                <div class="text-slate-500 text-[10px]">admin@koneksi.local</div>
            </button>
            <button type="button" onclick="fillCredential('drafter@koneksi.local', 'password')" class="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 transition-colors">
                <div class="font-bold text-slate-800">Drafter</div>
                <div class="text-slate-500 text-[10px]">drafter@koneksi.local</div>
            </button>
            <button type="button" onclick="fillCredential('reviewer@koneksi.local', 'password')" class="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 transition-colors">
                <div class="font-bold text-slate-800">Reviewer</div>
                <div class="text-slate-500 text-[10px]">reviewer@koneksi.local</div>
            </button>
            <button type="button" onclick="fillCredential('approver@koneksi.local', 'password')" class="p-2 border border-slate-200 rounded-lg text-left hover:bg-slate-50 transition-colors">
                <div class="font-bold text-slate-800">Approver</div>
                <div class="text-slate-500 text-[10px]">approver@koneksi.local</div>
            </button>
        </div>
    </div>

    <script>
        function fillCredential(email, password) {
            document.getElementById('email').value = email;
            document.getElementById('password').value = password;
        }
    </script>
</x-layouts.guest>
