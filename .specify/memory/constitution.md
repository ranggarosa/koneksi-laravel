<!--
Sync Impact Report:
- Version change: 2.1.0 → 2.1.1
- List of modified principles: None
- Technical Stack Amendments:
  - Framework runtime upgraded: Laravel 11.x (PHP 8.2+) → Laravel 13.x (PHP 8.3+) for active support lifecycle and long-term security.
  - Local development container specification updated to PHP 8.3+ in Laravel Sail.
- Removed sections: None
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

### III. Document Integrity, Atomic Sequence Numbering & Legal Immutability
Official documents represent institutional commitments and MUST maintain rigorous data consistency, deterministic numbering, verifiable signature integrity, and permanent legal auditability.
- **Deterministic Schema**: Letter numbers MUST follow the canonical format: `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`.
- **Atomic Concurrency Protection**: Generation of letter numbers MUST be protected against race conditions using PostgreSQL database transactions (`DB::transaction`) and pessimistic row locking (`lockForUpdate`) on the `counters` table. Duplicate letter numbers are strictly prohibited under any concurrency level.
- **Date Partitioning**: Sequence counters MUST automatically partition and reset upon month and year boundary transitions.
- **Strict Prohibition of Hard Deletes**: Official letters, issued sequence numbers, and approval logs MUST NEVER be hard-deleted (`DELETE FROM ...`) from the database. Any cancellation, revocation, or withdrawal MUST be executed via explicit status transitions (`status = 'voided'` or `status = 'cancelled'`) accompanied by mandatory justification notes. If soft deletes (`SoftDeletes`) are utilized for pre-submission drafts, access to purge records permanently MUST be restricted exclusively to root database audit routines. No gaps in issued sequence numbers may ever occur due to data deletion.
- **Dual Signature Finalization Paths**: The final approver MUST explicitly choose between:
  1. **Digital Signature**: Injects authorized digital signature metadata/imagery, compiles the final PDF, and transitions status directly to `Approved`.
  2. **Wet Signature**: Prepares the printable draft document, retains status with `awaiting_wet_signature = true`, and MUST NOT transition to `Approved` until a scanned, physically signed document upload is verified.
- **Rationale**: Letter numbers and official correspondence carry legal accountability. Deleting records or allowing sequence collisions compromises institutional compliance and forensic auditability.

### IV. Test-Driven Verification of Critical Business Rules
Critical business rules and core lifecycle workflows MUST be verified through structured, automated test suites (PHPUnit or Pest) before code reaches production.
- **Decoupled Testability**: Services MUST accept dependency injection or database transactions, allowing rapid automated testing using Laravel's testing environment (`RefreshDatabase`).
- **Mandatory Test Suites**: Automated tests MUST provide 100% test coverage for the five critical operational scenarios:
  1. Duplicate-free atomic sequence number generation under concurrent load simulation.
  2. Sequential approval enforcement and immediate termination on rejection.
  3. Signature branching behavior: instant completion for digital vs upload verification gate for wet signature.
  4. Authentication guards, role-based policies, and inactive user lockout.
  5. Immutable audit log recording on every state transition.
  6. Queue job dispatching for asynchronous PDF generation and mail delivery.
- **Rationale**: Prevents regressions in high-stakes numbering, legal, and authorization logic during continuous deployment to Heroku.

