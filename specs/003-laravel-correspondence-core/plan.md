# Implementation Plan: Aplikasi Pengelolaan Naskah Dinas & Penomoran Surat (Koneksi Core)

**Branch**: `003-laravel-correspondence-core` | **Date**: 2026-10-04 | **Spec**: [spec.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/spec.md)

**Input**: Feature specification from `/specs/003-laravel-correspondence-core/spec.md`

## Summary

Build and deploy the Koneksi Core application on Laravel 13.x and PostgreSQL (Heroku Postgres) providing a complete, secure correspondence management system:
1. **Core Lifecycle**: Template-driven internal letter drafting, dynamic multi-tier sequential approval, atomic concurrency-safe sequence numbering, FIFO recycled number pool, and dual signature finalization (Digital PDF export vs Wet Signature scan upload).
2. **External Letter Reservation (*Ambil Nomor*)**: Standalone reference number allocation for external documents with 1-step Approver sign-off and 7-day upload reconciliation.
3. **Sample Baseline & Local Dev Experience**: Provisioning 4 seeded roles (`admin`, `drafter`, `reviewer`, `approver`), 4 real-world letter templates (SKK, SP1, SK, PKS), and a 1-click Quick Switch User bar for rapid local testing on macOS Sequoia (ThinkPad T480 x86_64) via Laravel Sail.
4. **Platform & Security Rigor**: Cloudflare R2 object storage integration, background queue processing for PDF generation and emails against Heroku's 30-second timeout, strict emoji prohibition for institutional aesthetics, and append-only audit logging with hard-delete prevention.

---

## Technical Context

**Language/Version**: PHP 8.3+
**Primary Dependencies**:
- Laravel 13.x
- Tailwind CSS via Vite
- `barryvdh/laravel-dompdf` (Pure PHP HTML-to-PDF compilation)
- `league/flysystem-aws-s3-v3` (S3-compatible driver for Cloudflare R2)

**Storage**:
- Primary Database: PostgreSQL 16+ (Heroku Postgres in production, containerized PostgreSQL via Laravel Sail locally)
- Persistent File Storage: Cloudflare R2 (production S3 driver) / Local disk (`public` disk driver in development)

**Testing**: PHPUnit / Pest automated test suites (`php artisan test`)
**Target Platform**: Linux 64-bit container (Heroku Eco/Basic Dynos with `heroku/nodejs` and `heroku/php` buildpacks)
**Project Type**: Full-Stack Web Application (Laravel Blade + Tailwind CSS)
**Performance Goals**:
- Atomic number allocation < 1.0s under concurrent requests with zero duplicate numbers
- Web request response time < 500ms
- PDF generation processed asynchronously in background queue avoiding Heroku 30s timeout

**Constraints**:
- Absolute prohibition of visual emojis/emoticons across all UI views (Constitution Principle VI)
- Zero duplicate numbers under concurrent load (Constitution Principle III)
- Strict prohibition of hard deleting issued letters or allocated numbers (Principle III)
- Cloud object storage mandatory in production due to Heroku ephemeral dyno filesystem (Principle VII)
- 512 MB memory limit on Heroku Basic dynos; zero headless Chromium browser requirements

**Scale/Scope**:
- Enterprise internal administration, ~10,000 correspondence documents/year, 4 primary roles, 4 pre-configured letter templates, 7-day expiration scheduler for external reservations.

---

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

