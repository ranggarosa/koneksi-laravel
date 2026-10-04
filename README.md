# Sistem Manajemen Surat Menyurat (Koneksi)

Aplikasi manajemen dan otomatisasi surat-menyurat resmi lingkungan HR (surat tugas, surat peringatan, dll) dari pembuatan draf, alur persetujuan berjenjang (multi-tier review & approval), hingga finalisasi dokumen bertanda tangan digital atau basah.

---

## 📌 Status Proyek & Roadmap

Proyek saat ini berada pada **Fase 0** (Rapid Prototype):

| Fase | Deskripsi & Target Stack | Status |
|---|---|---|
| **Fase 0** | **Prototipe Google Workspace + Google Apps Script** (HTML Service Web App, Sheets sebagai DB, Drive untuk berkas) | **Aktif / Berjalan** |
| **Fase 1** | MVP Serverless: migrasi ke Firebase (Firestore, Auth, Cloud Functions, Hosting) | Rencana Berikutnya |
| **Fase 2** | Migrasi DB ke GCP Cloud SQL (PostgreSQL) + Prisma/Drizzle ORM + backend API terpisah | Rencana |
| **Fase 3** | Modernisasi Frontend ke Next.js (App Router, SSR) + Firebase Custom Claims (RBAC token-level) | Rencana |
| **Fase 4** | Skalabilitas: GCP Cloud Tasks (antrean asinkron) + WhatsApp Gateway Notification | Rencana |

---

## 🏛️ Arsitektur & Prinsip Utama

Sistem diatur oleh konstitusi proyek resmi di [`.specify/memory/constitution.md`](.specify/memory/constitution.md):

1. **Strict Layered Architecture (Unidirectional Flow)**:
   `View (.html)` → `Controller (.gs)` → `Service (.gs)` → `Repository (.gs)` → External Services (`SpreadsheetApp`, `DriveApp`, dsb.).
   - *View*: Khusus antarmuka dan interaksi pengguna.
   - *Controller*: Mediasi UI ↔ Service, state management, guard autentikasi server.
   - *Service*: Seluruh logika bisnis (validasi, penomoran atomik, alur persetujuan).
   - *Repository*: Satu-satunya layer yang berinteraksi dengan Google Sheets, Drive, dan Docs.
2. **Server-Side Single Source of Truth**:
   - Seluruh akses divalidasi via `authService.getCurrentUser()` mencocokkan whitelist email aktif di sheet `Users`.
   - Urutan approval strictly sequential (tahap $n$ hanya bisa diproses bila $1 \dots n-1$ telah disetujui).
   - Rejection menghentikan alur seketika dan mengunci status menjadi `Rejected`.
3. **Integritas Dokumen & Penomoran Atomik**:
   - Penomoran format `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}` menggunakan `LockService` anti race condition.
   - Pilihan finalisasi ganda oleh Approver terakhir: **Digital Signature** (otomatis inject tanda tangan & finalisasi PDF) vs **Wet Signature** (draf unsigned di Drive, diverifikasi via revisi berkas).
4. **Keamanan & Auditability**:
   - Sanitasi string untuk mencegah Google Sheets Formula Injection (`=`, `+`, `-`, `@`).
   - Akses Drive least-privilege (tidak ada folder publik).
   - Seluruh aksi tercatat permanen di sheet `ApprovalLog`.
5. **Cakupan Pengujian Kritis 100%**:
   - Pengujian terstruktur via `*.test.gs` dengan *dependency injection* pada service layer untuk isolasi penuh in-memory.

---

## 📁 Struktur Direktori

Kode sumber aplikasi disimpan secara terstruktur di dalam direktori `src/` yang terintegrasi dengan Google Clasp:

