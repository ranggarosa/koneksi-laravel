<!--
Sync Impact Report:
- Version change: Uninitialized → 1.0.0
- List of modified principles:
  - [PRINCIPLE_1_NAME] → I. Strict Layered Architecture & Unidirectional Data Flow
  - [PRINCIPLE_2_NAME] → II. Server-Side Single Source of Truth & Zero Trust Authorization
  - [PRINCIPLE_3_NAME] → III. Document Integrity & Atomic Sequence Numbering (Race Condition Immunity)
  - [PRINCIPLE_4_NAME] → IV. Test-Driven Verification of Critical Business Rules
  - [PRINCIPLE_5_NAME] → V. Defensive Security, Formula Injection Mitigation & Comprehensive Auditability
- Added sections:
  - Technology Stack & Phase-Specific Constraints (replacing [SECTION_2_NAME])
  - Development Workflow, Release & Quality Gates (replacing [SECTION_3_NAME])
- Removed sections: None
- Follow-up TODOs: None
-->

# Koneksi (Kelola Naskah Elektronik dan Komunikasi Internal) Constitution

## Core Principles

### I. Strict Layered Architecture & Unidirectional Data Flow
The system MUST adhere strictly to a 4-layer unidirectional architecture: `View (.html)` → `Controller (.gs)` → `Service (.gs)` → `Repository (.gs)` → External Services (`SpreadsheetApp`, `DriveApp`, `DocumentApp`, `MailApp`).
- **View Layer**: Handles presentation and user interactions exclusively. Direct calls to repositories or business logic inside HTML templates are strictly prohibited.
- **Controller Layer**: Mediates between UI and Service. Manages loading, error, and success states; invokes server-side authentication guards; and extracts request parameters. Controllers MUST NOT execute business logic or interact directly with persistence layers.
- **Service Layer**: Houses all core business rules, multi-tier approval sequencing, numbering generation, and signature flow logic. Services MUST remain completely UI-agnostic and return pure data models or error structures.
- **Repository Layer**: The sole layer permitted to call Google Workspace services (`SpreadsheetApp`, `DriveApp`, etc.). Repositories MUST only perform data retrieval and persistence operations without embedding business decision logic.
- **Rationale**: Isolates business logic for headless testing without `HtmlService`, ensures clean separation of concerns, and simplifies future migration (e.g., swapping Sheets repositories for Firestore/Cloud SQL in Phase 1+ without rewriting service logic).

### II. Server-Side Single Source of Truth & Zero Trust Authorization
All security boundaries and access permissions MUST be validated server-side; client-side controls (such as hidden elements or disabled buttons) are strictly cosmetic conveniences.
- **Authentication Guard**: Every controller function MUST invoke `authService.getCurrentUser()` to verify that the active Google session corresponds to an email explicitly registered and marked with `isActive = TRUE` in the `Users` whitelist. Non-whitelisted or deactivated accounts MUST be denied access immediately.
- **Role Enforcement**: User actions MUST match assigned roles (e.g., only `drafter` may create drafts, only designated approvers may act on approvals, and only `admin` may manage users).
- **Sequential Approval Integrity**: In a multi-step `approvalFlow`, approver $n$ can ONLY act if all preceding approvers $1 \dots n-1$ are already `approved`. The controller and service MUST independently re-verify this sequence rather than trusting client-provided state or indices.
- **Terminal Rejection**: If any reviewer or approver rejects a letter, the workflow MUST terminate immediately, permanently mark the status as `Rejected`, capture mandatory revision notes, and prevent subsequent approvers from taking action.
- **Rationale**: Prevents privilege escalation, unauthorized workflow bypassing, and ensures organizational compliance across sensitive HR letters.

### III. Document Integrity & Atomic Sequence Numbering (Race Condition Immunity)
Official documents represent legal commitments and MUST maintain rigorous data consistency, deterministic numbering, and verifiable signature integrity.
- **Deterministic Schema**: Letter numbers MUST follow the canonical format: `{sequence:04d}.{templateCode}/{bulanRomawi}/{tahun}`.
- **Atomic Concurrency Protection**: Generation of letter numbers MUST be protected against race conditions using `LockService` on the `Counters` repository. Duplicate letter numbers are strictly prohibited.
- **Date Partitioning**: Sequence counters MUST automatically partition and reset upon month and year boundary transitions.
- **Dual Signature Finalization Paths**: The final approver MUST explicitly choose between:
  1. **Digital Signature**: Injects authorized digital signature imagery into the document template and transitions status directly to `Approved` with a generated final PDF.
  2. **Wet Signature**: Prepares the unsigned draft in a restricted Google Drive folder (`unsigned-draft`), retains status in review with `awaitingWetSignature = TRUE`, and MUST NOT transition to `Approved` until a new scanned physical document revision is verified via Drive API (`Files.update`).
