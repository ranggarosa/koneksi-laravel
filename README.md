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

Sistem diatur oleh konstitusi proyek resmi di [`.specify/memory/constitution.md`](.specify/memory/constitution.md) dan pedoman steering di [`.kiro/steering/`](.kiro/steering/):

1. **Layered Architecture (Unidirectional Flow)**:
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
   - Pengujian terstruktur via `*.test.gs` / `Test*.gs` dengan dependency injection pada service layer.

---

## 📁 Struktur Direktori

```text
koneksi-speckit/
├── .agents/              # Agent skills & workflows (Spec Kit integrations)
├── .kiro/                # Kiro steering rules & specification files
│   ├── specs/            # Spesifikasi fitur (requirements & design)
│   └── steering/         # Steering context (code conventions, security, testing, dll)
├── .specify/             # Spec Kit governance & memory
│   └── memory/
│       └── constitution.md # Konstitusi proyek resmi (v1.0.0)
├── docs/                 # Dokumentasi proyek & dokumen sumber arsip
│   └── source/           # Dokumen rujukan PRD, skema, arsitektur, dll
├── .gitignore            # Konfigurasi ignore file macOS, Node, Clasp, secrets
├── README.md             # Dokumentasi utama repositori
└── VERSION               # Sumber kebenaran versi proyek (v0.1.0)
```

---

## 🛠️ Alur Pengembangan & Konvensi

### 1. Versioning
Proyek mengikuti **Semantic Versioning 2.0.0** (`vMAJOR.MINOR.PATCH`).
Berkas [`VERSION`](VERSION) di root repositori adalah **sumber kebenaran tunggal** versi proyek (dimulai dari `v0.1.0`).

### 2. Konvensi Commit
Format pesan commit mengikuti **Conventional Commits v1.0.0** dengan footer versi wajib:
```text
<tipe>(<scope opsional>): <deskripsi singkat imperative>

[body opsional]

Version: vX.Y.Z
```
Tipe yang diizinkan: `feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`.
Scope umum: `auth`, `letter`, `numbering`, `document`, `notification`, `admin`, `sheet`.

### 3. Pengujian & Deployment (Fase 0)
- **Menjalankan Unit Test**: Jalankan `runAllTests()` via Apps Script Editor atau `clasp run runAllTests`.
- **Deployment via Clasp**:
  ```bash
  clasp push      # Kirim kode lokal ke Apps Script project
  clasp deploy    # Deploy versi Web App baru
  ```
