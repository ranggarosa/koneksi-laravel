---
inclusion: always
---

# Tech Stack & Constraints — Fase 0 (Tahap Berjalan)

## Stack Aktif Saat Ini
| Kebutuhan | Teknologi |
|---|---|
| Frontend | Apps Script **HTML Service** (Web App) |
| Backend / Logic | **Google Apps Script** (`.gs` server-side functions) |
| Database | **Google Sheets** (`SpreadsheetApp`) — sheet `Users`, `Letters`, `Counters`, `ApprovalLog` |
| Autentikasi | `Session.getActiveUser()` dicocokkan whitelist email di sheet `Users` |
| Storage dokumen & tanda tangan | **Google Drive** (`DriveApp`), folder terstruktur per surat |
| Pembuatan dokumen/PDF | **Google Docs Advanced Service / `DocumentApp`** + `DriveApp` |
| Versi dokumen (tanda tangan basah) | **Drive Advanced Service / `Files.update`** (update versi berkas, bukan berkas baru) |
| Penomoran atomik | **`LockService`** pada sheet `Counters` |
| Notifikasi | `MailApp` / `GmailApp` |
| Hosting | Apps Script **Web App deployment** (URL `/exec`) |

## Batasan Teknis Fase 0
- Akun Google **tidak wajib** satu domain organisasi — email pribadi diizinkan asal terdaftar di whitelist `Users`.
- Eksekusi Apps Script maksimum **6 menit/proses**; ada kuota harian untuk email, panggilan Drive/Docs API.
- Google Sheets bukan database relasional sungguhan — cocok skala kecil (puluhan–ratusan surat/bulan).
- Tidak ada dukungan offline.
- Tidak ada status `Processing PDF` — seluruh proses generate dokumen berjalan sinkron dalam satu eksekusi.

## Konvensi Commit
Conventional Commits v1.0.0 (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`), huruf kecil, imperative, tanpa titik di akhir deskripsi singkat. Scope yang disarankan: `auth`, `letter`, `numbering`, `document`, `notification`, `admin`, `sheet`.

## Perintah Umum
Proyek Apps Script — deployment & testing dilakukan lewat Apps Script Editor / `clasp` (bukan `npm run` konvensional). Jika memakai `clasp`:
```
clasp push      # kirim perubahan lokal ke Apps Script project
clasp deploy    # deploy versi Web App baru
```

## Rencana Stack Masa Depan (Fase 1+)
Firebase (Firestore, Auth, Cloud Functions, Hosting) → GCP Cloud SQL + Prisma/Drizzle + NestJS/Next.js Server Actions → Next.js App Router + Firebase Custom Claims → GCP Cloud Tasks + WhatsApp Gateway. Detail lengkap ada di spec `design.md` §2–§5 dan `roadmap.md`.
