# Contract: Web Routes & HTTP Endpoints

**Feature**: [spec.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/spec.md) | **Branch**: `003-laravel-correspondence-core`

This contract details all HTTP web routes, controllers, middleware gates, and payload specifications for Koneksi Core.

---

## 1. Authentication & Session Routes

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/login` | `AuthController@showLoginForm` | `guest` | Renders formal login view |
| `POST` | `/login` | `AuthController@login` | `guest`, `throttle:5,1` | Authenticates user credentials |
| `POST` | `/logout` | `AuthController@logout` | `auth` | Invalidates active user session |
| `POST` | `/dev/switch-user/{role}` | `DevController@switchUser` | `web` | Instant role-switch (Local only, guarded by `app()->isLocal()`) |

---

## 2. Dashboard & Navigation Routes

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/` | `DashboardController@index` | `auth` | Role-filtered dashboard (Drafter drafts, pending approvals, archive metrics) |
| `GET` | `/agenda` | `AgendaController@index` | `auth` | Public letter agenda book (search & view approved letters) |

---

## 3. Internal Letter Drafting (`/letters`)

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/letters/create` | `LetterController@create` | `auth`, `can:create,App\Models\Letter` | Step 1: Select template and fill draft |
| `POST` | `/letters` | `LetterController@store` | `auth`, `can:create,App\Models\Letter` | Validates & reserves atomic sequence number, creates draft |
| `GET` | `/letters/{letter}` | `LetterController@show` | `auth`, `can:view,letter` | Letter detail, workflow timeline, audit trail |
| `GET` | `/letters/{letter}/edit` | `LetterController@edit` | `auth`, `can:update,letter` | Edit draft (only allowed while status is `draft`) |
| `PUT` | `/letters/{letter}` | `LetterController@update` | `auth`, `can:update,letter` | Update draft contents |
| `POST` | `/letters/{letter}/cancel` | `LetterController@cancel` | `auth`, `can:cancel,letter` | Drafter cancels draft (releases number to pool) |
| `GET` | `/letters/{letter}/download` | `LetterController@download` | `auth`, `can:download,letter` | Download final approved PDF or physical scan |

---

## 4. Sequential Approval & Review (`/approvals`)

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/approvals` | `ApprovalController@index` | `auth` | List pending approvals waiting for active user |
| `POST` | `/approvals/{letter}/approve` | `ApprovalController@approve` | `auth`, `can:actOnApproval,letter` | Approve step; if final: choose digital/wet signature |
| `POST` | `/approvals/{letter}/reject` | `ApprovalController@reject` | `auth`, `can:actOnApproval,letter` | Terminal rejection with mandatory notes; releases number |

### 4.1 Approval Payload Specification
```json
// POST /approvals/{letter}/approve
{
  "_token": "CSRF_TOKEN",
  "signature_type": "digital", // "digital" | "wet" (required only on final step)
  "notes": "Disetujui untuk penomoran resmi."
}

// POST /approvals/{letter}/reject
{
  "_token": "CSRF_TOKEN",
  "notes": "Perbaiki pasal 3 terkait hak kewajiban sebelum diterbitkan." // Required, min 10 chars
}
```

---

## 5. Physical Wet Signature & Scan Reconciliation (`/scans`)

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/letters/{letter}/upload-scan`| `ScanController@create` | `auth`, `can:uploadScan,letter` | Renders scan upload interface |
| `POST` | `/letters/{letter}/upload-scan`| `ScanController@store` | `auth`, `can:uploadScan,letter` | Uploads signed physical scan PDF, transitions to `Approved` |

---

## 6. External Letter Reservation (`/take-number`)

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/take-number` | `TakeNumberController@create` | `auth` | Standalone Ambil Nomor request form |
| `POST` | `/take-number` | `TakeNumberController@store` | `auth` | Submits external reservation, status `In Review` |
| `POST` | `/take-number/{letter}/cancel`| `TakeNumberController@cancel` | `auth`, `can:cancel,letter` | Cancels pending reservation before 7-day expiry |

---

## 7. Administrative Controls & Audit (`/admin`)

| Method | URI | Controller Action | Middleware | Description |
| :--- | :--- | :--- | :--- | :--- |
| `GET` | `/admin/users` | `Admin\UserController@index` | `auth`, `can:admin` | User management and whitelist overview |
| `POST` | `/admin/users` | `Admin\UserController@store` | `auth`, `can:admin` | Register new employee/user |
| `PUT` | `/admin/users/{user}/toggle` | `Admin\UserController@toggleActive` | `auth`, `can:admin` | Lock/unlock employee access |
| `GET` | `/admin/audit-logs` | `Admin\AuditController@index` | `auth`, `can:admin` | Immutable system audit log explorer |
| `POST` | `/admin/letters/{letter}/void` | `Admin\LetterController@void` | `auth`, `can:admin` | Formally void an approved letter with legal reason |
