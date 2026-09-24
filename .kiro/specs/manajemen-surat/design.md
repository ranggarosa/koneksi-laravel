# Design Document
# Koneksi — Fase 0 (Google Workspace + Apps Script)

Dokumen ini menerjemahkan `requirements.md` menjadi desain teknis yang siap diimplementasikan: skema data, struktur proyek, alur proses, dan pemetaan fungsi per layer. Fokus utama adalah **Fase 0 (Apps Script)**; desain data tetap dijaga selaras dengan `schema.md` (Firestore) agar migrasi ke Fase 1 lebih mudah (lihat §10).

---

## Overview

Mencakup: autentikasi berbasis whitelist email, pembuatan surat, penomoran atomik, alur persetujuan berjenjang, finalisasi dokumen (tanda tangan digital & basah), notifikasi email, dan manajemen user oleh Admin.

Tidak mencakup: detail implementasi migrasi Fase 1–4 (sudah dibahas di `requirements.md` Catatan Teknis dan `roadmap.md`).

---

## Architecture

### Arsitektur Sistem (High-Level)

```
┌──────────────┐      HTTPS       ┌───────────────────────────────┐
│   Browser     │ ───────────────▶│  Apps Script Web App (doGet)   │
│ (HTML Service)│ ◀─────────────── │  index.html + google.script.run│
└──────────────┘                  └───────────────┬─────────────────┘
                                                    │ panggilan server-side (.gs)
                                                    ▼
                          ┌─────────────────────────────────────────┐
                          │   Controller Layer (*.controller.gs)     │
                          └───────────────┬───────────────────────────┘
                                          ▼
                          ┌─────────────────────────────────────────┐
                          │   Service Layer (*.service.gs)           │
                          │   - AuthService, LetterService,          │
                          │     NumberingService, DocumentService,   │
                          │     NotificationService                  │
                          └───────────────┬───────────────────────────┘
                                          ▼
                          ┌─────────────────────────────────────────┐
                          │   Repository Layer (*.repository.gs)     │
                          └───┬──────────────┬──────────────┬────────┘
                              ▼              ▼              ▼
                      ┌──────────────┐ ┌────────────┐ ┌──────────────┐
                      │ Google Sheets │ │ Google Drive│ │ Google Docs /│
                      │ (Users,       │ │ (arsip &   │ │ MailApp      │
                      │  Letters,     │ │  template) │ │              │
                      │  Counters)    │ │            │ │              │
                      └──────────────┘ └────────────┘ └──────────────┘
```

Semua logika berjalan **sinkron dalam satu eksekusi Apps Script** per request (`google.script.run`), sesuai batasan yang sudah dicatat di `requirement.md` §2.1.

### Struktur Proyek Apps Script (Pemetaan Layered Architecture)

Mengadaptasi §2.6 `requirement.md` (turunan dari `architecture_rules.md`) ke dalam file `.gs`/`.html` datar (Apps Script tidak mendukung sub-folder nyata, penamaan file dipakai sebagai pengganti struktur folder):

```
project (Apps Script)
├── Code.gs                     # Entry point: doGet(), include() helper
├── Constants.gs                # Enum status, role, sheet name, folder ID
├── Utils.gs                    # Helper umum (format tanggal, romawi bulan, dsb.)
│
├── auth.controller.gs
├── letter.controller.gs
├── admin.controller.gs
│
├── auth.service.gs
├── letter.service.gs
├── numbering.service.gs
├── document.service.gs
├── notification.service.gs
│
├── user.repository.gs
├── letter.repository.gs
├── counter.repository.gs
├── sheet.repository.gs         # Helper generik baca/tulis Sheet (dipakai repo lain)
│
├── Index.html                  # Shell halaman (memuat CSS/JS include)
├── Login.html                  # /login
├── Dashboard.html               # /dashboard
├── CreateLetter.html            # /create
├── LetterDetail.html            # /letter/[id]
├── Settings.html                 # /settings
├── Stylesheet.html               # <style> bersama (di-include)
└── JavaScript.html               # <script> client bersama (di-include)
```