| Gate / Principle | Requirement | Status | Compliance Details |
| :--- | :--- | :---: | :--- |
| **Principle I: Layered Architecture** | Strict MVC: Blade → Controller/FormRequest → Service → Model → PostgreSQL | **PASS** | `LetterService`, `NumberingService`, and `AuditService` isolate all business rules. Controllers remain thin coordinators. |
| **Principle II: Zero Trust Authorization** | Server-side validation, role policies, sequential multi-step approval, terminal rejection | **PASS** | Laravel Gates/Policies (`LetterPolicy`), sequential order verified in transactions, terminal rejection permanently locks draft. |
| **Principle III: Document & Number Integrity** | Canonical numbering format, atomic row locking (`lockForUpdate`), FIFO recycled pool, hard-delete ban | **PASS** | Canonical pattern `{seq}.{code}/{month}/{year}` protected by PostgreSQL `lockForUpdate()`, recycled pool claims before counter increment, SoftDeletes enabled. |
| **Principle IV: Test-Driven Verification** | 100% automated coverage on numbering, approval flow, signature branching, and audit trails | **PASS** | Full test suites planned in `tests/Unit/NumberingServiceTest.php` and `tests/Feature/LetterWorkflowTest.php`. |
| **Principle V: Defensive Security & Audit** | CSRF protection, PDO parameterized queries, mass assignment protection, immutable audit log | **PASS** | Eloquent parameterization, `$fillable` guards, CSRF tokens on all state mutations, append-only `audit_logs` table. |
| **Principle VI: Professional UI & Emoji Ban** | Formal administrative aesthetic, SVG glyphs only, zero decorative emojis | **PASS** | Codified in `ui-contracts.md`. Heroicons SVG components used exclusively. |
| **Principle VII: Ephemeral Storage Isolation** | Persistent files stored on remote cloud object storage, no local dyno disk persistence | **PASS** | Cloudflare R2 S3 driver configured for production with presigned URLs; dual-driver support allows local disk for development. |
| **Principle VIII: Asynchronous Queueing** | Heavy tasks (PDF rendering, emails) dispatched to background jobs | **PASS** | `GenerateLetterPdfJob` implements `ShouldQueue`; worker dyno defined in `Procfile`. |
| **Principle IX: Environment Parity** | Local development mirrors production Linux/PostgreSQL | **PASS** | Laravel Sail running PostgreSQL 16 container, perfectly matching Heroku Postgres. |

---

## Project Structure

### Documentation (this feature)

```text
specs/003-laravel-correspondence-core/
├── spec.md              # Feature specification & user requirements
├── plan.md              # This implementation plan
├── research.md          # Technical investigation & architectural decisions
├── data-model.md        # PostgreSQL schemas, ERD, and state machine
├── quickstart.md        # Local setup & runnable validation guide
├── contracts/
│   ├── web-routes.md    # Route definitions, controllers, and middlewares
│   └── ui-contracts.md  # Blade design system, tokens, and emoji ban
└── checklists/
    └── requirements.md  # Specification quality checklist
```

### Source Code (repository root)

