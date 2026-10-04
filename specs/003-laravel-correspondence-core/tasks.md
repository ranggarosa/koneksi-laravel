# Tasks: Aplikasi Pengelolaan Naskah Dinas & Penomoran Surat (Koneksi Core)

**Feature**: [spec.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/spec.md) | **Plan**: [plan.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/plan.md) | **Branch**: `003-laravel-correspondence-core`

This document outlines the granular, dependency-ordered implementation tasks for the Koneksi Core Laravel application.

---

## Phase 1: Setup (Project Skeleton & Toolchain Initialization)

**Purpose**: Initialize the Laravel 13.x framework skeleton, Docker Sail container stack, Tailwind CSS, code styling, and deployment definitions.

- [ ] T001 Initialize Laravel 13 project skeleton, directory structure, and dependencies in `composer.json`
- [ ] T002 Configure Docker Sail environment for PHP 8.3 and PostgreSQL 16 in `docker-compose.yml` and `.env.example`
- [ ] T003 [P] Configure frontend build tooling with Vite, PostCSS, and Tailwind CSS in `vite.config.js` and `resources/css/app.css`
- [ ] T004 [P] Configure Laravel Pint code formatting standards in `pint.json`
- [ ] T005 [P] Create Heroku deployment configuration defining web, worker, and release migration processes in `Procfile`

---

## Phase 2: Foundational (Database Migrations, Core Models & Layout)

**Purpose**: Establish core database tables, models, layouts, and audit service required by all user stories.

**⚠️ CRITICAL**: No user story implementation can begin until this phase is complete.

- [ ] T006 Create database migration for `users` table with roles (`admin`, `drafter`, `reviewer`, `approver`) and `is_active` flag in `database/migrations/0001_01_01_000000_create_users_table.php`
- [ ] T007 [P] Create database migration for `letter_templates` table with JSONB `content_schema` and `default_tiers` in `database/migrations/2026_10_04_000001_create_letter_templates_table.php`
- [ ] T008 [P] Create database migration for `letters` table with `status`, `reference_number`, `signature_type`, `reconciliation_deadline`, and `softDeletes` in `database/migrations/2026_10_04_000002_create_letters_table.php`
- [ ] T009 [P] Create database migration for `approval_workflows` table with `step_order`, `role_type`, `status`, and `notes` in `database/migrations/2026_10_04_000003_create_approval_workflows_table.php`
- [ ] T010 [P] Create database migration for `letter_counters` table with unique constraint on `(template_code, month, year)` in `database/migrations/2026_10_04_000004_create_letter_counters_table.php`
- [ ] T011 [P] Create database migration for `recycled_number_pools` table in `database/migrations/2026_10_04_000005_create_recycled_number_pools_table.php`
- [ ] T012 [P] Create database migration for `audit_logs` table (immutable append-only) in `database/migrations/2026_10_04_000006_create_audit_logs_table.php`
- [ ] T013 Implement Eloquent Models with relationships, `$fillable` guards, and casts in `app/Models/` (`User.php`, `Letter.php`, `LetterTemplate.php`, `ApprovalWorkflow.php`, `LetterCounter.php`, `RecycledNumberPool.php`, `AuditLog.php`)
- [ ] T014 Implement immutable event logging in `app/Services/AuditService.php`
- [ ] T015 [P] Create feature test for immutable audit logging and hard-delete rejection in `tests/Feature/AuditLogTest.php`
- [ ] T016 Create base Blade layouts (`resources/views/layouts/app.blade.php`, `resources/views/layouts/guest.blade.php`) and SVG icon components adhering strictly to the zero-emoji rule (Principle VI)

**Checkpoint**: Core foundation ready — database schema, models, audit service, and layouts are operational.

---

## Phase 3: User Story 1 - Pembuatan Draf Surat Internal & Penomoran Unik Otomatis (Priority: P1) 🎯 MVP

**Goal**: Enable Drafters to draft internal letters from templates, select dynamic reviewers, and receive atomic race-condition-safe sequence numbers.

**Independent Test**: Login as `drafter@koneksi.local`, submit an internal draft with dynamic reviewers. Verify atomic reference number generation (e.g. `0001.SKK/X/2026`), status locked to `In Review`, and verify drafter cannot select themselves as reviewer.