**Aturan dependensi** (searah, sama seperti §4 `architecture_rules.md`):
`View (.html)` → `Controller` → `Service` → `Repository` → `Sheets/Drive/Docs/Mail`.
Controller tidak boleh memanggil Repository langsung; Service tidak boleh menyentuh `HtmlService`.

---

## Data Models

Satu Google Spreadsheet (`AppDatabase`) dengan sheet berikut. Kolom bertipe objek/array (Firestore Map/Array pada `schema.md`) disimpan sebagai **string JSON** dalam satu sel.

### Sheet `Users`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `email` | String (Primary Key) | Email pengguna (pribadi/organisasi), dicocokkan dengan `Session.getActiveUser().getEmail()` |
| `name` | String | Nama lengkap |
| `role` | String | `drafter` \| `reviewer` \| `approver` \| `admin` |
| `signatureFileId` | String (opsional) | ID berkas gambar tanda tangan referensi di Drive (khusus Approver) |
| `isActive` | Boolean | Menonaktifkan akses tanpa menghapus baris |
| `createdAt` | DateTime | Waktu pendaftaran oleh Admin |

### Sheet `Letters`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `letterId` | String (PK) | UUID (`Utilities.getUuid()`) |
| `letterNumber` | String | Contoh: `0051.SP1/VII/2026`, kosong selama `Draft` |
| `templateType` | String | Contoh: `Surat Tugas`, `SP 1` |
| `templateCode` | String | Kode singkat untuk penomoran, contoh `SP1`, `ST` |
| `googleDocTemplateId` | String | ID master template Google Docs |
| `contentData` | String (JSON) | Variabel isi surat, mis. `{"nama":"...","nik":"..."}` |
| `status` | String | `Draft` \| `In Review` \| `Approved` \| `Rejected` \| `Canceled` \| `Booked` (**tanpa** `Processing PDF`, lihat §6) |
| `drafterEmail` | String | Pembuat draf |
| `approvalFlow` | String (JSON Array) | `[{ "email", "role", "status", "notes" }]` — lihat struktur di bawah |
| `signatureMethod` | String (opsional) | `digital` \| `wet`, diisi Approver terakhir saat approve final |
| `awaitingWetSignature` | Boolean | `TRUE` jika menunggu unggah hasil scan |
| `unsignedDriveFileId` | String (opsional) | ID berkas Drive dokumen final **tanpa** tanda tangan (jalur *wet*) |
| `unsignedDraftBaseRevisionId` | String (opsional) | `revisionId` berkas `unsigned-draft` saat pertama dibuat, dipakai untuk mendeteksi versi baru pada jalur tanda tangan basah |
| `finalPdfUrl` | String (opsional) | Tautan dokumen final (digital: hasil injeksi; basah: hasil unggahan versi baru) |
| `finalFileName` | String (opsional) | Nama berkas PDF final yang sudah disanitasi (tanpa path), mis. `0051.SP1-VII-2026 - Surat Tugas.pdf`; diisi bersamaan dengan `finalPdfUrl` |
| `createdAt` / `updatedAt` | DateTime | Jejak waktu |

**Struktur `approvalFlow` (per elemen array):**
```json
{ "email": "reviewer1@gmail.com", "role": "reviewer_1", "status": "pending", "notes": "" }
```
Field `status` per elemen: `pending` \| `approved` \| `rejected`. Elemen terakhir dalam array merepresentasikan `approver_final`.

### Sheet `Counters`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `counterId` | String (PK) | Format `MM_YYYY`, contoh `07_2026` |
| `month` | Number | 1–12 |
| `year` | Number | Contoh 2026 |
| `currentSequence` | Number | Angka urut terakhir yang diterbitkan |

