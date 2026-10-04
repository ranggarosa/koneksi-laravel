# Koneksi Naskah Dinas & Penomoran Surat (Laravel 13 Core)

Sistem Pengelolaan Naskah Dinas & Otomatisasi Administrasi Penomoran Surat Terpadu berbasis **Laravel 13.x** dan **PostgreSQL 16**. Menggantikan sistem warisan Google Apps Script dengan arsitektur modern berstandar enterprise yang aman, atomik, dan siap untuk deployment *ephemeral cloud* (Heroku / Cloudflare R2).

---

## 🚀 Fitur Utama & Prinsip Arsitektur

Sistem dirancang dan dikembangkan mengacu pada **Konstitusi Sistem Naskah Dinas v2.1.1** ([`.specify/memory/constitution.md`](.specify/memory/constitution.md)):

1. **Penomoran Atomik Bebas Balapan (*Race-Condition Immune*)**:
   - Penomoran surat berformat `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`.
   - Partisi penghitung independen per `(template_code, month, year)` dikunci menggunakan transaksi database PostgreSQL `lockForUpdate`.
   - Menolak keras penanggalan mundur (*backdating*) dan menyediakan pool daur ulang FIFO (*Recycled Number Pool*) untuk nomor yang ditolak atau kedaluwarsa.

2. **Alur Persetujuan Berjenjang & Pemisahan Wewenang (*Separation of Duties*)**:
   - Persetujuan strictly sequential: tahap $n$ hanya dapat diproses setelah tahap $1 \dots n-1$ disetujui.
   - Penolakan (*rejection*) bersifat terminal, mewajibkan alasan/catatan tertulis, dan mengembalikan nomor surat ke pool daur ulang.
   - Pembuat draf (*Drafter*) secara tegas dilarang memilih dirinya sendiri sebagai peninjau atau penandatangan.

3. **Finalisasi Pengesahan Ganda**:
   - **Tanda Tangan Digital**: Kompilasi dokumen PDF resmi secara otomatis via `Dompdf` dengan antrean latar belakang (`GenerateLetterPdfJob` implementing `ShouldQueue`).
   - **Tanda Tangan Basah**: Berkas fisik dicetak, ditandatangani basah, dan hasil pindai (*scan*) PDF diverifikasi dan diunggah kembali ke sistem.

4. **Reservasi Nomor Eksternal (*Ambil Nomor*)**:
   - Pengambilan nomor naskah fisik eksternal (misal: PKS) dengan persetujuan 1 tahap pejabat penandatangan.
   - Jendela rekonsiliasi unggah berkas selama 7 hari kalender. Naskah yang melewati batas waktu kedaluwarsa otomatis melalui scheduler harian (`letters:check-expired`).

5. **Jejak Audit Kekal (*Immutable Append-Only Audit Trail*)**:
   - Seluruh mutasi status dan aksi pengguna tercatat dalam tabel `audit_logs`.
   - Model Eloquent secara mutlak melarang pembaruan (`update`) dan penghapusan (`delete`), serta melarang *hard-delete* pada naskah yang telah terbit.

6. **Larangan Penggunaan Emoji & Emotikon (Prinsip VI)**:
   - Antarmuka pengguna (*Blade views*), komponen notifikasi, dan pesan sistem bersih dari emoji/piktogram visual, menggunakan tipografi profesional dan ikon inline SVG (Heroicons).

7. **Perlindungan Dyno Efana (*Ephemeral Cloud Storage Protection*)**:
   - Menggunakan abstraksi *Flysystem* ganda: disk lokal untuk pengembangan dan Cloudflare R2 / AWS S3 presigned URLs untuk lingkungan produksi.

---

## 🛠️ Persyaratan Lingkungan (*Prerequisites*)

- **PHP**: `^8.3`
- **Composer**: `^2.7`
- **Node.js**: `^20.0` atau `^24.0`
- **Database**: PostgreSQL 16 (atau Docker Desktop / Laravel Sail)

---

## 💻 Panduan Instalasi & Pengembangan Lokal

### Opsi A: Menggunakan Docker & Laravel Sail (Direkomendasikan)

Jika Docker Desktop terpasang di komputer Anda:

```bash
# 1. Salin environment konfigurasi
cp .env.example .env

# 2. Jalankan container stack (PHP 8.3 & PostgreSQL 16)
./vendor/bin/sail up -d

# 3. Jalankan migrasi dan seeding data contoh
./vendor/bin/sail artisan migrate:fresh --seed

# 4. Pasang dependensi frontend dan kompilasi aset
npm install
npm run dev
```

