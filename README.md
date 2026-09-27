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
│   ├── letter.service.gs         # Service: alur persetujuan, penolakan, hak akses privasi
│   ├── numbering.service.gs      # Service: penomoran atomik LockService & antrean daur ulang
│   ├── document.service.gs       # Service: injeksi Docs, export PDF, Drive.Files.update
│   ├── notification.service.gs   # Service: notifikasi email terformat via MailApp
│   │
│   ├── user.repository.gs        # Repository: CRUD sheet Users
│   ├── letter.repository.gs      # Repository: CRUD sheet Letters
│   ├── counter.repository.gs     # Repository: CRUD sheet Counters & recycled numbers pool
│   ├── sheet.repository.gs       # Repository: Wrapper SpreadsheetApp & formula escaping
│   │
│   ├── TestUtils.gs              # Helper pengujian assertions & global test runner
│   ├── numbering.test.gs         # Unit test penomoran atomik & recycled pool
│   ├── letter.test.gs            # Unit test alur persetujuan, penolakan & percabangan
│   ├── auth.test.gs              # Unit test whitelist & penolakan sesi
│   ├── document.test.gs          # Unit test verifikasi revisi berkas basah
│   │
│   ├── Index.html                # Shell layout & client-side router
│   ├── Login.html                # Tampilan penolakan akses non-whitelist
│   ├── Dashboard.html            # Tampilan tab: Perlu Tindakan, Draf Saya, Arsip Terbuka
│   ├── CreateLetter.html         # Formulir draf dinamis & seleksi reviewer/approver
│   ├── LetterDetail.html         # Detail naskah, timeline audit, tombol approve/reject, form scan
│   ├── Settings.html             # Panel Admin (Kelola Pengguna) & Approver (Tanda Tangan)
│   ├── Stylesheet.html           # Definisi style bersama (UI styling)
│   ├── JavaScript.html           # Client-side controller & pemanggilan google.script.run
│   │
│   └── appsscript.json           # Manifest Apps Script (V8 runtime, scopes)
│
├── specs/                        # Dokumentasi spesifikasi fitur (Spec Kit)
│   └── 001-manajemen-surat/      # Spesifikasi, rencana, tasks, dan contracts
├── .specify/                     # Tata kelola & memori Spec Kit (constitution.md)
├── .agents/                      # Skills & workflows otomatisasi agent
├── docs/                         # Arsip dokumentasi proyek
│
├── .clasp.json                   # Konfigurasi Google Clasp (rootDir: ./src)
├── .claspignore                  # Berkas yang diabaikan saat push clasp
├── .gitignore                    # Konfigurasi ignore file Git
├── README.md                     # Dokumentasi utama repositori
└── VERSION                       # Sumber kebenaran versi proyek (v0.1.0)
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
   Buka file [`.clasp.json`](.clasp.json) di root repositori dan masukkan Script ID Apps Script Anda:
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

6. **Inisialisasi Database**:
   Saat pertama kali deployment, jalankan fungsi `setupDatabase()` di Apps Script Editor untuk membuat header 4 sheet basis data (`Users`, `Letters`, `Counters`, `ApprovalLog`) secara otomatis.

---

### 2. Pengujian Unit Otomatis

Seluruh pengujian unit inti dapat dijalankan langsung tanpa menyentuh Google Sheets / Drive produksi:

- **Melalui Apps Script Editor**: Pilih fungsi `runAllTests` di toolbar atas dan klik **Run**.
- **Melalui Clasp di Terminal**:
  ```bash
  clasp run runAllTests
  ```

---

### 3. Versioning & Konvensi Commit

- **Versioning**: Proyek mengikuti **Semantic Versioning 2.0.0** (`vMAJOR.MINOR.PATCH`). Berkas [`VERSION`](VERSION) di root repositori adalah **sumber kebenaran tunggal** versi proyek (saat ini `v0.1.0`).
- **Pesan Commit**: Mengikuti standar **Conventional Commits v1.0.0** dengan footer versi wajib:
  ```text
  <tipe>(<scope opsional>): <deskripsi singkat imperative>

  [body opsional]

  Version: vX.Y.Z
  ```
  Tipe: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.  
  Scope: `auth`, `letter`, `numbering`, `document`, `notification`, `admin`, `sheet`.