### Sheet `ApprovalLog`
| Kolom | Tipe | Keterangan |
|---|---|---|
| `logId` | String (PK) | UUID |
| `letterId` | String | Referensi surat |
| `actorEmail` | String | Siapa yang bertindak |
| `action` | String | `approve` \| `reject` \| `choose_signature_method` \| `upload_wet_signature` |
| `notes` | String | Catatan (jika ada) |
| `timestamp` | DateTime | Waktu kejadian |

Sheet ini menjawab kebutuhan "timeline status" di wireframe §5 tanpa perlu mem-parsing ulang `approvalFlow` history.

---

## Components and Interfaces

### Controller Layer
| File | Fungsi | Deskripsi |
|---|---|---|
| `auth.controller.gs` | `getCurrentUser()` | Dipanggil `google.script.run` dari semua halaman untuk cek sesi/role |
| `letter.controller.gs` | `submitDraft(formData)` | Terima input `CreateLetter.html` |
| | `getLettersForUser(email)` | Data tabel Dashboard (riwayat + filter "giliran saya") |
| | `getLetterDetail(letterId)` | Data `LetterDetail.html` |
| | `decide(letterId, decision, notes, signatureMethod?)` | Approve/Reject |
| | `confirmWetSignatureUploaded(letterId)` | Tombol "Saya sudah unggah dokumen bertanda tangan"; guard server memvalidasi `awaitingWetSignature = TRUE` sebelum memanggil service |
| `admin.controller.gs` | `listUsers()`, `upsertUser(userData)` | `Settings.html` panel Admin |
| | `uploadSignature(fileBlob)` | `Settings.html` panel Approver |

### Service Layer
| File | Fungsi | Deskripsi |
|---|---|---|
| `auth.service.gs` | `getCurrentUser()` | Validasi whitelist |
| `letter.service.gs` | `createDraft(data)`, `processDecision(...)`, `listByUser(email)` | Logika bisnis inti, tidak menyentuh UI |
| `numbering.service.gs` | `generateNumber(templateCode)` | `LockService` + format nomor |
| `document.service.gs` | `generateDigitalFinal(letter)`, `generateUnsignedDraft(letter)`, `verifyNewRevisionExists(fileId, baseRevisionId)`, `cleanupPartialArtifact(fileId)`, `buildSanitizedFileName(letterNumber, templateType, suffix)` | Integrasi `DocumentApp`/`DriveApp`; `buildSanitizedFileName` menghasilkan nama berkas yang aman sesuai konvensi Requirement 13; `cleanupPartialArtifact` dipanggil saat `generateDigitalFinal` gagal setelah penyalinan template |
| `notification.service.gs` | `notifyNextApprover(letter)`, `notifyDrafter(letter, event)` | Wrapper `MailApp` |

### Repository Layer
| File | Fungsi | Deskripsi |
|---|---|---|
| `sheet.repository.gs` | `getRows(sheetName)`, `appendRow(...)`, `updateRowByKey(...)` | Helper generik dipakai repo lain |
| `user.repository.gs` | `findByEmail(email)`, `list()`, `upsert(user)` | CRUD sheet `Users` |
| `letter.repository.gs` | `insert(letter)`, `findById(id)`, `update(letter)`, `listAll()` | CRUD sheet `Letters` |
| `counter.repository.gs` | `getOrCreate(counterId)`, `save(counter)` | CRUD sheet `Counters` |

### View Layer (Pemetaan Wireframe → File `.html`)
| Halaman (Wireframe) | File | Fungsi Controller yang Dipanggil |
|---|---|---|
| `/login` | `Login.html` | `authController.getCurrentUser()` |
| `/dashboard` | `Dashboard.html` | `letterController.getLettersForUser()` |
| `/create` | `CreateLetter.html` | `letterController.submitDraft()` |
| `/letter/[id]` | `LetterDetail.html` | `letterController.getLetterDetail()`, `decide()`, `confirmWetSignatureUploaded()` |
| `/settings` | `Settings.html` | `adminController.listUsers()`/`upsertUser()`, `uploadSignature()` |

---

## Desain Struktur Google Drive

