<!--
Sync Impact Report:
- Version change: 1.1.0 → 2.0.0
- List of modified principles:
  - Modified I. Strict Layered Architecture & Unidirectional Data Flow (redefined from Google Apps Script to Laravel MVC, FormRequests, Services/Actions, and Eloquent Models)
  - Modified II. Server-Side Single Source of Truth & Zero Trust Authorization (updated to Laravel Auth, Gates, Policies, and DB-level transactional validation)
  - Modified III. Document Integrity & Atomic Sequence Numbering (updated concurrency protection to PostgreSQL transactions and pessimistic locking lockForUpdate)
  - Modified IV. Test-Driven Verification of Critical Business Rules (updated to PHPUnit / Pest automated test suites)
  - Modified V. Defensive Security, Modern Web Protection & Tamper-Evident Auditability (expanded with CSRF, mass assignment, parameterized PDO queries, and immutable audit logs)
  - Maintained VI. Professional UI Integrity & Global Emoji/Emote Prohibition (enforced across Laravel Blade & Tailwind CSS)
- Added sections:
  - Technology Stack & Platform Architecture: Codified Laravel 11.x, Blade + Tailwind CSS, PostgreSQL (Heroku Postgres), and Heroku multi-buildpack deployment
- Removed sections:
  - Deprecated Phase 0 (Google Apps Script runtime, Sheets, and DriveApp) in favor of the active Laravel platform
- Follow-up TODOs: None
-->

# Koneksi (Kelola Naskah Elektronik dan Komunikasi Internal) Constitution

## Core Principles

### I. Strict Layered Architecture & Unidirectional Data Flow (Laravel MVC)
The system MUST adhere strictly to a clean, layered architectural pattern in Laravel: `Blade View (.blade.php)` → `FormRequest / Controller` → `Service / Action Class` → `Eloquent Model / Repository` → `PostgreSQL Database`.
- **View Layer**: Laravel Blade templates styled with Tailwind CSS. Blade templates handle presentation and user interactions exclusively. Direct database queries, raw business logic, or authorization determinations within Blade files are strictly prohibited.
- **Request & Controller Layer**: FormRequests manage input validation and initial authorization gates. Controllers act as thin coordinators: they extract validated request payloads, invoke domain services, and return HTTP responses or view models. Controllers MUST NOT contain core business algorithms or raw SQL queries.
- **Service / Action Layer**: Houses all domain business rules, multi-tier approval sequencing, numbering generation, PDF document compilation, and notification triggers. Services remain independent of HTTP transport, returning pure domain models, DTOs, or structured error results.
- **Model & Persistence Layer**: Eloquent ORM Models and Database Migrations for PostgreSQL. Repositories or Query Scopes encapsulate data access. Business rules governing multi-record workflows MUST NOT be embedded directly inside model hook side-effects.
- **Rationale**: Isolates business logic for headless testing via PHPUnit/Pest, ensures clean separation of concerns, and prevents high-traffic regressions.

### II. Server-Side Single Source of Truth & Zero Trust Authorization
All security boundaries, role permissions, and workflow states MUST be validated server-side; client-side controls (such as hidden buttons or disabled form inputs) are strictly cosmetic conveniences.
- **Authentication Guard**: Every authenticated route MUST be protected by standard Laravel authentication middleware (`auth` / `auth:web`). User sessions MUST correspond to an active record with `is_active = true`. Deactivated or unauthorized accounts MUST be rejected immediately.
- **Role-Based Access Control (RBAC)**: User privileges MUST be verified using Laravel Gates and Policies according to assigned roles (e.g., `drafter` for creating drafts, `approver` for signing/rejecting assigned documents, `admin` for system management).
- **Sequential Approval Integrity**: In a multi-step approval workflow (`approval_flow`), approver $n$ can ONLY act if all preceding approvers $1 \dots n-1$ have recorded `approved` status. The service layer MUST independently re-verify this sequence inside a database transaction rather than trusting client-provided state or indices.
- **Terminal Rejection**: If any reviewer or approver rejects a letter, the workflow MUST terminate immediately, permanently mark the status as `Rejected`, capture mandatory revision notes, and prevent subsequent approvers from taking action.
- **Rationale**: Prevents privilege escalation, unauthorized workflow bypassing, and guarantees regulatory compliance across administrative correspondence.

