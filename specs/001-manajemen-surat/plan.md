# Implementation Plan: Sistem Manajemen Surat Menyurat (Koneksi)

**Branch**: `001-manajemen-surat` | **Date**: 2026-09-27 | **Spec**: [spec.md](spec.md)

**Input**: Feature specification from `specs/001-manajemen-surat/spec.md`

---

## Summary

Mengimplementasikan siklus lengkap Sistem Manajemen Surat Menyurat (Koneksi) Fase 0 di atas Google Workspace dan Google Apps Script. Solusi mencakup formulir draf dinamis, penomoran surat atomik anti-race condition dengan antrean daur ulang nomor (recycled pool), alur persetujuan bertingkat dengan penolakan permanen, percabangan pengesahan digital (injeksi otomatis ke PDF) vs basah (pembaruan versi berkas Drive via API), autentikasi berbasis whitelist email aktif, dan antarmuka Web App terpadu dengan perlindungan injeksi formula.

---

## Technical Context

**Language/Version**: Google Apps Script (V8 Engine, ECMAScript 2020+ / ES6+).

**Primary Dependencies**: Google Workspace Advanced Services (`Drive`, `Docs`), `SpreadsheetApp`, `DriveApp`, `DocumentApp`, `MailApp`, `LockService`, `Session`, `HtmlService`.

**Storage**: 
- Database: Google Sheets (`AppDatabase` dengan 4 sheet: `Users`, `Letters`, `Counters`, `ApprovalLog`). Kolom bersarang (`approvalFlow`, `contentData`, `recycledNumbers`) diserialisasi sebagai JSON string.
- Berkas & Dokumen: Google Drive dengan struktur folder per surat (`Surat Menyurat (Root)/Letters/{letterId}/`).

**Testing**: Modul pengujian unit in-app pada `TestUtils.gs` dan `*.test.gs` menggunakan *Dependency Injection* tanpa menyentuh Google Sheets / Drive produksi, serta checklist pengujian manual UAT pra-rilis.

**Target Platform**: Google Apps Script Web App (`/exec`), kompatibel dengan peramban desktop modern (Chrome, Safari, Edge, Firefox).

**Project Type**: Serverless Web Application (Google Workspace Platform).

**Performance Goals**:
- Pembuatan draf hingga penerbitan nomor: < 2 menit.
- Ekspor PDF final bertanda tangan digital: < 30 detik.
- Penomoran atomik: 100% bebas nomor ganda/terlewat dalam pengujian konkurensi simultan.

**Constraints**:
- Batas waktu eksekusi Apps Script: maksimum 6 menit per proses.
- Pembuatan dokumen/PDF bersifat sinkron (status `Processing PDF` ditiadakan di Fase 0).
- Kuota harian email Google Workspace (`MailApp`) dan panggilan Drive/Docs API.

**Scale/Scope**: Skala prototipe awal puluhan hingga ratusan surat per bulan, 4 role pengguna (`drafter`, `reviewer`, `approver`, `admin`), 4 sheet database, 1 Web App UI.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Prinsip Konstitusi | Status Evaluasi | Penjelasan Kepatuhan |
|---|---|---|
| **I. Strict Layered Architecture** | **PASS** | Dependensi satu arah yang kaku: `View (.html)` → `Controller (.gs)` → `Service (.gs)` → `Repository (.gs)` → External Services. View dan Service bebas dari akses data langsung. |
| **II. Server-Side Single Source of Truth** | **PASS** | Seluruh fungsi Controller menginjeksi guard `authService.getCurrentUser()`. Urutan approval divalidasi sekuensial pada server, dan penolakan langsung mengunci draf permanen. |
| **III. Document Integrity & Atomic Numbering** | **PASS** | Format nomor baku `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}` dengan `LockService` atomik. Nomor rilis masuk antrean daur ulang. Jalur tanda tangan basah diverifikasi via `revisionId` Drive. |
| **IV. Test-Driven Verification** | **PASS** | Layer Service menerima repository terinjeksi (Dependency Injection) untuk pengujian unit in-memory mencakup kelima skenario kritis tanpa ketergantungan Google Sheets live. |
| **V. Defensive Security & Auditability** | **PASS** | Sanitasi formula spreadsheet (`=`, `+`, `-`, `@`) diterapkan di `sheetRepository`. Seluruh aksi dicatat permanen di `ApprovalLog`. Kredensial & ID disimpan di `PropertiesService`. |

