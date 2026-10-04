# Contract: UI Components & Institutional Design System

**Feature**: [spec.md](file:///Users/ranggarosa/Projects/koneksi-laravel/specs/003-laravel-correspondence-core/spec.md) | **Branch**: `003-laravel-correspondence-core`

This contract specifies the layout architecture, Tailwind CSS design tokens, Blade components, and visual conventions enforcing **Constitution Principle VI** (Professional UI Integrity & Global Emoji Prohibition).

---

## 1. Institutional Design Tokens (Tailwind CSS)

### 1.1 Color Palette
- **Primary / Brand**: Slate & Indigo (Institutional corporate tone)
  - `primary-900`: `#0f172a` (Deep Slate - Navbar, main headings)
  - `primary-800`: `#1e293b`
  - `primary-700`: `#334155`
  - `accent-600`: `#4f46e5` (Indigo - Primary action buttons, active tabs)
  - `accent-700`: `#4338ca` (Hover state)
- **Neutral / Canvas**:
  - `bg-slate-50`: `#f8fafc` (Main page background)
  - `card-white`: `#ffffff` (Card background with subtle border `border-slate-200`)
- **Feedback & Status Tones**:
  - Success (Approved): `bg-emerald-50 text-emerald-800 border-emerald-300`
  - Warning (In Review / Awaiting Signature): `bg-amber-50 text-amber-800 border-amber-300`
  - Danger (Rejected / Voided): `bg-rose-50 text-rose-800 border-rose-300`
  - Neutral (Draft / Expired / Cancelled): `bg-slate-100 text-slate-700 border-slate-300`

### 1.2 Typography
- Font Family: Inter / System Sans-serif (`font-sans`).
- Hierarchy: Clear font weights (`font-semibold`, `font-medium`), strictly avoiding playful display fonts.

---

## 2. Global Emoji Prohibition Enforcement (Principle VI)

```text
STRICT RULE:
No visual emojis, emoticons, or Unicode pictographs (e.g. 📄, 🔢, 🚀, 😊, ⚠️, ❌, ✅)
may appear anywhere in Blade views, buttons, alerts, status badges, or form labels.
```

- **Iconography Standard**: All visual cues MUST use SVG icon Blade components (e.g. Heroicons Micro / Outline).
  - Check / Success: `<svg class="w-4 h-4 text-emerald-600" ...>` (Heroicon Check)
  - Alert / Warning: `<svg class="w-4 h-4 text-amber-600" ...>` (Heroicon ExclamationTriangle)
  - Document / Letter: `<svg class="w-4 h-4 text-slate-600" ...>` (Heroicon DocumentText)
  - User / Role: `<svg class="w-4 h-4 text-slate-600" ...>` (Heroicon User)

---

## 3. Core Blade Components

### 3.1 `<x-status-badge :status="$status" />`
Standardized status badge without pictograms:
- `draft` → `[DRAF]` (Gray badge)
- `in_review` → `[MENUNGGU PERSETUJUAN]` (Amber badge)
- `awaiting_wet_signature` → `[MENUNGGU SCAN BASAH]` (Amber badge)
- `pending_upload` → `[MENUNGGU UNGGAH BERKAS]` (Amber badge)
- `approved` → `[DISETUJUI]` (Emerald badge)
- `rejected` → `[DITOLAK]` (Rose badge)
- `cancelled` → `[DIBATALKAN]` (Slate badge)
- `expired` → `[KEDALUWARSA]` (Slate badge)
- `voided` → `[DIBATALKAN RESMI]` (Rose/Slate badge)

### 3.2 `<x-quick-switch-bar />`
Local development helper rendered conditionally when `app()->isLocal()`:
- Displayed fixed at the top or bottom of the screen with a subtle dark bar (`bg-slate-900 text-white`).
- Labels: `Active User: [Current Role] | Switch Role: [Admin] [Drafter] [Reviewer] [Approver]`
- Uses `<form method="POST" action="/dev/switch-user/{role}">` with CSRF token for secure 1-click role swapping.

### 3.3 `<x-letter-card :letter="$letter" />`
Displays letter summary card on dashboard and agenda:
- Reference number (bold, monospace: `font-mono text-sm font-semibold`)
- Subject / Perihal
- Recipient / Pihak Tujuan
- Current workflow step and assigned reviewer name
- Status badge and action buttons (Detail, Approve, Upload Scan, Download PDF)

### 3.4 `<x-audit-timeline :logs="$auditLogs" />`
Displays vertical audit trail timeline:
- Timestamp (e.g. `04 Okt 2026, 14:30 WIB`)
- Actor name and email
- Action label (e.g. "Draf diajukan", "Disetujui oleh Peninjau", "Tanda Tangan Digital dibubuhkan")
- Metadata notes (e.g. rejection notes in quotation block)
