---
inclusion: always
---

# Product Context: Sistem Manajemen Surat Menyurat

## Tujuan
Otomatisasi surat resmi (surat tugas, SP, dll) di lingkungan HR: dari pembuatan draf, persetujuan berjenjang, hingga finalisasi dokumen bertanda tangan — menggantikan proses manual cetak/tanda tangan basah/scan.

## Peran Pengguna
- **Drafter** — membuat draf surat, menentukan urutan Reviewer/Approver.
- **Reviewer / Approver** — meninjau dan menyetujui/menolak surat sesuai giliran berjenjang.
- **Approver (penyetuju terakhir)** — tambahan wewenang memilih metode finalisasi (Tanda Tangan Digital atau Tanda Tangan Basah).
- **Admin** — mengelola daftar pengguna terdaftar (whitelist email) beserta rolenya.

## Model Akses
Login pakai akun Google apa pun (tidak wajib domain organisasi), namun **email wajib terdaftar lebih dulu** oleh Admin sebelum bisa mengakses aplikasi (whitelist, bukan verifikasi domain).

## Fase Pengembangan (Roadmap)
| Fase | Fokus | Status |
|---|---|---|
| **Fase 0** | Rapid prototype 100% Google Workspace + Apps Script (Sheets sebagai DB) | **Sedang dikerjakan** |
| Fase 1 | MVP Serverless — migrasi ke Firebase (Firestore, Auth, Cloud Functions) | Rencana berikutnya |
| Fase 2 | Migrasi database ke GCP Cloud SQL (PostgreSQL) + ORM (Prisma/Drizzle) + backend API terpisah | Rencana |
| Fase 3 | Modernisasi frontend ke Next.js (App Router, SSR) + Firebase Custom Claims | Rencana |
| Fase 4 | Skalabilitas: GCP Cloud Tasks (antrean) + notifikasi WhatsApp Gateway | Rencana |

## Batasan Bisnis Utama
- Nomor surat harus unik & atomik (anti race condition) — format contoh: `0051.SP1/VII/2026`.
- Persetujuan berjalan berjenjang/berurutan, tidak boleh melompat giliran.
- Setiap penolakan (reject) wajib bisa disertai catatan revisi ke Drafter.
- Approver terakhir memilih tanda tangan **digital** (langsung final otomatis) atau **basah** (dokumen tanpa tanda tangan dibagikan via Drive, hasil scan diunggah sebagai versi baru berkas yang sama).
- Status `Processing PDF` tidak dipakai di Fase 0 (proses sinkron); baru relevan kembali mulai Fase 1 saat proses generate dokumen berjalan asinkron di Cloud Functions.

## Referensi Dokumen Sumber
`prd.md`, `roadmap.md`, `schema.md`, `wireframe.md` (dokumen desain awal proyek).