### Tests for User Story 1
- [ ] T017 [P] [US1] Create unit tests for atomic sequence number allocation, date partitioning, and Roman numeral conversion in `tests/Unit/NumberingServiceTest.php`
- [ ] T018 [P] [US1] Create feature tests for draft creation, form validation, and separation-of-duties enforcement in `tests/Feature/LetterDraftTest.php`

### Implementation for User Story 1
- [ ] T019 [US1] Implement `NumberingService` in `app/Services/NumberingService.php` using PostgreSQL `DB::transaction` with `lockForUpdate` on `letter_counters`
- [ ] T020 [US1] Implement `LetterPolicy` enforcing Separation of Duties (Drafter cannot review or approve own letter) in `app/Policies/LetterPolicy.php`
- [ ] T021 [US1] Create `StoreLetterRequest` input validation class in `app/Http/Requests/StoreLetterRequest.php`
- [ ] T022 [US1] Implement `LetterService@createDraft` and `LetterController@store` in `app/Services/LetterService.php` and `app/Http/Controllers/LetterController.php`
- [ ] T023 [US1] Build Blade view for internal letter creation with dynamic template schema in `resources/views/letters/create.blade.php`

**Checkpoint**: User Story 1 complete — Drafter can create internal drafts and allocate unique reference numbers atomik.

---

## Phase 4: User Story 2 - Alur Peninjauan Bertingkat & Penolakan Naskah (Priority: P1)

**Goal**: Implement sequential multi-step approval, terminal rejection with mandatory revision notes, and release of numbers to the FIFO recycled pool.

**Independent Test**: Login as `reviewer@koneksi.local` on a 2-tier letter (e.g. SP1), approve step 1, verify step 2 opens for `approver@koneksi.local`. Reject a letter with notes; verify status becomes `Rejected` permanently, and the letter number is recycled and reused on the next draft.

### Tests for User Story 2
- [ ] T024 [P] [US2] Create unit tests for FIFO recycled number pool claiming and release logic in `tests/Unit/RecycledNumberPoolTest.php`
- [ ] T025 [P] [US2] Create feature tests for sequential approval order, rejection lock, and recycled number reuse in `tests/Feature/ApprovalWorkflowTest.php`

### Implementation for User Story 2
- [ ] T026 [US2] Extend `NumberingService` with `releaseNumberToPool` and `claimRecycledNumber` methods in `app/Services/NumberingService.php`
- [ ] T027 [US2] Create `ApproveLetterRequest` and `RejectLetterRequest` in `app/Http/Requests/` enforcing mandatory notes on rejection
- [ ] T028 [US2] Implement sequential sign-off and terminal rejection in `app/Services/LetterService.php` and `app/Http/Controllers/ApprovalController.php`
- [ ] T029 [US2] Build letter detail and review view with step progression and audit history in `resources/views/letters/show.blade.php` and `resources/views/components/audit-timeline.blade.php`

**Checkpoint**: User Story 2 complete — Multi-tier approval sequencing, terminal rejection, and recycled number pool are fully functional.

---

## Phase 5: User Story 3 - Finalisasi Pengesahan Dokumen: Tanda Tangan Digital vs Basah (Priority: P1)

**Goal**: Complete correspondence lifecycle through either instant Digital Signature PDF generation or Wet Signature physical scan upload and verification.

**Independent Test**: Approver approves via Digital Signature; verify PDF generates with digital signature imagery and status becomes `Approved`. Approver approves via Wet Signature; verify status becomes `Awaiting Wet Signature`, drafter uploads signed PDF scan, and status transitions to `Approved`.

### Tests for User Story 3
- [ ] T030 [P] [US3] Create feature test for digital PDF generation vs wet signature scan upload in `tests/Feature/DocumentFinalizationTest.php`

### Implementation for User Story 3
- [ ] T031 [US3] Create printable official letter HTML template for Dompdf in `resources/views/pdf/letter-template.blade.php`
- [ ] T032 [US3] Implement `DocumentService` in `app/Services/DocumentService.php` with Dompdf compilation and dual storage driver handling (local vs S3/R2)
- [ ] T033 [US3] Create asynchronous PDF generation job `GenerateLetterPdfJob` implementing `ShouldQueue` in `app/Jobs/GenerateLetterPdfJob.php`
- [ ] T034 [US3] Create `UploadScanRequest` in `app/Http/Requests/UploadScanRequest.php` validating PDF MIME type and size limits
- [ ] T035 [US3] Implement physical scan upload and verification in `app/Http/Controllers/ScanController.php` and `resources/views/letters/upload-scan.blade.php`
- [ ] T036 [US3] Implement secure letter PDF download in `app/Http/Controllers/LetterController.php` using presigned URLs (production) or local asset routes (development)

