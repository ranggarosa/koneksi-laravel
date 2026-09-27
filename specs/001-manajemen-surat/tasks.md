# Tasks: Sistem Manajemen Surat Menyurat (Koneksi)

**Feature**: `specs/001-manajemen-surat/spec.md`  
**Plan**: `specs/001-manajemen-surat/plan.md`  
**Status**: Ready for Implementation  

Daftar tugas implementasi terstruktur berdasarkan user story (prioritas P1 → P2 → P3) dengan pemetaan dependensi, peluang eksekusi paralel, dan kriteria pengujian mandiri.

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: Inisialisasi struktur proyek, konfigurasi runtime Apps Script, konstanta global, dan framework pengujian.

- [x] T001 Configure Apps Script manifest `appsscript.json` with V8 runtime, timeZone "Asia/Jakarta", and OAuth scopes (Sheets, Drive, Docs, Gmail)
- [x] T002 [P] Define application constants, status/role enums, and Script Properties keys in `Constants.gs`
- [x] T003 [P] Implement utility functions (ISO date formatter, roman numeral month converter, path sanitization, and UUID generator) in `Utils.gs`
- [x] T004 [P] Implement lightweight test assertion helpers (`assertEqual`, `assertTrue`, `assertThrows`, mock repository helpers, and `runAllTests` runner) in `TestUtils.gs`

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: Infrastruktur penyimpanan Google Sheets, sanitasi data, autentikasi whitelist, dan layout shell aplikasi yang menjadi prasyarat seluruh user story.

**⚠️ CRITICAL**: Pengerjaan user story tidak dapat dimulai sebelum fase fondasi ini selesai.

- [x] T005 Implement generic spreadsheet CRUD and formula injection escaping (`=`, `+`, `-`, `@`) in `sheet.repository.gs`
- [x] T006 [P] Implement user repository for sheet `Users` (`email` PK, `name`, `role` enum, `signatureFileId`, `isActive` boolean, `createdAt`) in `user.repository.gs`
- [x] T007 [P] Implement counter repository for sheet `Counters` (`counterId` PK `{templateCode}_{month}_{year}`, `currentSequence`, `recycledNumbers` JSON array) in `counter.repository.gs`
- [x] T008 [P] Implement audit log repository for sheet `ApprovalLog` (`logId`, `letterId`, `actorEmail`, `action`, `notes`, `timestamp`) in `sheet.repository.gs`
- [x] T009 Implement server-side whitelist authentication service (`getCurrentUser` verifying email and `isActive === true`) in `auth.service.gs`
- [x] T010 Implement auth controller interface exposing `getCurrentUser()` with server-side guards per contracts/auth-contract.md in `auth.controller.gs`
- [x] T011 [P] Create main application entry point and HTML include router (`doGet` serving `Index.html`, `include(filename)` helper) in `Code.gs`
- [x] T012 [P] Create shared UI stylesheets and design tokens in `Stylesheet.html`
- [x] T013 [P] Create shared client-side script router and `google.script.run` promise wrapper in `JavaScript.html`
- [x] T014 Create master application shell and routing container in `Index.html`

**Checkpoint**: Fondasi dan repositori data siap — implementasi user story dapat dimulai.

---

## Phase 3: User Story 1 - Pembuatan Draf Surat & Penomoran Otomatis Unik (Priority: P1) 🎯 MVP

**Goal**: Drafter dapat membuat draf surat dari template dinamis, menentukan peninjau secara dinamis, dan memperoleh nomor surat resmi unik atomik bebas duplikasi.

**Independent Test**: Drafter login, mengisi form draf SP1, memilih 1 Reviewer dan 1 Approver, lalu mengirim draf. Sistem menerbitkan nomor unik berformat `0001.SP1/IX/2026` dan draf tersimpan dengan status `In Review`.

