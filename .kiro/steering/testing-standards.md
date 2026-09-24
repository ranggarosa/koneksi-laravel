---
inclusion: fileMatch
fileMatchPattern: ["*.test.gs", "Test*.gs"]
---

# Testing Standards

## Kenapa Ini Kritis
Beberapa aturan bisnis di `requirement.md`/`design.md` berdampak langsung ke keabsahan dokumen resmi (nomor surat, urutan persetujuan, status tanda tangan). Bug di area ini bukan sekadar bug UI — bisa menghasilkan surat ganda nomor atau surat "Approved" padahal belum benar-benar ditandatangani. Area ini **wajib** punya test meski tooling Apps Script terbatas.

## Pendekatan (Apps Script tidak punya test runner bawaan)
- **Dependency Injection ringan** di Service: terima Repository sebagai parameter/objek yang bisa di-*mock*, jangan panggil `SpreadsheetApp`/`DriveApp` langsung di dalam Service — ini juga konsisten dengan `code-conventions.md`.
- **Penamaan file test**: `*.test.gs` atau `Test*.gs` (cocok dengan pola `fileMatch` di atas), fungsi test berprefix `test_`, contoh: `test_numbering_no_duplicate_under_lock()`.
- **Helper assert sederhana** di `TestUtils.gs` (`assertEqual`, `assertTrue`, `assertThrows`) — tidak perlu framework eksternal untuk Fase 0.
- **Menjalankan test**: manual lewat Apps Script Editor (pilih & jalankan fungsi `runAllTests()`), atau otomatis via `clasp run runAllTests` bila OAuth `clasp` sudah dikonfigurasi (lihat `deployment-workflow.md`).

## Area yang Wajib Diuji (Critical Business Rules)
| Modul | Skenario Wajib |
|---|---|
| `numbering.service.gs` | Nomor tidak boleh duplikat meski `generateNumber()` dipanggil berturutan cepat (simulasikan loop); format hasil sesuai `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`; counter baru otomatis terbuat saat ganti bulan/tahun. |
| `letter.service.gs` — alur approval | Approver urutan ke-*n* **tidak bisa** bertindak sebelum urutan ke-(*n*-1) berstatus `approved`; `reject` menghentikan alur dan mengunci status jadi `Rejected` (tidak ada approver berikutnya yang bisa bertindak setelahnya). |
| `letter.service.gs` — percabangan tanda tangan | Approve final dengan `signatureMethod: "digital"` → status langsung `Approved`; dengan `"wet"` → status tetap `In Review`, `awaitingWetSignature = TRUE`, dan **tidak** berubah `Approved` sampai revisi baru terverifikasi ada. |
| `auth.service.gs` | Email tidak terdaftar di sheet `Users` → akses ditolak; email terdaftar tapi `isActive = FALSE` → akses ditolak. |
| `document.service.gs` | `verifyNewRevisionExists()` mengembalikan `false` jika belum ada revisi baru pada `unsignedDriveFileId` (mencegah surat basah tertandai selesai padahal scan belum diunggah). |

## Uji Manual (UAT) — Pelengkap, Bukan Pengganti
Karena Fase 0 tidak punya automated UI test, jalankan checklist manual berikut sebelum setiap rilis (lihat juga `deployment-workflow.md` §6 Smoke Test):
1. Submit draf → approve berjenjang penuh → pilih **digital** → PDF final tersuntik tanda tangan dengan benar.
2. Submit draf → approve berjenjang penuh → pilih **basah** → tautan Drive terbagi ke pihak yang tepat → unggah versi baru → status berubah `Approved`.
3. Submit draf → salah satu approver **reject** dengan catatan → Drafter menerima notifikasi berisi catatan tersebut, tidak ada approver lain yang bisa lagi bertindak.
4. Login dengan email yang belum terdaftar → ditolak dengan pesan yang jelas.

## Target Cakupan
100% pada lima skenario kritis di atas (tabel §2). Layer View/UI tidak wajib automated test di Fase 0 — cukup checklist manual §3; jangan memaksakan UI test otomatis yang mahal untuk skala prototipe ini.

## Rencana Fase 1+ (mengikuti roadmap.md)
- Frontend (Next.js/React): **Vitest/Jest** + **React Testing Library**.
- Backend (Cloud Functions/Firestore): **Firebase Emulator Suite** untuk uji integrasi tanpa menyentuh data produksi, plus uji Firestore Security Rules.
- Kelima skenario kritis di tabel §2 tetap menjadi acuan test-case inti lintas fase — hanya alat & lapisan implementasinya yang berganti.