**Checkpoint**: User Story 3 complete — Both digital and wet signature finalization paths produce verified, approved archival documents.

---

## Phase 6: User Story 4 - Reservasi Nomor Surat Eksternal / Ambil Nomor (Priority: P2)

**Goal**: Allow Drafters to reserve standalone letter numbers for external/physical documents with 1-step Approver sign-off and a 7-day upload reconciliation window.

**Independent Test**: Submit an Ambil Nomor request with non-backdated date, Approver approves, number is allocated with status `Pending Upload` and 7-day deadline. Upload scan to approve, or verify expiration after 7 days releases the number.

### Tests for User Story 4
- [ ] T037 [P] [US4] Create feature test for standalone external number reservation, 7-day reconciliation window, and expiration in `tests/Feature/TakeNumberTest.php`

### Implementation for User Story 4
- [ ] T038 [US4] Create `TakeNumberRequest` in `app/Http/Requests/TakeNumberRequest.php` enforcing non-backdated dates and mandatory metadata
- [ ] T039 [US4] Implement standalone external reservation in `app/Services/LetterService.php` and `app/Http/Controllers/TakeNumberController.php`
- [ ] T040 [US4] Build external number reservation view in `resources/views/take-number/create.blade.php`
- [ ] T041 [US4] Implement expiration check command `CheckExpiredReservationsCommand` in `app/Console/Commands/CheckExpiredReservationsCommand.php` to auto-expire reservations and release numbers to recycled pool

**Checkpoint**: User Story 4 complete — Standalone Ambil Nomor external workflow is fully operational.

---

## Phase 7: User Story 5 - Manajemen Pengguna Contoh & Akses Peran Terpadu (Priority: P2)

**Goal**: Provision 4 seeded sample accounts (`admin`, `drafter`, `reviewer`, `approver`), standard authentication, role-based dashboard, and a 1-click Quick Switch User bar for local development.

**Independent Test**: Run database seed; verify all 4 accounts login with password `password`. Test the Quick Switch bar in `APP_ENV=local` to jump between roles instantly. Verify unauthorized access attempts are blocked.

### Tests for User Story 5
- [ ] T042 [P] [US5] Create feature test verifying authentication, role access policies, and inactive account lockout in `tests/Feature/AuthTest.php`

### Implementation for User Story 5
- [ ] T043 [US5] Implement `DatabaseSeeder` in `database/seeders/DatabaseSeeder.php` provisioning 4 sample accounts with password `password`
- [ ] T044 [US5] Implement authentication controllers and views in `app/Http/Controllers/AuthController.php` and `resources/views/auth/login.blade.php`
- [ ] T045 [US5] Implement `DevController` and `<x-quick-switch-bar />` component in `app/Http/Controllers/DevController.php` and `resources/views/components/quick-switch-bar.blade.php` guarded strictly by `app()->isLocal()`
- [ ] T046 [US5] Implement role-filtered dashboard controller in `app/Http/Controllers/DashboardController.php` and `resources/views/dashboard/index.blade.php`

**Checkpoint**: User Story 5 complete — 4 sample users, authentication, dashboard, and 1-click local role switcher are ready for testing.

---

## Phase 8: User Story 6 - Penanganan Kasus Riil Pembuatan Surat (Priority: P3)

**Goal**: Seed 4 concrete letter templates (SKK, SP1, SK, PKS) and provide a public letter agenda book for approved correspondence.

**Independent Test**: Verify SKK (1-step digital), SP1 (2-tier review), SK (wet signature scan), and PKS (Ambil Nomor) work end-to-end and display correctly in the public letter agenda.

### Tests for User Story 6
- [ ] T047 [P] [US6] Create end-to-end test executing all 4 concrete letter cases from drafting to final approval in `tests/Feature/RealLetterCasesTest.php`