### Tests for User Story 1 ⚠️
- [x] T015 [P] [US1] Create automated unit test verifying duplicate-free atomic sequence generation and FIFO recycled pool allocation under simulated concurrency in `numbering.test.gs`

### Implementation for User Story 1
- [x] T016 [P] [US1] Implement letter repository CRUD for sheet `Letters` (`letterId` PK, `letterNumber`, `templateType`, `templateCode`, `contentData` JSON, `status`, `drafterEmail`, `approvalFlow` JSON) in `letter.repository.gs`
- [x] T017 [US1] Implement atomic sequence generation with `LockService` (timeout 30s) and recycled pool priority in `numbering.service.gs`
- [x] T018 [US1] Implement draft creation, field validation, dynamic reviewer/approver assignment, and self-approval prevention validation (Drafter cannot be in reviewers or approver) in `letter.service.gs`
- [x] T019 [US1] Implement `submitDraft(formData)` endpoint with drafter role verification per contracts/letter-contract.md in `letter.controller.gs`
- [x] T020 [US1] Create dynamic draft creation form interface with template selection, variable inputs, and dynamic reviewer/approver selection (excluding current user email from candidate options) in `CreateLetter.html`

**Checkpoint**: User Story 1 fungsional penuh dan dapat diuji secara mandiri (MVP Baseline).

---

## Phase 4: User Story 2 - Alur Persetujuan Berjenjang & Catatan Revisi (Priority: P1)

**Goal**: Peninjau dapat memeriksa draf sesuai giliran, menyetujui (melanjutkan alur) atau menolak (mengunci arsip draf permanen, mewajibkan alasan revisi, dan merilis nomor ke recycled pool).

**Independent Test**: Reviewer menyetujui draf (giliran beralih ke Approver). Pada pengujian terpisah, Reviewer menolak draf: status terkunci menjadi `Rejected`, nomor surat masuk ke `recycledNumbers`, dan Drafter dapat menyalin data untuk draf baru.

### Tests for User Story 2 ⚠️
- [x] T021 [P] [US2] Create automated unit test verifying sequential approval enforcement ($1 \dots n$), premature approval rejection, and immediate terminal lock upon rejection in `letter.test.gs`

### Implementation for User Story 2
- [x] T022 [US2] Implement sequential approval progression, role verification, and terminal rejection with revision notes in `letter.service.gs`
- [x] T023 [US2] Implement released number return to `recycledNumbers` array in `counter.repository.gs` upon letter rejection
- [x] T024 [US2] Implement `decide(letterId, decision, notes, signatureMethod)` endpoint in `letter.controller.gs`
- [x] T025 [US2] Implement `getLetterDetail(letterId)` endpoint returning letter metadata, approval flow status, and audit logs in `letter.controller.gs`
- [x] T026 [US2] Create letter detail and approval interface with approval chain timeline, decision modal, and revision notes form in `LetterDetail.html`

**Checkpoint**: User Story 1 dan User Story 2 terintegrasi penuh.

---

## Phase 5: User Story 3 - Finalisasi Dokumen dengan Tanda Tangan Digital atau Basah (Priority: P1)

**Goal**: Approver akhir dapat memilih metode pengesahan: Tanda Tangan Digital (otomatis inject tanda tangan & terbit PDF final) atau Tanda Tangan Basah (draf unsigned di Drive, diunggah via form scan di Web App).

**Independent Test**: Approver akhir memilih "digital" → PDF final terbit dengan tanda tangan terpasang dan status `Approved`. Approver akhir memilih "wet" → status tertahan `In Review`, pengguna mengunggah berkas scan di `LetterDetail.html`, revisi Drive terupdate, dan status berubah `Approved`.

### Tests for User Story 3 ⚠️
- [x] T027 [P] [US3] Create automated unit test verifying template copy, placeholder replacement, digital signature injection, and wet signature revision verification in `document.test.gs`

