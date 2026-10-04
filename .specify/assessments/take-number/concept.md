# Concept: Standalone Letter Number Reservation and Archival Tracking

- **Slug**: take-number
- **Created**: 2026-09-28
- **Recommended option**: Option A — Unified Letter Model with "External Document" Mode

## Options

### Option A — Unified Letter Model with "External Document" Mode
- **Sketch**: Integrate standalone number taking directly into the existing letter lifecycle as an "External Document" (Ambil Nomor) submission type. The drafter enters minimal metadata (Subject, Recipient, Letter Date, and Template Code) and nominates a single Approver. Once the Approver approves the request, the system atomically allocates an official letter number via `numberingService` and sets the status to `Pending Upload`. The letter detail page displays a 7-day reconciliation countdown and a scan upload dropzone (reusing the wet-signature upload pattern). In the public archive, the record appears with a "Pending Upload" badge. A daily time-driven trigger evaluates overdue items: sending an escalation reminder to the Approver on Day 5 (2 days before expiry) and releasing expired numbers back to the recycled pool on Day 7.
- **Appetite**: `small` (1–2 weeks)
- **Trade-offs**:
  - *Wins*: Maximum reuse of existing systems (`numberingService`, `LockService`, `recycledNumbers`, `letterRepository`, Google Drive upload API, and audit logs); consistent UI and unified search archive; minimal incremental surface area.
  - *Sacrifices*: Expands the states of the core `Letters` table with an external/reservation lifecycle.
- **Rabbit holes**: Allowing multi-step review hierarchies for simple number requests (keep it strictly to 1 Approver); complex real-time timers (use simple daily scheduled triggers based on ISO timestamps).

### Option B — Dedicated Standalone Reservation Registry ("Buku Agenda Mandiri")
- **Sketch**: Build a separate, decoupled subsystem with its own UI view ("Ambil Nomor"), independent data store (`NumberReservations` sheet), and independent approval screens. Drafters submit reservation tickets that approvers approve in a dedicated queue. Only after the 7-day window and upon successful upload of the signed scan does the record transform and migrate into the main `Letters` sheet as a completed archive.
- **Appetite**: `medium` (3–4 weeks)
- **Trade-offs**:
  - *Wins*: Isolates unfinalized external reservations completely from the primary letter store, preventing schema additions to `Letters`.
  - *Sacrifices*: Substantial duplicate code (dual approval endpoints, dual dashboard views, dual notification logic); complex data migration when closing a reservation into an official letter; fragmented public archive search across two stores.
- **Rabbit holes**: Data synchronization discrepancies between reservation records and final archive records; duplicate counter handling.

### Option C — Process-Only Workaround (Manual Administrative Proxy)
- **Sketch**: Make no software changes. Create an administrative SOP where drafters submit off-system requests via email or chat to a designated Secretariat Admin, who acts as a proxy by drafting a minimal placeholder letter in the current app, pushing it through self-approval to capture a number, and manually following up for the physical scan.
- **Appetite**: `small` (0 engineering days)
- **Trade-offs**:
  - *Wins*: Zero code changes; no deployment overhead.
  - *Sacrifices*: High manual labor and bottleneck on Secretariat staff; zero automated 7-day SLA enforcement or automated escalation; high risk of human error, forgotten scans, and audit failures.
  - **Rabbit holes**: Informal tracking spreadsheets falling out of sync with system numbers.

## Recommendation

**Option A (Unified Letter Model with "External Document" Mode)** is strongly recommended. 

It satisfies all stated goals and user-clarified constraints with the smallest footprint and lowest risk:
1. It honors governance: all requests require 1-step Approver authorization before a number is minted.
2. It satisfies user needs: drafters provide only Subject, Recipient, and Date without entering in-app document authoring.
3. It enforces compliance: 7-day countdown, Day-5 Approver email escalation, automated release to the recycled pool upon expiration, and "Pending Upload" visibility in the public archive.
4. It reuses the battle-tested atomic numbering service and Google Drive scan upload mechanisms already built in `specs/001-manajemen-surat`.

## Out of Scope (for the recommended option)

- Multi-stage hierarchical review (Reviewer 1, Reviewer 2, etc.) for standalone number requests (strictly 1 Approver).
- Generating or editing Google Docs content within the app for external correspondence.
- Indefinite number holds (strictly 7 days max).
- Re-opening or extending expired reservations once numbers have been released back into the recycled pool.

## Assumptions to Validate

- A single daily Google Apps Script time-driven trigger is adequate to evaluate day-5 escalations and day-7 expirations.
- Releasing an expired standalone number into `recycledNumbers` is legally acceptable provided the letter was never confirmed or uploaded.
- Drafter and Approver both have upload permissions for the final scanned PDF during the 7-day reconciliation window.