### III. Document Integrity & Atomic Sequence Numbering (Race Condition Immunity)
Official documents represent institutional commitments and MUST maintain rigorous data consistency, deterministic numbering, and verifiable signature integrity.
- **Deterministic Schema**: Letter numbers MUST follow the canonical format: `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`.
- **Atomic Concurrency Protection**: Generation of letter numbers MUST be protected against race conditions using PostgreSQL database transactions (`DB::transaction`) and pessimistic row locking (`lockForUpdate`) on the `counters` table. Duplicate letter numbers are strictly prohibited under any concurrency level.
- **Date Partitioning**: Sequence counters MUST automatically partition and reset upon month and year boundary transitions.
- **Dual Signature Finalization Paths**: The final approver MUST explicitly choose between:
  1. **Digital Signature**: Injects authorized digital signature metadata/imagery, compiles the final PDF, and transitions status directly to `Approved`.
  2. **Wet Signature**: Prepares the printable draft document, retains status with `awaiting_wet_signature = true`, and MUST NOT transition to `Approved` until a scanned, physically signed document upload is verified.
- **Rationale**: Letter numbers are legally binding identifiers. Number collisions or premature approval of unsigned wet-signature documents compromises legal validity.

### IV. Test-Driven Verification of Critical Business Rules
Critical business rules and core lifecycle workflows MUST be verified through structured, automated test suites (PHPUnit or Pest) before code reaches production.
- **Decoupled Testability**: Services MUST accept dependency injection or database transactions, allowing rapid automated testing using Laravel's testing environment (`RefreshDatabase`).
- **Mandatory Test Suites**: Automated tests MUST provide 100% test coverage for the five critical operational scenarios:
  1. Duplicate-free atomic sequence number generation under concurrent load simulation.
  2. Sequential approval enforcement and immediate termination on rejection.
  3. Signature branching behavior: instant completion for digital vs upload verification gate for wet signature.
  4. Authentication guards, role-based policies, and inactive user lockout.
  5. Immutable audit log recording on every state transition.
- **Rationale**: Prevents regressions in high-stakes numbering, legal, and authorization logic during continuous deployment to Heroku.

### V. Defensive Security, Modern Web Protection & Comprehensive Auditability
All components MUST implement defensive programming to safeguard sensitive personnel information and maintain tamper-evident audit trails.
- **Modern Web Security**: All form submissions and state-mutating requests MUST include valid CSRF tokens (`VerifyCsrfToken`). All database interactions MUST use Eloquent or PDO parameterized queries to eliminate SQL injection vectors. Mass assignment MUST be prevented using explicit `$fillable` model definitions.
- **Sanitization & Escaping**: All user-provided strings (employee names, NIK, form content, revision notes) MUST be sanitized and escaped upon rendering to eliminate XSS and CSV/formula injection.
- **Credential & Secret Protection**: All database credentials, APP_KEY, mail credentials, and third-party tokens MUST be managed strictly through `.env` locally and Heroku Config Vars in staging/production. Hardcoding credentials in source code or committing `.env` to Git is strictly forbidden.
- **Tamper-Evident Audit Logging**: Every state modification (`draft_created`, `submitted`, `approved`, `rejected`, `signature_attached`, `number_reserved`) MUST write an immutable record to the `approval_logs` / `audit_logs` table containing timestamp, actor ID/email, target letter ID, and transition metadata.
- **Rationale**: Safeguards personal employee data and provides legally defensible, non-repudiable auditability.

### VI. Professional UI Integrity & Global Emoji/Emote Prohibition
All user-facing interfaces built with Blade and Tailwind CSS MUST maintain a formal, clean, and institutional aesthetic suitable for official administrative systems.
- **Strict Prohibition of Emojis and Emotes**: The use of visual emojis, emoticons, or pictographic emote characters (such as 📄, 🔢, 🚀, 😊, etc.) within UI navigation, buttons, titles, modal headers, status badges, alerts, or labels is strictly prohibited across the entire application.
- **Iconography Standard**: Visual cues MUST rely exclusively on professional SVG icon sets (e.g., Heroicons, Lucide Icons) implemented as clean Blade components, or standard typography.
- **Tailwind Aesthetic**: Use a cohesive, sober institutional palette (neutral/slate/indigo), clear visual hierarchy, accessible contrast ratios, and responsive layouts.
- **Rationale**: Official administrative workflows require dignity, clarity, and cross-platform visual consistency. Decorative emojis undermine professional credibility.

## Technology Stack & Platform Architecture

### Framework & Language Runtime
- **Backend Framework**: Laravel 11.x on PHP 8.2+.
- **Frontend / Templating**: Laravel Blade Templates with Tailwind CSS, bundled and compiled via Vite (`npm run build`).

### Database Engine: PostgreSQL (Heroku Postgres)
- **Primary Database**: PostgreSQL (via Heroku Postgres add-on).
- **Driver**: Laravel `pgsql` driver configured through `DATABASE_URL`.
- **Architectural Rationale over MySQL**:
  - **Native Heroku Integration**: Heroku Postgres is a first-class, fully managed service on Heroku, natively integrated via the `DATABASE_URL` environment variable and Heroku CLI toolchain (`heroku pg:psql`, `heroku pg:backups`).
  - **Student Pack Compatibility**: GitHub Student Developer Pack provides Heroku credits applicable directly to Heroku Dynos and Heroku Postgres (Eco/Basic tiers).
  - **Robust Transactional Locking**: PostgreSQL provides reliable row-level pessimistic locking (`FOR UPDATE`) and sequence handling, vital for atomic document numbering.
  - **MySQL Drawbacks on Heroku**: Using MySQL on Heroku requires third-party add-ons (ClearDB or JawsDB), which suffer from severe connection limits (typically 5–10 concurrent connections on low/free tiers), small storage caps (5MB–10MB), and lack of direct Heroku CLI backup/restore integration.