```
📁 Surat Menyurat (Root App Folder)
 ├── 📁 Templates/                 (master template per templateType — googleDocTemplateId merujuk ke sini)
 ├── 📁 Signatures/                 (gambar tanda tangan referensi, nama file = email approver)
 └── 📁 Letters/
      └── 📁 {letterId}/            (folder per surat, pakai UUID — bukan letterNumber — untuk menghindari karakter bermasalah)
           ├── 📄 {letterNumber-sanitized} - Draft        (Google Docs tanpa ekstensi, jalur tanda tangan basah)
           └── 📄 {letterNumber-sanitized} - {templateType}.pdf   (PDF final, jalur digital ATAU hasil unggah basah)
```

**Konvensi penamaan berkas:**

| Berkas | Pola nama | Contoh |
|---|---|---|
| Folder per surat | `{letterId}` | `a1b2c3d4-...` |
| PDF final (digital) | `{letterNumber-sanitized} - {templateType}.pdf` | `0051.SP1-VII-2026 - Surat Tugas.pdf` |
| Unsigned draft (basah) | `{letterNumber-sanitized} - Draft` | `0051.SP1-VII-2026 - Draft` |

**Aturan sanitasi:**
- Karakter `/` pada `letterNumber` diganti dengan `-`
- Karakter `\ : * ? " < > |` dihapus
- Panjang total nama berkas dibatasi 255 karakter; jika melebihi, komponen `{templateType}` dipotong dari belakang dengan tetap mempertahankan sufiks
- `finalFileName` (nama berkas setelah sanitasi, tanpa path) disimpan ke sheet `Letters` bersamaan dengan `finalPdfUrl`

- Jalur **digital**: `DocumentApp` menyalin template → suntik `contentData` + gambar tanda tangan → ekspor PDF dengan nama `{letterNumber-sanitized} - {templateType}.pdf` → simpan ke folder `Letters/{letterId}/` → catat `finalPdfUrl` dan `finalFileName` ke sheet `Letters`.
- Jalur **basah**: `DocumentApp` menyalin template → suntik `contentData` saja → simpan sebagai `{letterNumber-sanitized} - Draft` (Google Docs, tanpa ekstensi) di folder `Letters/{letterId}/` → bagikan akses *edit* ke `drafterEmail` dan seluruh `approvalFlow[].email` → setelah scan diunggah dan diverifikasi, catat `finalPdfUrl` dan `finalFileName` ke sheet `Letters`.

---

## Desain Alur Proses

### Login & Validasi Akses
1. `doGet()` di `Code.gs` memanggil `authService.getCurrentUser()`.
2. `authService` memanggil `Session.getActiveUser().getEmail()`, lalu `userRepository.findByEmail(email)`.
3. Jika `getEmail()` mengembalikan string kosong atau null → render `Login.html` dengan pesan "Sesi Google tidak terdeteksi, pastikan Anda sudah login ke akun Google".
4. Jika email **tidak ditemukan** di sheet `Users` → render `Login.html` dengan pesan "Email tidak terdaftar, hubungi Admin".
5. Jika email ditemukan tetapi `isActive = FALSE` → render `Login.html` dengan pesan "Akun Anda telah dinonaktifkan, hubungi Admin".
6. Jika ditemukan dan `isActive = TRUE` → simpan `{ email, name, role }` ke *template data* halaman, lanjut render `Dashboard.html`. Jika populasi template data gagal, halaman tetap dirender dengan data yang tersedia tanpa memblokir akses pengguna.

### Pembuatan Surat & Penomoran Atomik
1. `CreateLetter.html` submit → `letterController.submitDraft(formData)`.
2. `letterService.createDraft(formData)`:
   a. Validasi field wajib & minimal 1 approver.
   b. Panggil `numberingService.generateNumber(templateCode)`.