### V. Defensive Security, Modern Web Protection & Comprehensive Auditability
All components MUST implement defensive programming to safeguard sensitive personnel information and maintain tamper-evident audit trails.
- **Modern Web Security**: All form submissions and state-mutating requests MUST include valid CSRF tokens (`VerifyCsrfToken`). All database interactions MUST use Eloquent or PDO parameterized queries to eliminate SQL injection vectors. Mass assignment MUST be prevented using explicit `$fillable` model definitions.
- **Sanitization & Escaping**: All user-provided strings (employee names, NIK, form content, revision notes) MUST be sanitized and escaped upon rendering to eliminate XSS and CSV/formula injection.
- **Credential & Secret Protection**: All database credentials, APP_KEY, mail credentials, object storage keys, and third-party tokens MUST be managed strictly through `.env` locally and Heroku Config Vars in staging/production. Hardcoding credentials in source code or committing `.env` to Git is strictly forbidden.
- **Tamper-Evident Audit Logging**: Every state modification (`draft_created`, `submitted`, `approved`, `rejected`, `signature_attached`, `number_reserved`, `voided`) MUST write an immutable record to the `approval_logs` / `audit_logs` table containing timestamp, actor ID/email, target letter ID, and transition metadata.
- **Rationale**: Safeguards personal employee data and provides legally defensible, non-repudiable auditability.

### VI. Professional UI Integrity & Global Emoji/Emote Prohibition
All user-facing interfaces built with Blade and Tailwind CSS MUST maintain a formal, clean, and institutional aesthetic suitable for official administrative systems.
- **Strict Prohibition of Emojis and Emotes**: The use of visual emojis, emoticons, or pictographic emote characters (such as 📄, 🔢, 🚀, 😊, etc.) within UI navigation, buttons, titles, modal headers, status badges, alerts, or labels is strictly prohibited across the entire application.
- **Iconography Standard**: Visual cues MUST rely exclusively on professional SVG icon sets (e.g., Heroicons, Lucide Icons) implemented as clean Blade components, or standard typography.
- **Tailwind Aesthetic**: Use a cohesive, sober institutional palette (neutral/slate/indigo), clear visual hierarchy, accessible contrast ratios, and responsive layouts.
- **Rationale**: Official administrative workflows require dignity, clarity, and cross-platform visual consistency. Decorative emojis undermine professional credibility.

### VII. Ephemeral Storage Isolation & Remote Object Storage Integrity
Heroku dyno filesystems are strictly ephemeral; files stored on local dyno disks are erased upon restart or redeployment.
- **Prohibition of Local File Persistence**: User-uploaded documents (e.g., wet signature scans, attachments) and generated artifacts (e.g., final official PDF documents) **MUST NEVER** be stored on the local dyno disk (`storage/app/public` or `/tmp`).
- **Remote Cloud Object Storage**: All persistent files MUST be stored directly in an S3-compatible Cloud Object Storage bucket via Laravel Flysystem (`Storage::disk('s3')`).
- **Access Control & Presigned URLs**: Buckets containing official letters and signature scans MUST remain private (no public read permissions). Access to view or download files MUST be granted exclusively via short-lived, authenticated presigned URLs generated server-side.
- **Rationale**: Prevents critical document loss caused by Heroku dyno restarts and protects confidential organizational letters from unauthorized exposure.

### VIII. Asynchronous Workload Queueing & Heroku 30-Second Timeout Protection
Heroku HTTP routers enforce a strict 30-second ceiling on request duration, terminating slow requests with `H12 - Request Timeout`.
- **Mandatory Job Queueing**: High-latency tasks—specifically multi-page PDF generation, image transformation of signature scans, and external email notification dispatch—**MUST NOT** execute synchronously within web request lifecycles.
- **Asynchronous Execution Pattern**: Controllers MUST dispatch these tasks to background queues (`ShouldQueue` / Laravel Jobs) and immediately return responsive feedback to the client.
- **Queue Worker Configuration**: A dedicated worker dyno or database/Redis queue worker MUST process these asynchronous tasks without blocking web dynos.
- **Rationale**: Protects web dynos from saturation and eliminates HTTP 504/H12 timeout errors during peak document approval and distribution periods.