### Implementation for User Story 6
- [ ] T048 [US6] Seed 4 real-world letter templates (SKK, SP1, SK, PKS) with their content schemas in `database/seeders/LetterTemplateSeeder.php`
- [ ] T049 [US6] Build public letter agenda book controller and view in `app/Http/Controllers/AgendaController.php` and `resources/views/agenda/index.blade.php`

**Checkpoint**: User Story 6 complete — Real-world correspondence templates and public letter agenda are fully operational.

---

## Phase 9: Polish, Cleanup & Legacy Decommissioning

**Purpose**: Decommission deprecated Google Apps Script source files, remove obsolete Clasp dependencies, update repository configuration, and validate end-to-end tests.

- [ ] T050 [P] Decommission and remove legacy Google Apps Script source files in `src/`
- [ ] T051 [P] Remove legacy Clasp configuration files (`.clasp.json`, `.claspignore`) and remove unused `@google/clasp` from root `package.json`
- [ ] T052 [P] Update root `.gitignore` to include Laravel, Vite, and vendor patterns, removing legacy Clasp ignore entries
- [ ] T053 Update root `README.md` to document the Laravel application, Sail/Homebrew setup, sample accounts, test commands, and Heroku deployment instructions
- [ ] T054 Run full automated test suite (`php artisan test`) and code style check (`./vendor/bin/pint --test`) to verify 100% clean green build

---

## Dependencies & Execution Order

### Phase Dependencies
- **Setup (Phase 1)**: Can start immediately.
- **Foundational (Phase 2)**: Depends on Phase 1 completion — BLOCKS all user stories.
- **User Stories (Phases 3–8)**: Depend on Phase 2 completion.
  - User Story 1 (P1) is the critical MVP milestone.
  - User Story 2 (P1) builds on US1 numbering and adds approval & recycled pool.
  - User Story 3 (P1) adds document finalization (PDF & scan) to US1/US2.
  - User Story 4 (P2) reuses numbering and scan components for external reservations.
  - User Story 5 (P2) and User Story 6 (P3) provide sample accounts, local dev helpers, and templates.
- **Polish & Cleanup (Phase 9)**: Runs after all user story migrations and feature tests pass.

---

## Parallel Opportunities

```bash
# Parallel Phase 1 Tasks:
Task: "T003 Configure frontend build tooling with Vite, PostCSS, and Tailwind CSS"
Task: "T004 Configure Laravel Pint code formatting standards in pint.json"
Task: "T005 Create Heroku deployment configuration defining web, worker, and release in Procfile"

# Parallel Phase 2 Migrations & Tests:
Task: "T007 Create database migration for letter_templates"
Task: "T008 Create database migration for letters"
Task: "T009 Create database migration for approval_workflows"
Task: "T010 Create database migration for letter_counters"
Task: "T011 Create database migration for recycled_number_pools"
Task: "T012 Create database migration for audit_logs"
Task: "T015 Create feature test for immutable audit logging and hard-delete rejection"

# Parallel Phase 9 Cleanup Tasks:
Task: "T050 Decommission and remove legacy Google Apps Script source files in src/"
Task: "T051 Remove legacy Clasp configuration files (.clasp.json, .claspignore)"
Task: "T052 Update root .gitignore for Laravel and Vite"
```

---

## Implementation Strategy: MVP First

1. **Step 1**: Complete Phase 1 (Setup) and Phase 2 (Foundational).
2. **Step 2**: Implement Phase 3 (User Story 1 - Internal Draft & Atomic Numbering).
3. **Step 3 (MVP Validation Checkpoint)**: Run `tests/Feature/LetterDraftTest.php` to prove core drafting and race-condition immunity.
4. **Step 4**: Implement Phase 4 (User Story 2 - Sequential Approvals & Recycled Pool).
5. **Step 5**: Implement Phase 5 (User Story 3 - Digital PDF & Wet Signature Scan Finalization).
6. **Step 6**: Implement Phase 6 (User Story 4 - Ambil Nomor External Reservation).
7. **Step 7**: Implement Phase 7 (User Story 5 - Sample Users & Quick Switch Bar) and Phase 8 (User Story 6 - Real Letter Cases).
8. **Step 8**: Execute Phase 9 (Decommission legacy `src/` and Clasp artifacts, update `README.md`, run full test suite).
