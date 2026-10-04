# Research & Technical Decisions: Koneksi Core Laravel Application

**Feature**: [spec.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/spec.md) | **Branch**: `003-laravel-correspondence-core`

This document consolidates architectural investigations, technology evaluations, and design decisions for migrating and building the Koneksi Core application on Laravel 13.x, PostgreSQL, and Heroku.

---

## 1. Application Architecture & Layered Design

- **Decision**: Adopt a strict 4-tier layered architecture in Laravel:
  `Blade View` → `FormRequest & Controller` → `Domain Service / Action Classes` → `Eloquent Model & DB Transactions` → `PostgreSQL`.
- **Rationale**:
  - Directly enforces **Constitution Principle I** (Strict Layered Architecture).
  - Business rules (numbering calculation, recycled pool assignment, multi-tier sequential approval, signature verification) live purely inside `App\Services\` classes (`NumberingService`, `LetterService`, `AuditService`).
  - Controllers remain thin (15–30 lines per method), handling request validation via dedicated `FormRequest` classes, delegating to services, and returning Blade views or redirects.
  - Enables 100% headless testing with PHPUnit/Pest without needing to render Blade or mock HTTP requests.
- **Alternatives Considered**:
  - *Fat Controllers*: Putting DB queries and numbering logic inside controller methods. (Rejected: Violates Principle I, impossible to unit-test cleanly, prone to duplicate code).
  - *Full Enterprise Repository Pattern with Interfaces*: Creating separate interface and repository classes for every model. (Rejected: Adds unnecessary indirection; Eloquent query scopes combined with domain service classes provide sufficient abstraction with much cleaner DX).

---

## 2. Atomic Sequence Numbering & Concurrency Protection

- **Decision**: Implement sequence number allocation inside a PostgreSQL database transaction (`DB::transaction`) utilizing pessimistic row locking (`SELECT ... FOR UPDATE` via Eloquent's `lockForUpdate()`) on the `letter_counters` table, combined with a FIFO `recycled_number_pools` table.
- **Rationale**:
  - Enforces **Constitution Principle III** (Document Integrity & Atomic Sequence Numbering).
  - Guarantees race-condition immunity under concurrent traffic: when two users submit drafts simultaneously for the same template code, the second transaction is blocked at the database row lock until the first completes.
  - Number format strictly follows canonical `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`.
  - Automatic date partitioning: counter records are keyed by `(template_code, month, year)`.
  - Recycled pool integration: The service checks `recycled_number_pools` for any released numbers in the current partition before incrementing the counter.
- **Alternatives Considered**:
  - *Application-level Lock (Cache::lock / Redis)*: Using Redis locks outside the database. (Rejected: Can cause split-brain if Redis lock releases before PostgreSQL transaction commits, risking number collision or gaps).
  - *Database Sequence per Template*: Creating native PostgreSQL `CREATE SEQUENCE`. (Rejected: Sequences cannot easily handle the FIFO recycled pool reuse requirement and date-based resets per month/template).

---

## 3. Persistent Storage & Cloud Object Storage Strategy

- **Decision**: Dual-filesystem configuration:
  - **Local Development**: Default to `local` / `public` disk driver via `storage/app/public` and `php artisan storage:link`.
  - **Production on Heroku**: Delegate 100% of user uploads (wet signature scans) and generated PDFs to **Cloudflare R2** via the `s3` driver (`league/flysystem-aws-s3-v3`).
- **Rationale**:
  - Satisfies **Constitution Principle VII** (Ephemeral Storage Isolation) and clarified user preference.
  - Heroku dynos erase local files on restart/deploy (at least every 24 hours).
  - Cloudflare R2 provides S3-compatible endpoints with **$0 egress fees**, 10 GB free monthly storage, private buckets, and server-side temporary presigned URLs for downloading/viewing sensitive letters.
  - Developers on local machines do not need an active Cloudflare R2 account to begin development immediately.
- **Alternatives Considered**:
  - *AWS S3*: Industry standard, but incurs egress bandwidth fees after free tier expires.
  - *Local Dyno Storage in Production*: Disastrous; files disappear on dyno restarts.

---

## 4. Asynchronous Queue Processing & Timeout Protection

- **Decision**: Use Laravel Queues with `database` driver for local development and Redis/Database worker dyno on Heroku (`worker: php artisan queue:work --tries=3 --timeout=90`).
- **Rationale**:
  - Enforces **Constitution Principle VIII** (Heroku 30-Second Timeout Protection).
  - Router Heroku automatically terminates HTTP requests that exceed 30 seconds (`H12`).
  - Multi-page PDF compilation and external SMTP email notifications are encapsulated inside queued jobs implementing `ShouldQueue` (`GenerateLetterPdfJob`, `SendApprovalNotificationJob`).
  - Web controllers return instant feedback to the user, and UI reflects generation status smoothly.
- **Alternatives Considered**:
  - *Synchronous Execution in Web Request*: Rejected; compiling PDFs with high-resolution signature imagery or slow SMTP servers frequently exceeds 10–20 seconds under load, risking Heroku H12 errors.

---

## 5. PDF Compilation Engine

- **Decision**: Adopt `barryvdh/laravel-dompdf` (Dompdf).
- **Rationale**:
  - Pure PHP solution that renders standard HTML/CSS templates directly to PDF.
  - Zero heavy binary dependencies: does not require Chromium, Node.js, or Puppeteer on the server.
  - Extremely resource-efficient on Heroku Basic/Eco dynos (which have 512 MB RAM limits).
  - Perfect for official administrative letters with standard Indonesian government/institutional headers (Kop Surat), formal typography, signature blocks, and QR code verification stamps.
- **Alternatives Considered**:
  - *Browsershot / Puppeteer*: Requires headless Chrome and Node buildpack on Heroku; consumes ~200-300MB RAM per render, risking R14 memory quota warnings on low-tier Heroku dynos.
  - *TCPDF / FPDF*: Clunky imperative coordinate-based layout, difficult to maintain compared to Blade-driven HTML-to-PDF templates.

---

## 6. Authentication, RBAC & Local Role-Switching Helper

- **Decision**: Standard Laravel session authentication (`auth` middleware) combined with Laravel Gates and Policies (`LetterPolicy`).
- **4 Sample Users Seeded**:
  - `admin@koneksi.local` (Role: `admin`)
  - `drafter@koneksi.local` (Role: `drafter`)
  - `reviewer@koneksi.local` (Role: `reviewer`)
  - `approver@koneksi.local` (Role: `approver`)
  - Standard password: `password` (hashed via `Hash::make('password')`).
- **Local Dev Role-Switching**:
  - A clean Blade component `<x-quick-switch-bar />` included in the application layout only when `app()->isLocal()`.
  - Routes to `POST /dev/switch-user/{role}` to immediately log in as that sample user and redirect back. Route is guarded with `abort_unless(app()->isLocal(), 404)`.
- **Rationale**:
  - Satisfies FR-001, FR-002, and FR-020.
  - Dramatically improves developer productivity during multi-tier sequential testing.

---

## 7. Local Development Stack (macOS Sequoia on ThinkPad T480 x86_64)

- **Decision**:
  - **Standard**: **Laravel Sail** (Docker Compose with `laravel.test` on PHP 8.3 and `pgsql` on PostgreSQL 16).
  - **Engine Optimization**: Recommend **OrbStack** or **Colima** over Docker Desktop for low CPU/RAM footprint on ThinkPad T480 Hackintosh.
  - **Alternative**: Native toolchain documentation via Homebrew (`brew install php@8.3 postgresql@16 node`).
- **Rationale**:
  - Enforces **Constitution Principle IX** (Dev/Prod Parity).
  - Native x86_64 CPU execution means zero emulation overhead, ensuring fast build and test times.