- **Rationale**: Letter numbers are legally binding identifiers. Duplicate numbering or premature approval of unsigned wet-signature documents undermines legal validity and organizational integrity.

### IV. Test-Driven Verification of Critical Business Rules
Because Google Apps Script lacks a native build-time test runner, critical business rules MUST be verified through structured, automated unit tests within the project.
- **Decoupled Testability**: Services MUST use lightweight dependency injection to accept repository abstractions, allowing mock test execution without side effects on production Google Sheets or Drive files.
- **Mandatory Test Suites**: Automated test files (`*.test.gs` / `Test*.gs`) with assertions (`assertEqual`, `assertTrue`, `assertThrows`) MUST provide 100% test coverage for the five critical operational scenarios:
  1. Duplicate-free atomic sequence generation under concurrent load simulation (`numbering.service.gs`).
  2. Sequential approval enforcement and immediate termination on rejection (`letter.service.gs`).
  3. Signature branching behavior: instant approval for digital vs revision gate for wet signature (`letter.service.gs`).
  4. Authentication whitelist verification and inactive user lockout (`auth.service.gs`).
  5. Wet-signature scanned file revision existence verification (`document.service.gs`).
- **Manual UAT Smoke Testing**: Automated unit tests MUST be complemented by a pre-deployment manual smoke test checklist covering full-lifecycle drafting, approval, and rejection before release.
- **Rationale**: Prevents high-impact legal, numbering, or workflow regressions in an environment where standard CI/CD tooling is constrained.

### V. Defensive Security, Formula Injection Mitigation & Comprehensive Auditability
All components MUST implement defensive programming to safeguard sensitive employee information and maintain tamper-evident audit trails.
- **Formula Injection Mitigation**: Any user-provided string (e.g., employee names, NIK, form content, revision notes) MUST be sanitized or escaped (e.g., prefixing with `'` or rejecting unsafe patterns) before being written to Google Sheets cells to eliminate formula injection vectors (`=`, `+`, `-`, `@`).
- **Least-Privilege Drive Sharing**: Draft documents for wet signature workflows MUST only be shared with the drafter and designated approval flow participants. Application root folders (`Templates/`, `Signatures/`, `Letters/`) MUST NEVER be made public ("Anyone with the link").
- **Credential & Secret Protection**: All template IDs, folder IDs, and environment-specific settings MUST be stored in `PropertiesService` (Script Properties) and never committed to version control, steering files, or source code.
- **Tamper-Evident Audit Logging**: Every state modification (`submitDraft`, `approve`, `reject`, `uploadSignature`, `verifyRevision`) MUST write an immutable record to the `ApprovalLog` repository containing timestamp, actor email, target letter ID, and transition metadata.
- **Rationale**: Mitigates critical spreadsheet-based injection vulnerabilities, safeguards personal employee data, and provides legally defensible auditability.

## Technology Stack & Phase-Specific Constraints

### Active Implementation (Phase 0)
- **Frontend Presentation**: Google Apps Script HTML Service delivering a lightweight Web App UI (`/exec`).
- **Application Logic**: Google Apps Script server-side runtime (`.gs` files).
- **Data Persistence**: Google Sheets (`SpreadsheetApp`) across sheets: `Users`, `Letters`, `Counters`, and `ApprovalLog`. Complex structures (`approvalFlow`, `contentData`) MUST be serialized as valid JSON strings within single cells.
- **Document & Asset Storage**: Google Drive (`DriveApp`) and Google Docs (`DocumentApp` / Advanced Drive Service `Files.update` for version updates).
- **Identity & Session**: `Session.getActiveUser()` matched against the `Users` sheet whitelist. Organizational Google Workspace domain affiliation is NOT mandatory; personal Gmail accounts are permitted if explicitly whitelisted.
- **Notifications**: Google Apps Script `MailApp` / `GmailApp`.
- **Runtime Constraints**:
  - Apps Script 6-minute maximum execution timeout per request.
  - Document and PDF generation runs synchronously; intermediate status `Processing PDF` MUST NOT be used during Phase 0.
  - Operations MUST respect daily Google Workspace API and email quota ceilings.