3. `numberingService.generateNumber()`:
   ```js
   const lock = LockService.getScriptLock();
   try {
     lock.waitLock(30000); // lempar exception jika timeout
     let counter = counterRepository.getOrCreate(counterId); // MM_YYYY berjalan
     // jika tidak ada baris untuk bulan-tahun ini, getOrCreate mengembalikan { currentSequence: 0 }
     if (counter.currentSequence >= 9999) {
       throw new Error('Batas nomor urut 9999 tercapai untuk periode ini');
     }
     counter.currentSequence += 1;
     counterRepository.save(counter);
     return formatNumber(counter.currentSequence, templateCode, month, year);
     // -> "0051.SP1/VII/2026"
   } finally {
     lock.releaseLock(); // selalu dilepas, termasuk saat exception
   }
   ```
4. `letterRepository.insert(letter)` menyimpan baris baru ke sheet `Letters` dengan `status = "In Review"`, `approvalFlow` dari input Drafter (`status: "pending"` semua).
5. `notificationService.notifyNextApprover(letter)` mengirim email ke `approvalFlow[0].email`.

### Alur Persetujuan Berjenjang
1. `LetterDetail.html` menampilkan tombol Approve/Reject hanya jika `email` pengguna aktif == `approvalFlow[i].email` **dan** semua elemen sebelum indeks `i` sudah `approved` (validasi ulang di server, jangan percaya client).
2. `letterController.decide(letterId, decision, notes)` → `letterService.processDecision(...)`:
   - **Reject**: set elemen `status = "rejected"`, `notes`, surat `status = "Rejected"`; tulis `ApprovalLog`; kirim notifikasi ke Drafter (email dikirim selalu, baik `notes` diisi maupun kosong); **stop**.
   - **Approve (bukan elemen terakhir)**: set elemen `status = "approved"`; tulis `ApprovalLog`; kirim notifikasi ke approver berikutnya.
   - **Approve (elemen terakhir / approver_final)**: minta `signatureMethod` (dari payload form) → lanjut ke finalisasi dokumen.

> **Validasi server** sebelum memproses keputusan (tidak bergantung pada data dari client): (a) email pengguna aktif cocok dengan elemen `approvalFlow` yang `pending`; (b) seluruh elemen sebelumnya sudah `approved` (urutan tidak bisa dilompati); (c) status surat adalah `In Review`.

### Finalisasi Dokumen (Digital vs Basah)
```
Approver terakhir Approve
        │
        ▼
 pilih signatureMethod?
   ├── "digital" ─────────────────────────────────────┐
   │                                                   ▼
   │                                   documentService.generateDigitalFinal(letter)
   │                                   → salin template, suntik data + signatureFileId
   │                                   → ekspor PDF → simpan finalPdfUrl
   │                                   → status = "Approved"
   │                                   (jika gagal setelah penyalinan template:
   │                                    documentService.cleanupPartialArtifact(fileId)
   │                                    → hapus salinan dari Drive, kembalikan error,
   │                                    → status surat TIDAK diubah menjadi "Approved")
   │
   └── "wet" ──────────────────────────────────────────┐
                                                         ▼
                                     documentService.generateUnsignedDraft(letter)
                                     → salin template, suntik data (tanpa tanda tangan)
                                     → simpan revisionId berkas sebagai unsignedDraftBaseRevisionId
                                     → share edit access ke drafter + semua approvalFlow
                                     → simpan unsignedDriveFileId
                                     → awaitingWetSignature = TRUE
                                     → status TETAP "In Review" (sub-label UI: "Menunggu
                                        Unggah Tanda Tangan Basah")
                                              │
                                              ▼
                          Drafter/Approver mengunggah hasil scan
                          (update versi pada unsignedDriveFileId, BUKAN file baru)
                                              │
                                              ▼
                          letterController.confirmWetSignatureUploaded(letterId)
                          (guard: awaitingWetSignature = TRUE divalidasi di server)
                          → documentService.verifyNewRevisionExists(unsignedDriveFileId,
                               unsignedDraftBaseRevisionId)
                          → bandingkan revisionId terkini dengan unsignedDraftBaseRevisionId
                          → jika sama: kembalikan error "Belum ada versi baru ditemukan"
                          → jika berbeda: finalPdfUrl = link ke unsignedDriveFileId
                          → awaitingWetSignature = FALSE
                          → status = "Approved"
```