### Implementation for User Story 3
- [x] T028 [US3] Implement Google Docs template duplication, `{{variable}}` substitution, digital signature image injection, and synchronous PDF export in `document.service.gs`
- [x] T029 [US3] Implement unsigned Google Doc draft generation, Drive folder creation (`Letters/{letterId}/`), and least-privilege Editor permission sharing in `document.service.gs`
- [x] T030 [US3] Implement wet signature scan upload and revision updating via `Drive.Files.update` and revision ID verification in `document.service.gs`
- [x] T031 [US3] Implement `uploadWetSignatureScan(letterId, fileBase64, mimeType, fileName)` endpoint in `letter.controller.gs`
- [x] T032 [US3] Implement digital signature selection UI and wet signature scan upload form in `LetterDetail.html`

**Checkpoint**: Seluruh alur inti P1 (Draf → Approval → Finalisasi) lengkap dan terverifikasi.

---

## Phase 6: User Story 4 - Autentikasi Pengguna & Whitelist Akses (Priority: P2)

**Goal**: Pengguna diautentikasi terhadap sheet `Users`. Akun non-whitelist/non-aktif ditolak. Admin dapat mengelola pengguna dan Approver dapat mengunggah tanda tangan referensi.

**Independent Test**: Login dengan email tidak terdaftar diarahkan ke `Login.html` (ditolak). Login sebagai Admin dapat menambah email baru dan mengubah status `isActive`.

### Tests for User Story 4 ⚠️
- [x] T033 [P] [US4] Create automated unit test verifying whitelist matching, unknown email rejection, and inactive user lockout in `auth.test.gs`

### Implementation for User Story 4
- [x] T034 [US4] Implement user management logic and approver signature file storage in `auth.service.gs`
- [x] T035 [US4] Implement admin endpoints `listUsers()`, `upsertUser(userData)`, and `uploadSignature(fileBase64, mimeType)` in `admin.controller.gs`
- [x] T036 [US4] Create access denied and unwhitelisted landing page in `Login.html`
- [x] T037 [US4] Create user management panel (Admin) and signature upload interface (Approver) in `Settings.html`

**Checkpoint**: Manajemen akses dan otentikasi whitelist beroperasi penuh.

---

## Phase 7: User Story 5 - Dashboard Pemantauan, Privasi & Riwayat Surat (Priority: P2)

**Goal**: Pengguna memiliki dashboard dengan tab filter surat sesuai privasi: draf dalam proses hanya untuk partisipan/Admin, surat `Approved` menjadi arsip terbuka.

**Independent Test**: Drafter melihat drafnya di "Draf Saya". Reviewer melihat surat giliran aktifnya di "Perlu Tindakan". Pegawai lain hanya dapat melihat surat yang sudah berstatus `Approved` di "Arsip Surat".

### Implementation for User Story 5
- [x] T038 [US5] Implement privacy-filtered letter retrieval in `letter.service.gs` (restricting in-review drafts to participants/Admin, exposing approved letters as open archive)
- [x] T039 [US5] Implement `getLettersForUser(filterType)` endpoint supporting tabs `my_turn`, `my_drafts`, `all_approved`, and `all` in `letter.controller.gs`
- [x] T040 [US5] Create dashboard view with multi-tab filters ("Perlu Tindakan", "Draf Saya", "Arsip Surat") and search bar in `Dashboard.html`

**Checkpoint**: Dashboard monitoring dan kebijakan privasi dokumen selesai.

---

## Phase 8: User Story 6 - Notifikasi Email Otomatis (Priority: P3)

**Goal**: Sistem mengirimkan email otomatis kepada peninjau giliran berikutnya dan pemberitahuan hasil akhir (disetujui/ditolak) kepada Drafter.

**Independent Test**: Draf diajukan → email notifikasi terkirim ke Reviewer 1. Reviewer menolak draf → email notifikasi alasan revisi masuk ke Drafter.

