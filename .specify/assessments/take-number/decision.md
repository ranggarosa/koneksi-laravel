# Decision: Standalone Letter Number Reservation and Archival Tracking

- **Slug**: take-number
- **Decided**: 2026-09-28
- **Verdict**: go
- **Artifacts reviewed**: intake.md, research.md, problem.md, concept.md

## Scorecard

| Criterion | Rating | Justification |
|-----------|--------|---------------|
| Problem validity | strong | Off-system and physical correspondence currently forces drafters to create dummy drafts or bypass the system, creating significant compliance and audit risks. |
| Evidence strength | adequate | Internal technical architecture (atomic numbering, locks, Drive upload) is verified from codebase; operational requirements (metadata, 1-step approval, 7-day SLA, Day-5 escalation) were confirmed directly by stakeholders. |
| Value vs. inaction | strong | Directly eliminates sequence corruption, phantom numbers, and unregistered physical correspondence. |
| Feasibility / appetite | strong | Option A has a small appetite (1–2 weeks), maximizing reuse of existing `numberingService`, Drive scan upload, and `Letters` sheet infrastructure. |
| Strategic fit | strong | Upholds Koneksi's core principles: separation of duties, atomic sequential integrity, and comprehensive archival tracking. |
| Risk posture | strong | Major risks (phantom numbers, governance bypass) are credibly mitigated by mandatory Approver sign-off, a strict 7-day reconciliation window, Day-5 reminder escalation, and automated release to the recycled pool. |

## Verdict & Rationale

**Verdict: GO.**

The proposal is approved for specification and delivery under **Option A (Unified Letter Model with "External Document" Mode)**. It provides a governed, streamlined path for drafters to register external or physical letters without compromising organizational oversight. By enforcing a single-step Approver sign-off, capturing essential metadata upfront, and backing the reservation with a strict 7-day upload SLA and automated recycling, the solution balances operational agility with rigorous records compliance.

## If go — Handoff to `/speckit-specify`

- **Problem**: Administrative staff issuing correspondence drafted outside the web application cannot obtain an official registered letter number without undergoing the full in-app document generation flow, leading to dummy draft submissions or unrecorded out-of-band numbering.
- **Chosen approach**: Option A — Unified Letter Model with "External Document" (Ambil Nomor) Mode:
  - Drafter submits a number request with minimal metadata: Subject (Perihal), Recipient (Tujuan), Letter Date (Tanggal Surat), Template Code, and selects 1 Approver.
  - Higher authority (Approver) reviews and approves the request.
  - Upon approval, the system atomically allocates an official letter number via `numberingService` and sets status to `Pending Upload`.
  - Record is visible in the public archive with a "Pending Upload" status badge.
  - Drafter or Approver has a 7-day reconciliation window to upload the scanned final signed PDF.
  - Automated email escalation is sent to the Approver on Day 5 (2 days before expiration).
  - If Day 7 lapses without an uploaded scan, the number expires and is automatically released back to the `recycledNumbers` pool.
- **In scope / out of scope**:
  - *In scope*:
    - Standalone number request form (Subject, Recipient, Date, Template Code, Approver).
    - 1-step Approver queue and decision action.
    - Atomic number allocation upon approval.
    - `Pending Upload` letter status and public archive visibility.
    - Scanned PDF upload dropzone on letter detail page.
    - Daily scheduled trigger to check 7-day SLA.
    - Automated Day-5 reminder email to Approver.
    - Automated Day-7 expiration and release to recycled numbers pool.
  - *Out of scope*:
    - Multi-tier reviewer chains (strictly 1 Approver).
    - In-app Google Docs content drafting for external letters.
    - Open-ended or indefinite number reservations.
    - Re-opening expired reservations after release to recycled pool.
- **Success metrics**:
  - 100% of standalone numbers issued are backed by an approved request with recorded metadata and Approver identity.
  - 100% elimination of dummy in-app drafts created solely to harvest letter numbers.
  - >= 95% of reserved numbers reconciled with an uploaded scan within 7 days.
  - 0 unassigned or unrecorded sequence gaps in the official counter.
- **Carried-forward open questions**: None blocking. All core policies have been resolved and agreed upon.