### Notifikasi Email
`notificationService` (pakai `MailApp.sendEmail`) pada 4 pemicu:
1. Surat baru submit → email ke approver pertama.
2. Approve (bukan final) → email ke approver berikutnya.
3. Reject → email ke Drafter beserta isi `notes` jika ada (email dikirim selalu, baik `notes` diisi maupun kosong).
4. Approved (final, baik digital maupun setelah scan basah terverifikasi) → email ke Drafter berisi `finalPdfUrl`.

> Jika pengiriman email gagal (termasuk kuota `MailApp` habis), kegagalan **dicatat di log Apps Script** tanpa membatalkan operasi utama. Jika pencatatan log itu sendiri gagal, error pencatatan tetap diteruskan/ditampilkan secara eksplisit — tidak boleh ditelan diam-diam (*swallowed silently*).

---

## Diagram Status Surat

```
                 submit
      Draft ─────────────▶ In Review
                                │  reject (kapan pun sebelum final)
                                ├────────────────────────▶ Rejected
                                │
                                │  seluruh approver approve
                                │
                    ┌───────────┴───────────┐
             digital│                       │wet
                    ▼                       ▼
               Approved            In Review
          (langsung, sinkron)   (awaitingWetSignature=TRUE)
                                          │ scan diunggah (update versi)
                                          ▼
                                      Approved

  Status tambahan non-alur utama: Canceled, Booked (ditetapkan manual sesuai kebutuhan operasional)
  Catatan: Tidak ada status Processing PDF di Fase 0 (proses sinkron); diaktifkan kembali di Fase 1.
```

---

## Desain Keamanan & Validasi

- **Server-side is source of truth**: setiap `controller` memvalidasi ulang role & giliran approval sebelum memanggil `service`, meski tombol UI sudah disembunyikan di client (sesuai `security-policies.md`).
- **Whitelist email**: `authService.getCurrentUser()` dipanggil di *setiap* fungsi controller lain sebagai guard, bukan hanya saat render halaman awal.
- **Penomoran**: wajib melalui `LockService`; dilarang ada jalur lain yang menulis `Counters` tanpa lock.
- **Update versi Drive**: hanya `documentService` yang boleh memanggil operasi update konten berkas; tidak ada endpoint yang mengizinkan penggantian `unsignedDriveFileId` menjadi file lain.
- **Least privilege Drive sharing**: akses *edit* pada `unsigned-draft` hanya diberikan ke `drafterEmail` + email pada `approvalFlow`, bukan publik/domain-wide.
- **Formula injection Sheets**: nilai input pengguna yang diawali `=`, `+`, `-`, atau `@` wajib di-escape dengan prefix `'` sebelum ditulis ke sel — berlaku untuk semua kolom yang bersumber dari input pengguna (nama, NIK, catatan revisi, dll.).
- **Sanitasi nama berkas & folder Drive**: nama folder per surat menggunakan `{letterId}` (UUID) untuk menghindari karakter bermasalah. Nama berkas PDF dan `unsigned-draft` dibentuk dari `letterNumber` yang sudah disanitasi (karakter `/` diganti `-`, karakter `\ : * ? " < > |` dihapus) dikombinasikan dengan `templateType` — diproses oleh `buildSanitizedFileName` sebelum digunakan ke Drive API.
- **Validasi format email**: saat mendaftarkan pengguna baru, `adminController.upsertUser` memvalidasi email (satu karakter `@`, domain mengandung setidaknya satu titik, panjang keseluruhan ≤ 254 karakter) sebelum menulis ke sheet `Users`.
- **Self-deactivation guard**: Admin tidak dapat menonaktifkan akun sendiri — divalidasi di server sebelum operasi `upsertUser` dijalankan; jika email target sama dengan email pengguna aktif, operasi ditolak.
- **Batas ukuran tanda tangan**: berkas yang diunggah ke folder `Signatures/` dibatasi 2 MB dan hanya menerima format JPEG/PNG — divalidasi sebelum menyimpan ke Drive; jika tidak memenuhi, unggahan ditolak dan tidak ada berkas yang ditulis.
- **Overflow counter**: jika `currentSequence` sudah mencapai 9999 saat `generateNumber()` dipanggil, sistem mengembalikan error kepada Controller tanpa menulis ke sheet `Counters`.