### Implementation for User Story 6
- [x] T041 [P] [US6] Implement email notification templates and dispatching via `MailApp.sendEmail()` in `notification.service.gs`
- [x] T042 [US6] Integrate notification triggers into `letter.service.gs` upon draft submission, reviewer approval transition, rejection, and final approval
- [x] T043 [US6] Add daily quota error handling and fallback logging in `notification.service.gs`

**Checkpoint**: Seluruh 6 User Story telah terimplementasi dan terhubung.

---

## Phase 9: Polish & Cross-Cutting Concerns

**Purpose**: Penyempurnaan keamanan, penanganan error pembersihan berkas parsial, verifikasi test suite menyeluruh, dan validasi quickstart.

- [x] T044 [P] Implement partial artifact cleanup in `document.service.gs` (`cleanupPartialArtifact(fileId)`) to remove orphaned Drive files if PDF generation fails
- [x] T045 [P] Sanitize all client-side rendered fields in `JavaScript.html` to prevent XSS attacks
- [x] T046 Execute and verify all automated test suites via `runAllTests()` in `TestUtils.gs`
- [x] T047 Execute end-to-end manual validation scenarios following quickstart.md
- [x] T048 Update project version and release metadata in `VERSION` and `README.md`

---

## Dependencies & Execution Order

### Phase Dependencies
1. **Phase 1 (Setup)**: Tidak ada dependensi — langsung dapat dikerjakan.
2. **Phase 2 (Foundational)**: Bergantung pada Phase 1 — **MEMBLOKIR** seluruh user story.
3. **Phase 3 (User Story 1 - MVP)**: Bergantung pada Phase 2 — mendirikan fondasi pembuatan draf & penomoran.
4. **Phase 4 (User Story 2)**: Bergantung pada Phase 3 — menambahkan alur approval pada draf yang dibuat di US1.
5. **Phase 5 (User Story 3)**: Bergantung pada Phase 4 — menyelesaikan approval final dengan tanda tangan.
6. **Phase 6 (User Story 4)**: Bergantung pada Phase 2 — manajemen whitelist pengguna & profil tanda tangan.
7. **Phase 7 (User Story 5)**: Bergantung pada Phase 3 & 4 — menampilkan draf dan status approval di dashboard.
8. **Phase 8 (User Story 6)**: Bergantung pada Phase 3, 4, 5 — mentrigger email pada setiap event surat.
9. **Phase 9 (Polish)**: Bergantung pada penyelesaian seluruh User Story yang ditargetkan.

---

## Parallel Opportunities

```bash
# Parallel execution in Phase 1 (Setup):
Task T002: Define application constants in Constants.gs
Task T003: Implement utility functions in Utils.gs
Task T004: Implement lightweight test assertion helpers in TestUtils.gs

# Parallel execution in Phase 2 (Foundational):
Task T006: Implement user repository in user.repository.gs
Task T007: Implement counter repository in counter.repository.gs
Task T008: Implement audit log repository in sheet.repository.gs
Task T011: Create main entry point in Code.gs
Task T012: Create shared stylesheets in Stylesheet.html
Task T013: Create client-side script router in JavaScript.html

# Parallel execution in Phase 3 (US1):
Task T015: Create automated unit test in numbering.test.gs
Task T016: Implement letter repository CRUD in letter.repository.gs
```

---

## Implementation Strategy

### MVP First (Phases 1, 2, and 3)
1. Selesaikan **Phase 1** (Setup) & **Phase 2** (Foundational).
2. Selesaikan **Phase 3** (User Story 1).
3. **Validasi MVP**: Jalankan `numbering.test.gs` dan lakukan pengujian pembuatan draf dengan nomor surat unik. Pada tahap ini, sistem sudah memiliki nilai guna awal (*viable core*).
4. Lanjutkan secara inkremental ke **Phase 4** (Approval), **Phase 5** (Finalisasi Dokumen), dan seterusnya.