### IX. Environment Parity & Dev/Prod Mirroring
Following Twelve-Factor App principles, local development environments MUST maintain strict parity with production to prevent deployment-time failures.
- **Database Engine Parity**: Developers MUST run PostgreSQL locally for development and testing. Using SQLite or MySQL locally while targeting Heroku Postgres in production is strictly forbidden due to divergent locking behaviors, migration differences, and JSON operators.
- **Containerized Parity Standard**: Local services (PHP, PostgreSQL, Redis) MUST be managed via containerization (Laravel Sail / Docker) to replicate the production 64-bit Linux runtime environment.
- **Rationale**: Guarantees that concurrency locks (`lockForUpdate`), database migrations, and PHP extensions perform identically in local development and on Heroku dynos.

## Technology Stack & Platform Architecture

### Framework & Language Runtime
- **Backend Framework**: Laravel 13.x on PHP 8.3+.
- **Frontend / Templating**: Laravel Blade Templates with Tailwind CSS, bundled and compiled via Vite (`npm run build`).

### Database Engine: PostgreSQL (Heroku Postgres)
- **Primary Database**: PostgreSQL (via Heroku Postgres add-on).
- **Driver**: Laravel `pgsql` driver configured through `DATABASE_URL`.
- **Architectural Rationale**: Native first-class Heroku integration, student pack credit compatibility, native row-level pessimistic locking (`FOR UPDATE`), and robust automated CLI snapshots (`heroku pg:backups`).

### Cloud Object Storage: Evaluation & Selection
Given Heroku's ephemeral filesystem, persistent storage MUST be delegated to an S3-compatible cloud object storage provider.

1. **Option A: Cloudflare R2 (Primary Recommended)**
   - **Cost Efficiency**: **$0 Egress Fees** (unlimited free bandwidth). Free tier includes 10 GB storage/month, 1,000,000 Class A operations/month, and 10,000,000 Class B operations/month. Incurs $0 cost for typical administrative letter workloads.
   - **Security**: Fully private buckets, S3-compatible API credentials with granular scoped API tokens, TLS 1.3 in transit, and automatic AES-256 encryption at rest. Integrates seamlessly with Laravel via `league/flysystem-aws-s3-v3`.
2. **Option B: Supabase Storage (Alternative)**
   - **Cost Efficiency**: Included in free tier (1 GB storage, 2 GB egress bandwidth).
   - **Security**: Integrated PostgreSQL Row-Level Security (RLS) policies, S3-compatible API endpoint, and private bucket access.
3. **Option C: AWS S3 (Enterprise Standard)**
   - **Cost Efficiency**: Standard AWS pricing; free tier covers 5 GB for the first 12 months, but charges apply for outbound data egress ($0.09/GB) thereafter.
   - **Security**: Industry-standard IAM policies, KMS customer-managed key encryption, and audit trail via AWS CloudTrail.
- **Architecture Decision**: **Cloudflare R2** is adopted as the primary storage provider for maximal cost efficiency and zero egress costs.

### Deployment & Hosting Platform: Heroku
- **Web Server Runtime**: Heroku PHP Buildpack configured with Apache/Nginx via root `Procfile`:
  ```text
  web: vendor/bin/heroku-php-apache2 public/
  worker: php artisan queue:work --tries=3 --timeout=90
  ```
- **Asset Compilation**: Multi-buildpack deployment order:
  1. `heroku/nodejs` (installs npm dependencies and compiles frontend via `npm run build`).
  2. `heroku/php` (installs composer dependencies and boots the Laravel application).
- **Environment Configuration**: Managed entirely through Heroku Config Vars (`APP_ENV=production`, `APP_KEY`, `DATABASE_URL`, `APP_DEBUG=false`, storage credentials).
- **Release Phase Automation & Zero-Downtime Migration Safety**:
  - Automated schema migration defined in `Procfile`:
    ```text
    release: php artisan migrate --force
    ```
  - **Migration Safety Rules**: All migrations MUST be non-destructive (expand-and-contract pattern). Dropping columns or renaming tables actively read by running dynos is strictly prohibited until a subsequent deployment phase. `php artisan db:seed` is strictly forbidden in production release commands.