---

## Correctness Properties

*A property is a characteristic or behavior that should hold true across all valid executions of a system — essentially, a formal statement about what the system should do. Properties serve as the bridge between human-readable specifications and machine-verifiable correctness guarantees.*

### Property 1: Atomicity of Letter Numbering

*For any* two concurrent `generateNumber()` calls for the same `templateCode` and month-year combination, the two calls SHALL produce different `LetterNumber` values. `LockService` ensures mutual exclusion during the counter read-increment-write cycle, so no two letters can receive the same sequence number.

**Validates: Requirements 5.3, 5.4**

### Property 2: Sequential Approval Invariant

*For any* `decide` operation targeting `approvalFlow[i]`, the operation SHALL only succeed if all elements `approvalFlow[0..i-1]` have status `approved`. This invariant is validated server-side on every call, regardless of data sent by the client.

**Validates: Requirements 6.2, 12.2**

### Property 3: Wet Signature Revision Integrity

*For any* call to `confirmWetSignatureUploaded`, the letter SHALL only transition to `Approved` if the current `revisionId` of `unsignedDriveFileId` differs from `unsignedDraftBaseRevisionId` stored in sheet `Letters`. A matching `revisionId` means no new file version was uploaded and the operation SHALL be rejected with an appropriate error.

**Validates: Requirements 8.6, 8.7, 8.8**

### Property 4: Authentication Guard Completeness

*For every* Controller function invoked via `google.script.run`, `authService.getCurrentUser()` SHALL be the first operation executed. No business logic SHALL execute if this guard returns a user that is not found in the whitelist or has `isActive = FALSE`.

**Validates: Requirements 1.7, 12.1**

### Property 5: Drive Artifact Cleanup on Failure

*For any* execution of `generateDigitalFinal` that fails after the template copy step, `cleanupPartialArtifact` SHALL delete the partial Drive copy before the error is returned to the Controller. The letter `status` SHALL NOT be set to `Approved` as a result of a failed `generateDigitalFinal` call.

**Validates: Requirements 7.8**

---

## Error Handling

Error handling mengikuti prinsip: operasi utama tidak dibatalkan karena kegagalan efek samping (notifikasi), tetapi kegagalan yang menyentuh data inti selalu dikembalikan secara eksplisit ke Controller tanpa mutasi parsial.

- **Kegagalan autentikasi**: Controller mengembalikan objek error terstruktur ke client tanpa mengekspos detail internal (stack trace, nama sheet, dsb.).
- **LockService timeout (>30 detik)**: `numberingService.generateNumber()` melempar exception; Controller membatalkan pembuatan surat dan mengembalikan pesan error ke pengguna tanpa menulis ke sheet `Letters` atau `Counters`.
- **Counter overflow (sequence = 9999)**: `numberingService` mengembalikan indikasi kegagalan ke Controller tanpa menulis ke sheet `Counters`; pembuatan surat dibatalkan.
- **Kegagalan `generateDigitalFinal`**: setelah penyalinan template, `cleanupPartialArtifact` dipanggil untuk menghapus salinan parsial dari Drive; error dikembalikan ke Controller; status surat tidak berubah menjadi `Approved`.
- **Kegagalan `generateUnsignedDraft`**: status surat dipertahankan pada nilai sebelum aksi dijalankan; nilai `awaitingWetSignature` tidak berubah; error dikembalikan ke Approver.
- **Kegagalan pengiriman email**: kegagalan dicatat di log Apps Script tanpa membatalkan operasi utama (simpan/update status surat). Jika pencatatan kegagalan itu sendiri gagal, error pencatatan diteruskan/ditampilkan secara eksplisit — tidak boleh ditelan diam-diam.
- **Kegagalan tulis Sheets** (sheet `Users`, `Letters`, `Counters`): Controller mengembalikan pesan error deskriptif tanpa mutasi parsial — tidak ada baris yang ditulis setengah jalan.