```text
koneksi-speckit/
├── src/                          # Direktori sumber aplikasi (Google Apps Script)
│   ├── Code.gs                   # Entry point: doGet(), include() helper, setupDatabase()
│   ├── Constants.gs              # Enum status, role, sheet names, Script Properties keys
│   ├── Utils.gs                  # Helper umum (format tanggal, angka romawi, sanitasi path, UUID)
│   │
│   ├── auth.controller.gs        # Controller: sesi aktif & verifikasi whitelist
│   ├── letter.controller.gs      # Controller: draf, approval, reject, upload scan
│   ├── admin.controller.gs       # Controller: manajemen user & upload tanda tangan
│   │
│   ├── auth.service.gs           # Service: logika autentikasi & validasi role
│   ├── letter.service.gs         # Service: alur persetujuan, penolakan, hak akses privasi, ambil nomor
│   ├── numbering.service.gs      # Service: penomoran atomik LockService & antrean daur ulang
│   ├── document.service.gs       # Service: injeksi Docs, export PDF, Drive.Files.update
│   ├── notification.service.gs   # Service: notifikasi email terformat via MailApp
│   ├── schedule.service.gs       # Service: audit harian rekonsiliasi, eskalasi H-2, auto-expire H+7
│   │
│   ├── user.repository.gs        # Repository: CRUD sheet Users
│   ├── letter.repository.gs      # Repository: CRUD sheet Letters (ekstensi naskah eksternal)
│   ├── counter.repository.gs     # Repository: CRUD sheet Counters & cross-month recycled numbers pool
│   ├── sheet.repository.gs       # Repository: Wrapper SpreadsheetApp & formula escaping
│   │
│   ├── TestUtils.gs              # Helper pengujian assertions & global test runner
│   ├── numbering.test.gs         # Unit test penomoran atomik & recycled pool
│   ├── letter.test.gs            # Unit test alur persetujuan, penolakan & percabangan
│   ├── auth.test.gs              # Unit test whitelist & penolakan sesi
│   ├── document.test.gs          # Unit test verifikasi revisi berkas basah
│   ├── take-number.test.gs       # Unit test reservasi nomor eksternal & rekonsiliasi (12 tests)
│   │
│   ├── Index.html                # Shell layout & client-side router
│   ├── Login.html                # Tampilan penolakan akses non-whitelist
│   ├── Dashboard.html            # Tampilan tab: Perlu Tindakan, Draf Saya, Arsip Terbuka & Buku Agenda
│   ├── CreateLetter.html         # Formulir draf internal & form Ambil Nomor (eksternal)
│   ├── LetterDetail.html         # Detail naskah, timeline audit, approve/reject, form scan, pembatalan
│   ├── Settings.html             # Panel Admin (Kelola Pengguna) & Approver (Tanda Tangan)
│   ├── Stylesheet.html           # Definisi style bersama (UI styling)
│   ├── JavaScript.html           # Client-side controller & pemanggilan google.script.run
│   │
│   └── appsscript.json           # Manifest Apps Script (V8 runtime, scopes)
│
├── specs/                        # Dokumentasi spesifikasi fitur (Spec Kit)
│   ├── 001-manajemen-surat/      # Spesifikasi, rencana, tasks, dan contracts internal letters
│   └── 002-ambil-nomor-surat/    # Spesifikasi, rencana, tasks, dan contracts Ambil Nomor
├── .specify/                     # Tata kelola & memori Spec Kit (constitution.md)
├── .agents/                      # Skills & workflows otomatisasi agent
├── docs/                         # Arsip dokumentasi proyek
│
├── .clasp.json                   # Konfigurasi Google Clasp (rootDir: ./src)
├── .claspignore                  # Berkas yang diabaikan saat push clasp
├── .gitignore                    # Konfigurasi ignore file Git
├── README.md                     # Dokumentasi utama repositori
└── VERSION                       # Sumber kebenaran versi proyek (v0.3.0)
```

---

## 🛠️ Alur Pengembangan & Konvensi

### 1. Konfigurasi & Sinkronisasi dengan Google Clasp