### Deployment & Hosting Platform: Heroku
- **Web Server Runtime**: Heroku PHP Buildpack configured with Apache/Nginx via root `Procfile`:
  ```text
  web: vendor/bin/heroku-php-apache2 public/
  ```
- **Asset Compilation**: Multi-buildpack deployment order:
  1. `heroku/nodejs` (installs npm dependencies and compiles frontend via `npm run build`).
  2. `heroku/php` (installs composer dependencies and boots the Laravel application).
- **Environment Configuration**: Managed entirely through Heroku Config Vars (`APP_ENV=production`, `APP_KEY`, `DATABASE_URL`, `APP_DEBUG=false`).
- **Release Phase Automation**: Automated schema migration on deploy defined in `Procfile`:
  ```text
  release: php artisan migrate --force
  ```
- **File & Document Storage**: Cloud storage (AWS S3 or compatible object storage via Laravel Flysystem) for uploaded scans and generated PDF archives. Heroku's ephemeral filesystem MUST NOT be used for persistent document storage.
- **Queue & Background Jobs**: Asynchronous processing (queue driver) for PDF generation and email notifications to adhere to Heroku's 30-second HTTP request timeout.

## Development Workflow, Release & Quality Gates

### Code Conventions & Standards
- **Coding Style**: Adherence to PSR-12 and Laravel coding standards, verified using Laravel Pint (`./vendor/bin/pint --test`).
- **Directory Structure**: Standard Laravel convention (`app/Http/Controllers`, `app/Http/Requests`, `app/Services`, `app/Models`, `database/migrations`, `resources/views`).
- **Schema Management**: All database changes MUST be executed via version-controlled Laravel migrations (`database/migrations/`). Manual database modifications in production are strictly forbidden.

### Commit Conventions & Versioning
- **Commit Format**: Conventional Commits v1.0.0 (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`) with imperative lowercase descriptions and version metadata footer:
  ```text
  feat(numbering): implement atomic sequence numbering with postgres lock

  Version: v2.0.0
  ```
- **Semantic Versioning**: The project follows SemVer 2.0.0. The single source of truth for the codebase version is the root `VERSION` file. Any commit that increments version MUST update `VERSION` within the same commit.

### Quality Gates
Before any release or production deployment to Heroku:
1. Automated unit and feature test suites (`php artisan test`) MUST pass with 100% success.
2. Code style checks via Laravel Pint MUST pass without warnings.
3. Database migrations MUST be tested locally and verified to be non-destructive or accompanied by rollback routines.
4. Release phase migration in Heroku MUST execute cleanly before dynos receive web traffic.

## Governance

### Constitutional Primacy
This Constitution constitutes the supreme engineering authority for Koneksi (Kelola Naskah Elektronik dan Komunikasi Internal). It supersedes all informal discussions, temporary conventions, and conflicting project artifacts. Any conflict between existing implementation and this Constitution MUST be resolved in favor of this Constitution.

### Amendment Procedure
- Proposed amendments to principles or governance rules MUST be submitted as formal pull requests or Spec Kit workflow updates.
- Any amendment modifying, expanding, or removing principles requires documented architectural justification, an analysis of backward compatibility, and an implementation plan.
- Temporary exceptions or informal deviations are strictly prohibited; changes MUST be formally codified into this Constitution.

### Semantic Versioning of Constitution
The Constitution itself is versioned according to Semantic Versioning principles:
- **MAJOR** increment: Removal, redefinition, or backward-incompatible restructuring of core principles or governance policies (e.g., transition from Google Apps Script to Laravel + PostgreSQL).
- **MINOR** increment: Addition of new principles, material expansion of technical guidelines, or formal ratification of new sub-systems.
- **PATCH** increment: Editorial refinements, typo fixes, non-semantic wording clarifications.

### Compliance Review & Enforcement
- All engineering activities—including feature specifications (`/speckit-specify`), architectural plans (`/speckit-plan`), and task implementations (`/speckit-implement`)—MUST actively verify conformance with this Constitution.
- Pull requests and code reviews MUST reject code that violates the layered architecture, bypasses server authorization, introduces raw SQL or XSS vectors, uses unmigrated DB changes, or violates the emoji prohibition.

**Version**: 2.0.0 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-10-04