Aplikasi dapat diakses di: `http://localhost:80` atau `http://localhost`.

### Opsi B: Menggunakan PHP & PostgreSQL Lokal (Homebrew di macOS)

Jika menggunakan PHP dan PostgreSQL yang terpasang langsung pada host:

```bash
# 1. Konfigurasi environment
cp .env.example .env
# Sesuaikan DB_HOST, DB_DATABASE, DB_USERNAME, DB_PASSWORD pada berkas .env

# 2. Pasang dependensi PHP & generate app key
composer install
php artisan key:generate

# 3. Jalankan migrasi database dan seed akun contoh
php artisan migrate:fresh --seed

# 4. Jalankan antrean background worker
php artisan queue:work

# 5. Jalankan development server dan Vite
php artisan serve
npm run dev
```

---

## 👥 Akun Contoh Pengujian (*Seeded Demo Users*)

Database seeder telah memuat 4 akun contoh terdaftar dengan kata sandi universal `password`:

| Peran (*Role*) | Alamat Surel | Kata Sandi | Deskripsi Akses |
|---|---|---|---|
| **Administrator** | `admin@koneksi.local` | `password` | Akses sistem menyeluruh, audit log, dan master template |
| **Drafter** | `drafter@koneksi.local` | `password` | Membuat draf naskah dinas, reservasi Ambil Nomor, unggah scan |
| **Reviewer** | `reviewer@koneksi.local` | `password` | Meninjau naskah tahap 1, verifikasi materi, beri catatan |
| **Approver** | `approver@koneksi.local` | `password` | Menandatangani naskah (digital/basah), persetujuan Ambil Nomor |

> **Fitur Quick Switch Bar**: Pada lingkungan lokal (`APP_ENV=local`), bilah navigasi atas menyediakan tombol 1-klik untuk beralih instan antar-peran tanpa perlu logout/login ulang.

---

## 🧪 Menjalankan Pengujian Otomatis (*Test Suite*)

Seluruh fitur inti diuji secara komprehensif melalui PHPUnit / Pest:

```bash
# Menjalankan seluruh rangkaian test otomatis
php artisan test

# Menjalankan test per modul fitur
php artisan test tests/Unit/NumberingServiceTest.php
php artisan test tests/Feature/LetterDraftTest.php
php artisan test tests/Feature/ApprovalWorkflowTest.php
php artisan test tests/Feature/DocumentFinalizationTest.php
php artisan test tests/Feature/TakeNumberTest.php
php artisan test tests/Feature/RealLetterCasesTest.php
php artisan test tests/Feature/AuditLogTest.php

# Memeriksa standar kerapian kode (Laravel Pint)
./vendor/bin/pint --test
```

---

## ⏰ Perintah Terjadwal (*Scheduled Commands*)

### Pengecekan Kedaluwarsa Reservasi Nomor Eksternal (Ambil Nomor)

```bash
php artisan letters:check-expired
```

Perintah ini secara otomatis mendeteksi naskah eksternal yang telah melewati batas 7 hari tanpa unggahan berkas hasil pindai fisik, mengalihkan statusnya menjadi `expired`, dan mengembalikan nomor urut ke *recycled number pool*.

---

## ☁️ Deployment Produksi ke Heroku

Repositori ini telah dilengkapi dengan berkas [`Procfile`](Procfile) resmi:

```text
web: vendor/bin/heroku-php-apache2 public/
worker: php artisan queue:work --timeout=60 --tries=3
release: php artisan migrate --force
```

### Variabel Lingkungan Utama pada Heroku:

- `APP_ENV`: `production`
- `APP_KEY`: *(Dihasilkan dari `php artisan key:generate`)*
- `DATABASE_URL`: *(Otomatis terkonfigurasi saat memasang add-on Heroku Postgres)*
- `FILESYSTEM_DISK`: `r2`
- `R2_ACCESS_KEY_ID`: *(Kredensial Cloudflare R2)*
- `R2_SECRET_ACCESS_KEY`: *(Kredensial Cloudflare R2)*
- `R2_BUCKET`: `koneksi-documents`
- `R2_URL`: `https://<account-id>.r2.cloudflarestorage.com`
- `QUEUE_CONNECTION`: `database`
