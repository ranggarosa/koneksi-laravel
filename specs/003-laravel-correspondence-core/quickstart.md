# Quickstart & Local Validation Guide: Koneksi Core Laravel

**Feature**: [spec.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/spec.md) | **Branch**: `003-laravel-correspondence-core`

This guide provides end-to-end setup and runnable validation walkthroughs for Koneksi Core on macOS Sequoia (Lenovo ThinkPad T480 x86_64) and standard developer workstations.

---

## 1. Prerequisites

- **Option A (Recommended)**: Docker engine via **OrbStack** (or **Colima** / **Docker Desktop**).
- **Option B (Native)**: PHP 8.3+ (`php -v`), Composer 2.7+, PostgreSQL 16+, and Node.js 20+ (`npm -v`).

---

## 2. Environment Setup

### 2.1 Clone & Environment File Configuration
```bash
# Copy local environment configuration
cp .env.example .env
```

Ensure `.env` contains local database and storage defaults:
```dotenv
APP_NAME=Koneksi
APP_ENV=local
APP_DEBUG=true
APP_URL=http://localhost

DB_CONNECTION=pgsql
DB_HOST=127.0.0.1
DB_PORT=5432
DB_DATABASE=koneksi
DB_USERNAME=koneksi
DB_PASSWORD=secret

FILESYSTEM_DISK=public
QUEUE_CONNECTION=database
```

---

### 2.2 Execution via Laravel Sail (Option A - Standard)
```bash
# 1. Install composer dependencies (if vendor not present)
docker run --rm \
    -u "$(id -u):$(id -g)" \
    -v "$(pwd):/var/www/html" \
    -w /var/www/html \
    laravelsail/php82-composer:latest \
    composer install --ignore-platform-reqs

# 2. Boot Docker containers (PHP + PostgreSQL)
./vendor/bin/sail up -d

# 3. Generate key, run migrations, and seed initial sample data
./vendor/bin/sail artisan key:generate
./vendor/bin/sail artisan storage:link
./vendor/bin/sail artisan migrate:fresh --seed

# 4. Install frontend assets and build
./vendor/bin/sail npm install
./vendor/bin/sail npm run dev
```

---

### 2.3 Execution via Native Homebrew (Option B - Alternative)
```bash
# 1. Ensure PostgreSQL service is running
brew services start postgresql@16

# 2. Create local database
createdb koneksi

# 3. Install dependencies & initialize
composer install
npm install
php artisan key:generate
php artisan storage:link
php artisan migrate:fresh --seed

# 4. Run local server and asset compiler
php artisan serve &
php artisan queue:listen &
npm run dev
```

---

## 3. Seeded Sample Accounts Baseline

The database seeder initializes 4 accounts with the universal password `password`:

| Role | Email Address | Default Password | Primary Permissions |
| :--- | :--- | :---: | :--- |
| **Admin** | `admin@koneksi.local` | `password` | User management, audit logs, emergency voiding |
| **Drafter** | `drafter@koneksi.local` | `password` | Drafting internal letters, Ambil Nomor, scan upload |
| **Reviewer** | `reviewer@koneksi.local` | `password` | Reviewing & approving/rejecting intermediate steps |
| **Approver** | `approver@koneksi.local` | `password` | Final digital/wet sign-off, Ambil Nomor authorization |

> **Development Pro-Tip**: When `APP_ENV=local`, use the **Quick Switch Bar** at the top of the interface to switch between accounts in 1 click without manually logging out!

---

## 4. End-to-End Validation Walkthroughs

### 4.1 Scenario 1: Case SKK (Surat Keterangan Kerja - Digital Signature Path)
1. Log in as `drafter@koneksi.local` (or click `Drafter` on Quick Switch bar).
2. Click **Buat Surat Baru** → Select template **SKK**.
3. Fill mandatory fields (Nama Pegawai, NIK, Jabatan, Keperluan).
4. Notice approval flow auto-assigns 1-tier Approver: `Approver Organisasi`.
5. Click **Kirim Draf**. Status transitions to `In Review`.
6. Switch user to `approver@koneksi.local`.
7. Open **Tugas Persetujuan** → View the SKK draft.
8. Click **Setujui** → Select **Tanda Tangan Digital** → Submit.
9. **Outcome**: Status transitions to `Approved`. Click **Unduh PDF** to view the official generated letter containing the embedded digital signature and canonical number `{sequence}.SKK/{Bulan}/{Tahun}`.