### Local Development Environment: macOS Sequoia on ThinkPad T480 (x86_64)
To ensure seamless deployment to Heroku from a macOS Sequoia system running on Lenovo ThinkPad T480 (Intel Core 8th Gen x86_64):
- **Recommended Setup**: **Laravel Sail** powered by **OrbStack** (or **Colima** / **Docker Desktop**).
  - *Architecture Advantage*: Because the ThinkPad T480 is native Intel x86_64, Linux containers run without Rosetta or QEMU translation overhead, matching Heroku's 64-bit Linux architecture 1:1.
  - *Resource Efficiency*: OrbStack or Colima provides significantly lower CPU and battery consumption on ThinkPad T480 compared to legacy virtual machines.
  - *Services Provided*: Pre-configured containers for PHP 8.3+, PostgreSQL 16 (mirroring Heroku Postgres), and Redis.

## Development Workflow, Release & Quality Gates

### Code Conventions & Standards
- **Coding Style**: Adherence to PSR-12 and Laravel coding standards, verified using Laravel Pint (`./vendor/bin/pint --test`).
- **Directory Structure**: Standard Laravel convention (`app/Http/Controllers`, `app/Http/Requests`, `app/Services`, `app/Models`, `database/migrations`, `resources/views`).
- **Schema Management**: All database changes MUST be executed via version-controlled Laravel migrations (`database/migrations/`). Manual database modifications in production are strictly forbidden.

### Commit Conventions & Versioning
- **Commit Format**: Conventional Commits v1.0.0 (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `test:`, `chore:`) with imperative lowercase descriptions and version metadata footer:
  ```text
  feat(storage): configure cloudflare r2 private bucket with presigned urls

  Version: v2.1.0
  ```
- **Semantic Versioning**: The project follows SemVer 2.0.0. The single source of truth for the codebase version is the root `VERSION` file. Any commit that increments version MUST update `VERSION` within the same commit.

### Quality Gates
Before any release or production deployment to Heroku:
1. Automated unit and feature test suites (`php artisan test`) MUST pass with 100% success.
2. Code style checks via Laravel Pint MUST pass without warnings.
3. Database migrations MUST be tested locally and verified to be non-destructive or accompanied by rollback routines.
4. Release phase migration in Heroku MUST execute cleanly before dynos receive web traffic.
5. All file operations MUST be verified to target remote object storage, leaving no lingering local artifacts.

## Governance

### Constitutional Primacy
This Constitution constitutes the supreme engineering authority for Koneksi (Kelola Naskah Elektronik dan Komunikasi Internal). It supersedes all informal discussions, temporary conventions, and conflicting project artifacts. Any conflict between existing implementation and this Constitution MUST be resolved in favor of this Constitution.

### Amendment Procedure
- Proposed amendments to principles or governance rules MUST be submitted as formal pull requests or Spec Kit workflow updates.
- Any amendment modifying, expanding, or removing principles requires documented architectural justification, an analysis of backward compatibility, and an implementation plan.
- Temporary exceptions or informal deviations are strictly prohibited; changes MUST be formally codified into this Constitution.

### Semantic Versioning of Constitution
The Constitution itself is versioned according to Semantic Versioning principles:
- **MAJOR** increment: Removal, redefinition, or backward-incompatible restructuring of core principles or governance policies.
- **MINOR** increment: Addition of new principles, material expansion of technical guidelines, or formal ratification of new sub-systems.
- **PATCH** increment: Editorial refinements, typo fixes, non-semantic wording clarifications.

### Compliance Review & Enforcement
- All engineering activities—including feature specifications (`/speckit-specify`), architectural plans (`/speckit-plan`), and task implementations (`/speckit-implement`)—MUST actively verify conformance with this Constitution.
- Pull requests and code reviews MUST reject code that violates the layered architecture, bypasses server authorization, introduces raw SQL or XSS vectors, uses unmigrated DB changes, relies on ephemeral dyno storage, or violates the emoji prohibition.

**Version**: 2.1.1 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-10-04
