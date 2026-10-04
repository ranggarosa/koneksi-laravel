# Problem Definition: Standalone Letter Number Reservation and Archival Tracking

- **Slug**: take-number
- **Created**: 2026-09-28
- **Inputs used**: intake.md, research.md, user clarification

## Problem Statement

When administrative drafters must issue official correspondence drafted outside the application's built-in document editor, they cannot obtain an official registered letter number without completing a full in-app document generation flow. This forces staff into creating dummy drafts or assigning untracked numbers out-of-band, creating numbering discrepancies, ghost records, and missing archives that undermine organizational auditability and record compliance.

## Affected Users & Stakeholders

- **Users**:
  - **Drafters**: Need to obtain legitimate official letter numbers for external, pre-formatted, or physical letters without being forced through the in-app document composition pipeline.
  - **Approvers (Higher Authority)**: Need to review and approve standalone number requests (verifying subject, recipient, and date) before numbers enter official circulation, preserving governance without reviewing complete document text.
- **Stakeholders**:
  - **Secretariat / Records Officers / Organization Administrators**: Accountable for registry integrity, preventing sequence holes, and ensuring every allocated number maps to an actual verified document.
  - **Auditors & Compliance Officers**: Require that all official letter numbers issued under the organization's identity are traceable to verified signed records.

## Goals

- Allow drafters to request an official letter number for off-system documents by submitting essential metadata: Subject (Perihal), Recipient (Tujuan), and Date (Tanggal Surat).
- Enforce higher-authority approval before any standalone number is allocated or committed to the counter sequence.
- Enforce accountability for issued numbers with a 7-day reconciliation window during which drafters or approvers must upload the final signed scanned letter.
- Maintain total numbering sequence integrity and atomicity without generating orphaned or untracked numbers.

## Non-Goals

- Instant, unapproved number generation (all standalone number requests must be approved by higher authority).
- Deprecating or replacing the standard in-app drafting and digital approval pipeline (which remains the standard flow for regular letters).
- In-app document editing or layout formatting for external correspondence.
- Indefinite or open-ended number reservations without archival reconciliation.

## Success Metrics

- 100% of standalone letter numbers issued are backed by an approved request with mandatory metadata and approver identity (baseline: 0% / untracked manual numbering).
- 100% elimination of dummy in-app drafts created solely to harvest letter numbers (baseline: qualitative workaround observed).
- >= 95% of reserved numbers reconciled with an uploaded signed scan within the 7-day window (baseline: 0% tracked).
- 0 unassigned or unrecorded gaps in the official sequence due to abandoned off-system drafting.

## Cost of Inaction

Without this capability, staff dealing with external, physical, or specialized documents will either create dummy drafts that pollute the approval queue and drive storage, or invent numbers manually outside the system. Manual out-of-band numbering directly leads to sequence collisions, duplicated letter numbers, and unarchived official correspondence that cannot be defended during regulatory audits.

## Open Questions

- [NEEDS CLARIFICATION: How should taken/reserved numbers without a final uploaded PDF appear in the public archive search (FR-012) — visible with a "Pending Upload" status indicator, or hidden until the scan is uploaded?] visible with a "Pending Upload" status
- [NEEDS CLARIFICATION: What automated or administrative action occurs when the 7-day reconciliation window expires without an uploaded scan (e.g., automated email escalation to Approver/Admin, status marked "Overdue/Expired", or release of number to recycled pool)?] Automated email escalation to Approver in 2 days before expire, if numbers expired it will be released to recycled pool.