Aplikasi menggunakan [Google Clasp](https://github.com/google/clasp) untuk sinkronisasi kode lokal dengan proyek Google Apps Script:

1. **Instalasi Clasp**:
   ```bash
   npm install -g @google/clasp
   ```

2. **Login ke Akun Google**:
   ```bash
   clasp login
   ```

3. **Tautkan ke Script ID**:
   Salin template [`.env.example`](.env.example) ke `.env` lokal jika diperlukan, lalu masukkan Script ID Apps Script Anda ke properti `scriptId` pada file [`.clasp.json`](.clasp.json):
   ```json
   {
     "scriptId": "ID_SCRIPT_ANDA_DI_SINI",
     "rootDir": "./src"
   }
   ```
   *Atau buat proyek baru langsung melalui Clasp:*
   ```bash
   clasp create --title "Koneksi - Manajemen Surat" --type webapp --rootDir ./src
   ```

4. **Kirim Kode ke Cloud**:
   ```bash
   clasp push
   ```

5. **Buka Proyek di Browser**:
   ```bash
   clasp open
   ```

---

### 2. Konfigurasi Google Apps Script (Pasca `clasp push`)

Setelah kode berhasil terkirim via `clasp push`, lakukan langkah konfigurasi berikut di Google Apps Script Editor:

#### Langkah 1: Verifikasi Layanan Lanjutan (*Advanced Services: Drive API v2*)
Aplikasi membutuhkan Google Drive API v2 untuk mendukung pembaruan revisi naskah basah (`Drive.Files.update`):
1. Buka Apps Script Editor di peramban.
2. Periksa panel sebelah kiri pada bagian **Services** (ikon `+`).
3. Pastikan **Drive API** sudah terdaftar dengan identifier `Drive` dan versi `v2`.
   - *Jika belum ada*: Klik ikon **`+`** di samping **Services** > pilih **Drive API** > versi **v2** > identifier: `Drive` > klik **Add**.

#### Langkah 2: Buat Google Spreadsheet & Folder Google Drive
1. **Google Spreadsheet (Database)**:
   - Buat sebuah Google Spreadsheet baru di Drive Anda (misal nama: `Koneksi - AppDatabase`).
   - Salin **Spreadsheet ID** dari URL:
     ```text
     https://docs.google.com/spreadsheets/d/{SPREADSHEET_ID}/edit
     ```
2. **Folder Google Drive**:
   - Buat folder utama (root) di Drive Anda (misal: `Koneksi - Surat Menyurat`).
   - Di dalam folder tersebut, buat 3 subfolder:
     - `Templates` *(folder penyimpanan master template Google Docs SP1, ST, SK)*
     - `Signatures` *(folder penyimpanan gambar PNG tanda tangan pejabat/approver)*
     - `Letters` *(folder penyimpanan arsip draf & PDF final)*
   - Salin masing-masing **Folder ID** dari URL:
     ```text
     https://drive.google.com/drive/folders/{FOLDER_ID}
     ```

#### Langkah 3: Konfigurasi Script Properties (Environment Variables)
1. Di Apps Script Editor, buka menu **Project Settings** (ikon gerigi ⚙️ di bilah kiri).
2. Gulir ke bawah ke bagian **Script Properties**.
3. Klik **Add script property** (atau *Edit script properties*) dan tambahkan 5 variabel berikut (sesuai template [`.env.example`](.env.example)):

| Property Name | Nilai (Value) | Keterangan |
| :--- | :--- | :--- |
| `SPREADSHEET_ID` | `{SPREADSHEET_ID}` | ID Google Spreadsheet database utama |
| `ROOT_FOLDER_ID` | `{ROOT_FOLDER_ID}` | ID Folder utama sistem di Drive |
| `TEMPLATES_FOLDER_ID` | `{TEMPLATES_FOLDER_ID}` | ID Subfolder master template |
| `SIGNATURES_FOLDER_ID` | `{SIGNATURES_FOLDER_ID}` | ID Subfolder tanda tangan referensi |
| `LETTERS_FOLDER_ID` | `{LETTERS_FOLDER_ID}` | ID Subfolder arsip surat |

4. Klik **Save script properties**.

#### Langkah 4: Inisialisasi Database (`setupDatabase`) & Otorisasi
1. Kembali ke tampilan **Editor** (ikon `< >` di bilah kiri).
2. Pada dropdown fungsi di toolbar atas editor, pilih fungsi: **`setupDatabase`**.
3. Klik tombol **Run**.
4. Saat dialog **Authorization Required** muncul:
   - Klik **Review Permissions** > pilih akun Google Anda.
   - Klik **Advanced** > klik **Go to Koneksi (unsafe)** > klik **Allow**.
5. Setelah selesai dieksekusi, buka Google Spreadsheet Anda. Sistem telah otomatis membuat 4 sheet tabel beserta headernya:
   - `Users`
   - `Letters`
   - `Counters`
   - `ApprovalLog`

#### Langkah 5: Tambahkan Pengguna Awal (Seed Admin / Whitelist)
Karena sistem membatasi akses hanya untuk akun dalam whitelist (`Users` sheet):
1. Buka sheet **`Users`** pada Spreadsheet Anda.
2. Tambahkan satu baris data untuk akun email Anda sendiri sebagai **`admin`**:

| userId | email | name | role | isActive | signatureDriveFileId | createdAt | updatedAt |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| `USR-001` | *email-anda@domain.com* | *Nama Lengkap Anda* | `admin` | `TRUE` | *(kosongkan dulu)* | `2026-09-27` | `2026-09-27` |

*(Opsional: Anda juga dapat menambahkan akun lain dengan role `drafter`, `reviewer`, atau `approver` untuk uji coba alur).*

#### Langkah 6: Jalankan Automated Unit Tests (Verifikasi)
Untuk memastikan seluruh logika bisnis berjalan normal di runtime Google Apps Script:
1. Pada toolbar atas editor, pilih fungsi: **`runAllTests`**.
2. Klik **Run**.
3. Pastikan Execution Log menampilkan seluruh suite berhasil:
   ```text
   ======================================================
   TEST SUMMARY: 5/5 passed (0 failed)
   ======================================================
   ✓ NumberingService Test Suite PASSED
   ✓ LetterService Test Suite PASSED
   ✓ DocumentService Test Suite PASSED
   ✓ AuthService Test Suite PASSED
   ✓ TakeNumber Test Suite PASSED
   ```

#### Langkah 7: Deploy sebagai Web App
1. Klik tombol **Deploy** di pojok kanan atas > **New deployment**.
2. Klik ikon gerigi ⚙️ di samping *Select type* > pilih **Web app**.
3. Atur konfigurasi deployment:
   - **Description**: `Koneksi Web App v0.3.0`
   - **Execute as**: `User accessing the web app`
   - **Who has access**: `Anyone` (atau sesuaikan dengan kebutuhan domain Google Workspace Anda)
4. Klik **Deploy**.
5. Salin URL **Web app** yang diberikan (berakhiran `/exec`) dan buka di peramban untuk mulai menggunakan aplikasi!

---

### 3. Pengujian Unit Otomatis

Seluruh pengujian unit inti dapat dijalankan langsung tanpa menyentuh Google Sheets / Drive produksi:

- **Melalui Apps Script Editor**: Pilih fungsi `runAllTests` di toolbar atas dan klik **Run**.
- **Melalui Clasp di Terminal**:
  ```bash
  clasp run runAllTests
  ```

---

### 3. Versioning & Konvensi Commit

- **Versioning**: Proyek mengikuti **Semantic Versioning 2.0.0** (`vMAJOR.MINOR.PATCH`). Berkas [`VERSION`](VERSION) di root repositori adalah **sumber kebenaran tunggal** versi proyek (saat ini `v0.3.0`).
- **Pesan Commit**: Mengikuti standar **Conventional Commits v1.0.0** dengan footer versi wajib:
  ```text
  <tipe>(<scope opsional>): <deskripsi singkat imperative>

  [body opsional]

  Version: vX.Y.Z
  ```
  Tipe: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.  
  Scope: `auth`, `letter`, `numbering`, `document`, `notification`, `admin`, `sheet`.
