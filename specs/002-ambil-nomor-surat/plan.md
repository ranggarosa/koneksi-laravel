# Implementation Plan: Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor)

**Branch**: `002-ambil-nomor-surat` | **Date**: 2026-09-28 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/002-ambil-nomor-surat/spec.md`

---

## Summary

Mengimplementasikan fitur Reservasi & Pengambilan Nomor Surat Eksternal (Ambil Nomor) di atas arsitektur Google Apps Script dan Google Workspace yang ada. Fitur ini memungkinkan Drafter meminta nomor registrasi resmi untuk naskah surat fisik atau dokumen yang dibuat di luar aplikasi dengan hanya mengisi metadata pokok (Perihal, Tujuan, Kode Template, dan Tanggal Surat yang dikunci pada tanggal hari ini). Nomor resmi dialokasikan secara atomik setelah disetujui oleh 1 Approver, dengan status awal `Pending Upload`. Sistem memberlakukan tenggat waktu rekonsiliasi 7 hari kalender untuk mengunggah berkas scan PDF bertanda tangan sah, mengirimkan email eskalasi pada hari ke-5, dan secara otomatis membatalkan serta melepaskan nomor kembali ke antrean daur ulang (`recycledNumbers`) jika mencapai hari ke-7 tanpa berkas scan. Pembatalan manual didukung untuk Approver/Admin, pembatalan mandiri didukung untuk Drafter saat `In Review`, dan koreksi berkas pasca-Approved dibatasi khusus bagi Admin.

---

## Technical Context

**Language/Version**: Google Apps Script (V8 Runtime Engine, ECMAScript 2020+ / ES6+).

**Primary Dependencies**: 
- Google Workspace Services: `SpreadsheetApp`, `DriveApp`, `MailApp`, `LockService`, `Session`, `HtmlService`, `ScriptApp`.
- Advanced Google Services: `Drive` (Drive API v2/v3 untuk revisi berkas).

**Storage**:
- **Database**: Google Sheets (`AppDatabase`), memanfaatkan sheet `Letters`, `Counters`, `ApprovalLog`, dan `Users`.
  - Sheet `Letters`: Menambahkan kolom/atribut serialisasi `documentType` (`INTERNAL` vs `EXTERNAL`), `reconciliationDeadline`, `escalationSentAt`, dan `cancellationReason`.
  - Sheet `Counters`: Reused untuk antrean nomor daur ulang (`recycledNumbers`) per kode template dan bulan.
  - Sheet `ApprovalLog`: Reused untuk jejak audit permanen.
- **Berkas & Dokumen**: Google Drive folder per surat (`Surat Menyurat (Root)/Letters/{letterId}/`) untuk menyimpan berkas scan PDF resmi.

**Testing**:
- Unit test in-app pada `take-number.test.gs` / `letter.test.gs` menggunakan `TestUtils.gs` dengan *Dependency Injection* (mock repository in-memory tanpa efek samping ke Google Sheets produksi).
- Skenario pengujian manual UAT pra-rilis pada `quickstart.md`.

**Target Platform**: Google Apps Script Web App (`/exec`), kompatibel dengan seluruh peramban web modern.

**Project Type**: Serverless Web Application (Google Workspace Platform).

**Performance Goals**:
- Pengajuan permohonan Ambil Nomor oleh Drafter: < 60 detik.
- Eksekusi alokasi nomor atomik saat Approver setuju: < 3 detik.
- Visibilitas nomor berstatus `Pending Upload` di arsip publik: < 5 detik.
- Eksekusi pemicu terjadwal harian (daily audit SLA): < 30 detik untuk seluruh data tertunda.

**Constraints**:
- Batas waktu eksekusi skrip Google Apps Script maksimal 6 menit per pemanggilan.
- Tanggal surat dikunci ketat pada hari ini (tidak mengizinkan tanggal mundur/backdating).
- Persetujuan nomor bersifat 1-tahap (hanya 1 Approver, tanpa rantai reviewer bertingkat).
- Tidak ada pembuatan draf dokumen Google Docs di Drive untuk dokumen bertipe `EXTERNAL`.
- Kuota harian email Google Workspace (`MailApp`) dipatuhi untuk notifikasi dan eskalasi.

**Scale/Scope**:
- Estimasi puluhan permohonan nomor eksternal per bulan.
- 1 pemicu berbasis waktu harian (*daily time-driven trigger*).
- 4 role sistem (`drafter`, `reviewer`, `approver`, `admin`).

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinsip Konstitusi | Status Evaluasi | Penjelasan Kepatuhan |
|---|---|---|
| **I. Strict Layered Architecture** | **PASS** | Mengikuti aliran unidirectional yang kaku: `View (.html)` → `Controller (.gs)` → `Service (.gs)` → `Repository (.gs)` → External Services. Form Ambil Nomor dan upload scan tidak memanggil database secara langsung. |
| **II. Server-Side Single Source of Truth** | **PASS** | Validasi sesi whitelist email aktif via `authService.getCurrentUser()`. Pembatasan hak pembatalan, persetujuan, dan koreksi scan admin divalidasi ketat pada layer server. |
| **III. Document Integrity & Atomic Numbering** | **PASS** | Menggunakan `numberingService.allocateNumber()` dengan `LockService` saat Approver menyetujui permohonan. Pelepasan nomor `Cancelled`/`Expired` mengembalikan nomor ke antrean daur ulang bulan pembuatannya. |
| **IV. Test-Driven Verification** | **PASS** | Menyiapkan unit test otomatis pada `take-number.test.gs` mencakup pengujian alokasi atomik, pembatalan mandiri Drafter, pembatalan manual Approver/Admin, eskalasi H-2, kedaluwarsa H+7, dan hak koreksi scan admin. |
| **V. Defensive Security & Auditability** | **PASS** | Sanitasi formula spreadsheet (`=`, `+`, `-`, `@`) diterapkan pada Perihal dan Tujuan. Seluruh mutasi siklus penomoran dicatat permanen di `ApprovalLog`. |

**Hasil Gate**: **Lolos 100% (Semua gerbang konstitusi terpenuhi).**

---

## Project Structure

### Documentation (this feature)

```text
specs/002-ambil-nomor-surat/
├── spec.md              # Feature specification dengan 5 sesi klarifikasi
├── plan.md              # Implementation plan teknis (berkas ini)
├── research.md          # Riset teknis, rationale, dan alternatif (Phase 0)
├── data-model.md        # Skema data Google Sheets, folder Drive, dan transisi status (Phase 1)
├── quickstart.md        # Panduan verifikasi pengujian & validasi E2E (Phase 1)
├── checklists/
│   └── requirements.md  # Checklist kualitas spesifikasi (16/16 lolos)
└── contracts/           # Kontrak antarmuka Controller API (Phase 1)
    └── take-number-contract.md