### Future Architecture Roadmap (Phase 1+)
- **Phase 1 (Serverless MVP)**: Migration to Firebase (Firestore database, Firebase Authentication, Cloud Functions, and Firebase Hosting).
- **Phase 2–3 (Enterprise Architecture)**: Transition persistence to GCP Cloud SQL (PostgreSQL) with Prisma/Drizzle ORM, standalone API backend, and modern frontend in Next.js (App Router, SSR) with Firebase Custom Claims for token-level RBAC.
- **Phase 4 (Scale & Integrations)**: GCP Cloud Tasks for asynchronous background queues and external WhatsApp Gateway notification delivery.

## Development Workflow, Release & Quality Gates

### Code Conventions & Scope Safety
- **File Organization**: Apps Script flat directory structure with layer suffixes (e.g., `auth.controller.gs`, `letter.service.gs`, `user.repository.gs`).
- **Naming Standards**: PascalCase for data models/types, camelCase for functions and variables, UPPER_SNAKE_CASE for constants and enums.
- **Global Scope Protection**: Because all `.gs` files share a single global scope, files MUST NOT include top-level statements with side-effects (e.g., executing `SpreadsheetApp` during file evaluation). Layers MUST be encapsulated inside module objects (e.g., `const letterService = { ... }`).
- **JSDoc Requirement**: Every function invoked across files MUST include standard JSDoc annotations detailing purpose, `@param`, and `@return`.

### Commit Conventions & Versioning
- **Commit Format**: Conventional Commits v1.0.0 (`feat:`, `fix:`, `refactor:`, `style:`, `docs:`, `chore:`) with imperative lowercase descriptions, no trailing period, and an explicit version footer:
  ```text
  feat(letter): add atomic sequential numbering lock

  Version: v0.2.0
  ```
- **Semantic Versioning**: The project follows SemVer 2.0.0 starting at `v0.1.0`. The single source of truth for the codebase version is the root `VERSION` file. Any commit that increments version MUST update `VERSION` within the same commit.
- **Deployment Workflow**: Code updates are managed and pushed via `clasp` (`clasp push`, `clasp deploy`).

### Quality Gates
Before any release or production deployment:
1. All critical unit test suites in `*.test.gs` MUST execute and pass without error.
2. The manual UAT smoke test checklist (covering digital finalization, wet signature upload, rejection flow, and whitelist rejection) MUST be validated.
3. The root `VERSION` file MUST align with the release tag and commit footer.

## Governance

### Constitutional Primacy
This Constitution constitutes the supreme engineering authority for Sistem Manajemen Surat Menyurat. It supersedes all informal team habits, uncommitted discussions, and conflicting project artifacts. Any conflict between existing implementation and this Constitution MUST be resolved in favor of this Constitution.

### Amendment Procedure
- Proposed amendments to principles or governance rules MUST be submitted as formal pull requests or Spec Kit workflow updates.
- Any amendment modifying, expanding, or removing principles requires documented architectural justification, an analysis of backward compatibility, and an implementation plan for migrating existing code.
- Temporary exceptions or informal deviations are strictly prohibited; changes MUST be formally codified into this Constitution.

### Semantic Versioning of Constitution
The Constitution itself is versioned according to Semantic Versioning principles:
- **MAJOR** increment: Removal, redefinition, or backward-incompatible restructuring of core principles or governance policies.
- **MINOR** increment: Addition of new principles, material expansion of technical guidelines, or formal ratification of new architectural phases (e.g., Phase 1 transition).
- **PATCH** increment: Editorial refinements, typo fixes, non-semantic wording clarifications.

### Compliance Review & Enforcement
- All engineering activities—including feature specifications (`/speckit-specify`), architectural plans (`/speckit-plan`), and task implementations (`/speckit-implement`)—MUST actively verify conformance with this Constitution.
- Pull requests and code reviews MUST reject code that violates the layered architecture, bypasses server authorization, introduces formula injection vulnerabilities, or omits mandatory critical unit tests.

**Version**: 1.0.0 | **Ratified**: 2026-09-24 | **Last Amended**: 2026-09-24