---

## Testing Strategy

Karena Apps Script tidak memiliki test runner bawaan, pengujian dilakukan dengan pola mock objek dan spreadsheet pengujian terpisah.

- **Unit test Service**: setiap fungsi Service diuji dengan objek Repository palsu (mock) — tidak ada pemanggilan `SpreadsheetApp`/`DriveApp` nyata. Isolasi ini memungkinkan pengujian logika bisnis murni tanpa kuota Google API.
- **`numberingService.generateNumber()`**: diuji dengan simulasi pemanggilan konkuren untuk memverifikasi bahwa invariant `LockService` terpenuhi dan tidak ada sequence yang diduplikasi.
- **`authService.getCurrentUser()`**: diuji dengan mock pengguna yang `isActive = FALSE` dan email tidak terdaftar untuk memverifikasi perilaku guard di setiap skenario penolakan.
- **`letterService.processDecision()`**: diuji dengan skenario approve di luar urutan (elemen ke-2 di-approve sebelum elemen ke-1) untuk memverifikasi invariant sekuensial ditolak di server.
- **`documentService.generateDigitalFinal()` failure path**: diuji untuk memverifikasi bahwa `cleanupPartialArtifact` dipanggil dan status surat tidak berubah menjadi `Approved` saat terjadi kegagalan setelah penyalinan template.
- **Integration test**: alur lengkap `submitDraft → decide → generateDigitalFinal` diuji menggunakan spreadsheet pengujian terpisah (bukan `AppDatabase` produksi) untuk memverifikasi integrasi antar layer dari Controller hingga Sheets/Drive.

---

## Konvensi Kode & Commit

- Penamaan file `.gs`/fungsi mengikuti §3 `architecture_rules.md` (kebab-case dengan suffix layer untuk file; camelCase untuk fungsi/variabel; PascalCase untuk struktur data/model bila dibuatkan constructor, contoh `Letter`, `User`).
- Commit message memakai Conventional Commits sesuai `commit_rules.md`, contoh scope yang disarankan: `auth`, `letter`, `numbering`, `document`, `notification`, `admin`, `sheet`.
  - Contoh: `feat(document): add wet signature drive versioning flow`
  - Contoh: `fix(numbering): prevent duplicate sequence under concurrent lock`

---

## Catatan Migrasi ke Fase 1+

- Sheet `Users`, `Letters`, `Counters` dirancang agar kolomnya **selaras 1:1** dengan collection Firestore pada `schema.md`, sehingga migrasi tinggal memetakan baris Sheet → dokumen Firestore (email tetap dipakai sebagai identitas, bisa dipetakan ke `uid` Firebase Auth saat migrasi).
- Field baru di Fase 0 (`signatureMethod`, `awaitingWetSignature`, `unsignedDriveFileId`, `unsignedDraftBaseRevisionId`, `finalFileName`) perlu ditambahkan ke `schema.md`/skema Firestore saat Fase 1, karena kebutuhan pilihan tanda tangan basah dan tampilan nama berkas di UI berlaku lintas fase. Khususnya `finalFileName` perlu ditambahkan ke skema Firestore agar tampilan nama berkas di UI tidak bergantung pada parsing URL.
- Status `Processing PDF` **diaktifkan kembali di Fase 1** ketika `documentService` dipindah ke Firebase Cloud Functions yang berjalan asinkron (lihat `requirements.md` Catatan Teknis); diagram status di atas perlu ditambah satu state transisi saat migrasi.
- Sheet `ApprovalLog` dapat langsung menjadi acuan struktur *collection* `approvalLogs` di Fase 1 untuk kebutuhan audit trail yang sama.