```

### Source Code (repository root)

```text
koneksi-speckit/
├── Code.gs                     # Entry point doGet(), include(), dan installDailyTrigger()
├── Constants.gs                # Enum DOCUMENT_TYPE, penambahan status PENDING_UPLOAD, EXPIRED, CANCELLED
├── Utils.gs                    # Helper sanitasi, kalkulasi selisih hari, dan validasi tanggal
│
├── letter.controller.gs        # Controller: endpoint submitTakeNumber, approve/reject/cancel, upload scan
│
├── letter.service.gs           # Service: alur ambil nomor, pembatalan mandiri/manual, dan koreksi admin
├── numbering.service.gs        # Service: alokasi nomor atomik & pelepasan ke recycled pool
├── notification.service.gs     # Service: email notifikasi permohonan, persetujuan, dan eskalasi H-2
├── schedule.service.gs         # Service: logika pemicu terjadwal harian (audit SLA 7 hari & auto-recycle)
│
├── letter.repository.gs        # Repository: persistensi atribut surat eksternal di sheet Letters
├── counter.repository.gs       # Repository: pengelolaan urutan & antrean nomor daur ulang
├── sheet.repository.gs         # Repository: wrapper SpreadsheetApp & formula injection defense
│
├── take-number.test.gs         # Unit test alur Ambil Nomor, eskalasi, kedaluwarsa, dan pembatalan
│
├── CreateLetter.html           # Penambahan opsi/tab formulir "Ambil Nomor Surat (Eksternal)"
├── LetterDetail.html           # Detail surat eksternal, countdown timer 7 hari, form unggah scan
└── Dashboard.html              # Penyesuaian filter tab & lencana status "Pending Upload" / "Expired"
```

**Structure Decision**: Mempertahankan arsitektur flat Google Apps Script dengan sufiks per lapis (`*.controller.gs`, `*.service.gs`, `*.repository.gs`) selaras dengan Konstitusi Proyek Prinsip I dan fitur `001-manajemen-surat`.

---

## Complexity Tracking

> *Tidak ada pelanggaran konstitusi. Tidak ada entri kompleksitas yang perlu dijustifikasi.*

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | N/A | N/A |