**Hasil Gate**: **Lolos 100% (Semua gate lulus tanpa pelanggaran).**

---

## Project Structure

### Documentation (this feature)

```text
specs/001-manajemen-surat/
├── spec.md              # Feature specification dengan 5 klarifikasi terintegrasi
├── plan.md              # Implementation plan teknis (berkas ini)
├── research.md          # Riset teknis, rationale, dan alternatif (Phase 0)
├── data-model.md        # Skema data Google Sheets, folder Drive, dan transisi status (Phase 1)
├── quickstart.md        # Panduan verifikasi pengujian & validasi E2E (Phase 1)
├── checklists/
│   └── requirements.md  # Checklist kualitas spesifikasi (16/16 lolos)
└── contracts/           # Kontrak antarmuka Controller API (Phase 1)
    ├── auth-contract.md
    ├── letter-contract.md
    └── admin-contract.md
```

### Source Code (repository root)

```text
koneksi-speckit/
├── Code.gs                     # Entry point: doGet(), include() helper
├── Constants.gs                # Enum status, role, sheet names, keys Script Properties
├── Utils.gs                    # Helper umum (format tanggal, angka romawi, sanitasi path)
│
├── auth.controller.gs          # Controller: sesi aktif & verifikasi whitelist
├── letter.controller.gs        # Controller: draf, approval, reject, upload scan
├── admin.controller.gs         # Controller: manajemen user & upload tanda tangan
│
├── auth.service.gs             # Service: logika autentikasi & validasi role
├── letter.service.gs           # Service: alur persetujuan, penolakan, hak akses privasi
├── numbering.service.gs        # Service: penomoran atomik LockService & antrean daur ulang
├── document.service.gs         # Service: injeksi Docs, export PDF, Drive.Files.update
├── notification.service.gs     # Service: notifikasi email terformat via MailApp
│
├── user.repository.gs          # Repository: CRUD sheet Users
├── letter.repository.gs        # Repository: CRUD sheet Letters
├── counter.repository.gs       # Repository: CRUD sheet Counters & recycled numbers pool
├── sheet.repository.gs         # Repository: Wrapper SpreadsheetApp & formula escaping
│
├── TestUtils.gs                # Helper pengujian assertions (assertEqual, assertThrows)
├── numbering.test.gs           # Unit test penomoran atomik & recycled pool
├── letter.test.gs              # Unit test alur persetujuan, penolakan & percabangan
├── auth.test.gs                # Unit test whitelist & penolakan sesi
├── document.test.gs            # Unit test verifikasi revisi berkas basah
│
├── Index.html                  # Shell layout & client-side router
├── Login.html                  # Tampilan penolakan akses non-whitelist
├── Dashboard.html              # Tampilan tab: Perlu Tindakan, Draf Saya, Arsip Terbuka
├── CreateLetter.html           # Formulir draf dinamis & seleksi reviewer/approver
├── LetterDetail.html           # Detail naskah, timeline audit, tombol approve/reject, form scan
├── Settings.html               # Panel Admin (Kelola Pengguna) & Approver (Tanda Tangan)
├── Stylesheet.html             # Definisi style bersama (UI styling)
└── JavaScript.html             # Client-side controller & pemanggilan google.script.run
```

**Structure Decision**: Mengadopsi arsitektur flat dengan sufiks peran layer (`*.controller.gs`, `*.service.gs`, `*.repository.gs`) sesuai konvensi resmi Google Apps Script dan Konstitusi Proyek Prinsip I.

---

## Complexity Tracking

> **Status**: Tidak ada pelanggaran konstitusi (*Zero Violations*). Seluruh modul mematuhi batas arsitektur 4-layer dan batasan teknis Fase 0.

| Violation | Why Needed | Simpler Alternative Rejected Because |
|---|---|---|
| *None* | *N/A* | *N/A* |