```text
app/
├── Http/
│   ├── Controllers/
│   │   ├── AuthController.php               # Login, logout handling
│   │   ├── DashboardController.php          # Role-based dashboard views
│   │   ├── LetterController.php             # Internal letter drafting & detail
│   │   ├── ApprovalController.php           # Sequential approval & rejection
│   │   ├── ScanController.php               # Physical wet signature scan upload
│   │   ├── TakeNumberController.php         # Standalone external number reservation
│   │   ├── AgendaController.php             # Public approved letters agenda book
│   │   ├── DevController.php                # Local-only 1-click Quick Switch User
│   │   └── Admin/
│   │       ├── UserController.php           # Employee whitelist management
│   │       └── AuditController.php          # Immutable audit log explorer
│   └── Requests/
│       ├── StoreLetterRequest.php
│       ├── UpdateLetterRequest.php
│       ├── ApproveLetterRequest.php
│       ├── RejectLetterRequest.php
│       ├── UploadScanRequest.php
│       └── TakeNumberRequest.php
├── Models/
│   ├── User.php                             # User entity & role scopes
│   ├── Letter.php                           # Main letter aggregate & status transitions
│   ├── LetterTemplate.php                   # Letter template definitions & schemas
│   ├── ApprovalWorkflow.php                 # Sequential approval steps
│   ├── LetterCounter.php                    # Atomic integer sequence counters
│   ├── RecycledNumberPool.php               # FIFO recycled numbers pool
│   └── AuditLog.php                         # Append-only immutable audit log
├── Policies/
│   └── LetterPolicy.php                     # RBAC & separation-of-duties rules
├── Services/
│   ├── LetterService.php                    # Domain lifecycle & workflow sequencing
│   ├── NumberingService.php                 # Concurrency-safe atomic number allocation
│   ├── DocumentService.php                  # Dompdf rendering & cloud storage integration
│   └── AuditService.php                     # Event recording & state capture
├── Console/
│   └── Commands/
│       └── CheckExpiredReservationsCommand.php # 7-day Ambil Nomor expiration scheduler
└── Jobs/
    ├── GenerateLetterPdfJob.php             # Asynchronous PDF compilation
    └── SendApprovalNotificationJob.php      # Asynchronous email dispatch

database/
├── migrations/
│   ├── 0001_01_01_000000_create_users_table.php
│   ├── 2026_10_04_000001_create_letter_templates_table.php
│   ├── 2026_10_04_000002_create_letters_table.php
│   ├── 2026_10_04_000003_create_approval_workflows_table.php
│   ├── 2026_10_04_000004_create_letter_counters_table.php
│   ├── 2026_10_04_000005_create_recycled_number_pools_table.php
│   └── 2026_10_04_000006_create_audit_logs_table.php
└── seeders/
    ├── DatabaseSeeder.php                   # Provisions 4 sample users + baseline
    └── LetterTemplateSeeder.php             # Provisions 4 real-world letter templates

resources/
├── css/
│   └── app.css                              # Tailwind CSS directives
├── js/
│   └── app.js                               # Minimal JS for UI interactivity
└── views/
    ├── layouts/
    │   ├── app.blade.php                    # Main authenticated layout
    │   └── guest.blade.php                  # Minimal guest layout (login)
    ├── components/
    │   ├── quick-switch-bar.blade.php       # Local-only 1-click role switcher
    │   ├── status-badge.blade.php           # Formal emoji-free status badge
    │   ├── letter-card.blade.php            # Letter overview component
    │   └── audit-timeline.blade.php         # Audit history timeline
    ├── auth/
    │   └── login.blade.php
    ├── dashboard/
    │   └── index.blade.php
    ├── letters/
    │   ├── create.blade.php
    │   ├── show.blade.php
    │   └── upload-scan.blade.php
    ├── take-number/
    │   └── create.blade.php
    ├── agenda/
    │   └── index.blade.php
    └── pdf/
        └── letter-template.blade.php         # Printable official PDF layout

routes/
└── web.php                                  # All application routes

tests/
├── Feature/
│   ├── AuthTest.php                         # Whitelist & login verification
│   ├── LetterDraftTest.php                  # Drafting, atomic numbering, separation of duties
│   ├── ApprovalWorkflowTest.php             # Sequential approvals, terminal rejection, recycled pool
│   ├── DocumentFinalizationTest.php         # Digital signature PDF vs wet scan upload
│   ├── TakeNumberTest.php                   # External reservation & 7-day window
│   ├── AuditLogTest.php                     # Immutable logging & hard-delete ban
│   └── RealLetterCasesTest.php              # E2E test executing SKK, SP1, SK, and PKS cases
└── Unit/
    ├── NumberingServiceTest.php             # Concurrency lock & formatting
    └── RecycledNumberPoolTest.php           # FIFO release and claim logic

docker-compose.yml                            # Laravel Sail Docker stack (PHP 8.3 + Postgres 16)
Procfile                                     # Heroku dyno definitions (web, worker, release)
```

**Structure Decision**: Standard Laravel 13.x monolithic MVC structure with dedicated `Services/` domain layer and clean componentized Blade views. Fully compliant with Heroku deployment conventions and local containerization via Laravel Sail.

---

## Complexity Tracking

> **Constitution Compliance**: 100% compliant. No violations or unnecessary complexities introduced. All gates pass cleanly without deviations.

| Item | Architectural Rationale | Simpler Alternative Rejected Because |
| :--- | :--- | :--- |
| **Pessimistic Locking (`lockForUpdate`)** | Guarantees zero duplicate letter numbers during concurrent transactions | Optimistic locking requires complex application retry loops under contention |
| **FIFO Recycled Number Pool** | Prevents gaps in the legal sequence when letters are rejected or cancelled | Skipping recycled numbers creates unfillable holes in official organizational agendas |
| **Dompdf Engine** | Lightweight pure PHP rendering within 512 MB dyno limits | Headless Chromium / Browsershot is excessively resource-heavy for Heroku Basic dynos |
| **Local Quick Switch Bar** | Enables instant 1-click role testing across all 4 sample users | Manual logout and credential re-entry wastes developer testing time |