---

### 4.2 Scenario 2: Case SP1 (Surat Peringatan - Multi-Tier Sequential Approval)
1. As `drafter@koneksi.local`, create a new letter using template **SP1**.
2. Select Reviewer: `reviewer@koneksi.local` and Approver: `approver@koneksi.local`.
3. Submit draft. Letter number is atomically reserved (e.g. `0002.SP1/X/2026`).
4. Switch to `approver@koneksi.local`. Try to view and approve.
   - **Verification**: Approver cannot act yet because Step 1 (Reviewer) is pending.
5. Switch to `reviewer@koneksi.local`.
6. Open approvals → Click **Setujui**. Step 1 marks `Approved`.
7. Switch back to `approver@koneksi.local`.
8. Approver can now act. Click **Setujui** with Digital Signature.
9. **Outcome**: Letter status transitions to `Approved`. Full audit trail reflects sequential timestamps.

---

### 4.3 Scenario 3: Case SK (Surat Keputusan - Wet Signature & Scan Upload)
1. As `drafter@koneksi.local`, draft a letter with template **SK**.
2. Approver reviews and clicks **Setujui** with option **Tanda Tangan Basah**.
3. **Outcome**: Status transitions to `Awaiting Wet Signature`. Letter is printable without signature block.
4. As `drafter@koneksi.local`, navigate to the letter detail page.
5. Click **Unggah Scan Berkas** → Select a sample signed PDF file.
6. Submit upload.
7. **Outcome**: File is verified and saved to storage. Status becomes `Approved`.

---

### 4.4 Scenario 4: Case PKS (Ambil Nomor - External Reservation with 7-Day Window)
1. As `drafter@koneksi.local`, open menu **Ambil Nomor Surat**.
2. Fill Perihal: "Perjanjian Kerjasama dengan PT Mitra Solusi", Pihak Tujuan: "Direktur PT Mitra", Select Template: `PKS`, Select Approver: `approver@koneksi.local`.
3. Submit reservation. Status is `In Review`.
4. As `approver@koneksi.local`, approve the request.
5. **Outcome**: Reference number is allocated (e.g. `0004.PKS/X/2026`). Status is `Pending Upload` with a countdown of 7 days.
6. As `drafter@koneksi.local`, upload signed scan PDF.
7. **Outcome**: Status changes to `Approved`.

---

### 4.5 Scenario 5: Rejection & Recycled Number Pool Verification
1. As `drafter@koneksi.local`, submit an SP1 draft. Suppose it receives number `0005.SP1/X/2026`.
2. As `reviewer@koneksi.local`, click **Tolak (Reject)** with reason "Klarifikasi kronologi insiden belum lengkap".
3. **Outcome**: Status is permanently `Rejected`. Audit log records rejection reason.
4. As `drafter@koneksi.local`, immediately submit a new SP1 draft.
5. **Verification**: The new SP1 draft receives number `0005.SP1/X/2026` from the **Recycled Number Pool** (FIFO), preventing numbering gaps in the official agenda!

---

## 5. Automated Test Suite Execution

Run the complete test suite verifying atomic sequence locking, approval sequencing, recycled pool reuse, and authorization gates:

```bash
# If using Laravel Sail:
./vendor/bin/sail artisan test

# If using Native:
php artisan test
```

Expected output:
```text
PASS  Tests\Unit\NumberingServiceTest
✓ it generates atomic sequence number without collision
✓ it reclaims sequence number from recycled pool before counter increment
✓ it partitions sequence counters by month and year

PASS  Tests\Feature\LetterWorkflowTest
✓ drafter cannot approve own letter
✓ reviewer must approve before approver can act
✓ rejection permanently locks letter and releases number
✓ digital finalization generates pdf
✓ wet signature requires scan upload before approved

Tests:    15 passed (42 assertions)
Duration: 1.84s
```
