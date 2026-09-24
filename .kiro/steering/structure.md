---
inclusion: always
---

# Project Structure & Conventions

## Prinsip Layered Architecture
Komunikasi satu arah: `View (.html)` → `Controller` → `Service` → `Repository` → `Sheets/Drive/Docs/Mail`.
- **View**: hanya tampilan & interaksi user, dilarang berisi logika bisnis atau akses data langsung.
- **Controller**: menghubungkan UI ↔ Service, mengelola state (loading/error/success).
- **Service**: pusat logika bisnis (validasi, penomoran, alur approval); tidak boleh tahu soal UI.
- **Repository**: satu-satunya layer yang bicara ke Sheets/Drive/Docs; hanya query, tanpa logika bisnis.

## Struktur File (Fase 0 — Apps Script, flat file dengan suffix layer)
```
├── Code.gs                     # Entry point (doGet, include helper)
├── Constants.gs / Utils.gs
├── auth.controller.gs / letter.controller.gs / admin.controller.gs
├── auth.service.gs / letter.service.gs / numbering.service.gs
├── document.service.gs / notification.service.gs
├── user.repository.gs / letter.repository.gs / counter.repository.gs / sheet.repository.gs
└── Index.html / Login.html / Dashboard.html / CreateLetter.html / LetterDetail.html / Settings.html
```
Referensi lengkap tiap fungsi: lihat `.kiro/specs/manajemen-surat/design.md` §7.

## Konvensi Penamaan & Gaya Kode
Dipindahkan ke steering terpisah agar setiap berkas fokus satu domain (lihat `.kiro/steering/code-conventions.md`) — file itu memuat aturan penamaan, contoh kode benar/salah, dan pola arsitektur yang wajib diikuti setiap kali generate kode baru.

## Alur Dependency Contoh
1. UI (`CreateLetter.html`) memanggil `letterController.submitDraft()`.
2. Controller atur state loading → panggil `letterService.createDraft(data)`.
3. Service validasi data → panggil `numberingService.generateNumber()` → panggil `letterRepository.insert()`.
4. Hasil dikembalikan berantai ke UI.

## Skema Data Inti (Fase 0 — Google Sheets)
Sheet `Users`, `Letters` (kolom `approvalFlow`/`contentData` disimpan sebagai JSON string), `Counters`, `ApprovalLog`. Detail kolom lengkap: `.kiro/specs/manajemen-surat/design.md` §3.

## Struktur Folder Google Drive
```
Surat Menyurat (Root)/
├── Templates/      (master template per jenis surat)
├── Signatures/      (gambar tanda tangan referensi per approver)
└── Letters/{letterId}/
     ├── unsigned-draft   (khusus jalur tanda tangan basah)
     └── final            (PDF final)
```

## Rencana Struktur Masa Depan (Fase 2–3)
Saat migrasi ke Next.js: struktur feature-driven per `architecture_rules.md` §2 —
```
project-root/
 ├── functions/ (Cloud Functions backend)
 └── src/features/letters/
      ├── letter.model.ts
      ├── letter.repository.ts
      ├── letter.service.ts
      ├── letter.controller.ts
      └── LetterView.tsx
```
