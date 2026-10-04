# Idea Research: Take Letter Number Without Creating Letter

- **Slug**: take-number
- **Created**: 2026-09-28
- **Evidence confidence (overall)**: medium

## Users & Demand

- Single user request: "Lets drafters take letter number without creating letter through application." Stated demand exists, but no quantitative frequency, incident ticket, or user interview transcript is currently attached — [source: .specify/assessments/take-number/intake.md] (confidence: low)
- Drafters encounter off-system authoring needs: In standard administrative workflows, letters or certificates are occasionally designed in external software (Canva, InDesign, specialized desktop templates) or prepared by external partner institutions, requiring an official registration number prior to or independently of digital drafting — [ASSUMPTION] (confidence: medium)
- Desire to bypass review bottlenecks: Drafters may seek standalone numbers to expedite time-sensitive physical correspondence when the signatory is immediately accessible in person, avoiding the multi-step online review queue — [ASSUMPTION] (confidence: medium)

## Prior Art

- Internal implementation (coupled numbering): `numberingService.allocateNumber()` is tightly coupled with `letterService.createLetter()`. Every issued number currently instantiates an active letter record with status `IN_REVIEW`, a dynamic `approvalFlow`, and an empty unsigned Google Doc draft — [source: src/letter.service.gs:139-166; specs/001-manajemen-surat/spec.md:FR-004] (confidence: high)
- Internal atomic numbering & recycled pool: The system uses Google Apps Script `LockService` (30-second wait lock) and a FIFO `recycledNumbers` pool in `counterRepository` to enforce sequential uniqueness and eliminate gaps when drafts are rejected — [source: src/numbering.service.gs:29-103] (confidence: high)
- External e-Office / Tata Naskah Dinas benchmarks: Systems such as government e-Office (e.g., SRIKANDI) and enterprise document registries often support "Booking Nomor" / "Ambil Nomor Manual". However, they universally require mandatory upfront metadata (Subject/Perihal, Recipient/Tujuan, Date/Tanggal) and enforce a mandatory reconciliation upload SLA (e.g. must upload scanned PDF within 7 days) — [ASSUMPTION based on standard Indonesian correspondence systems] (confidence: medium)

## Market & Context

- Current user workarounds without this feature: Drafters either create "dummy" drafts in the app with dummy text just to extract the allocated number, or they invent/guess numbers outside the system. Dummy drafts pollute the review queue, while manual out-of-band numbering causes duplicate numbers and audit discrepancies — [ASSUMPTION] (confidence: medium)
- Cost of doing nothing: High friction for non-standard documents leading to off-system number generation that damages numbering integrity; or adoption resistance from administrative personnel who manage physical / urgent mailings — [ASSUMPTION] (confidence: medium)

## Data & Constraints

- Numbering format & monthly partitioning: Numbers follow `{urutan:04d}.{kode_template}/{bulan_romawi}/{tahun}` with monthly reset/counter partitioning (`Utils.formatLetterNumber`) — [source: src/numbering.service.gs:88; src/Utils.gs] (confidence: high)
- Database schema structure: The database (`Letters` sheet in Google Sheets) expects columns for `letterId`, `letterNumber`, `drafterEmail`, `status`, `approvalFlow`, and drive file references. Issuing standalone numbers requires either a new status (e.g., `RESERVED` or `EXTERNAL`) or a separate registry table to prevent breaking sheet schema and queries — [source: src/letter.repository.gs; specs/001-manajemen-surat/data-model.md] (confidence: high)
- Records management & compliance: Archival standards (e.g., ANRI / ISO 15489) require all issued official correspondence numbers to map to identifiable records with traceable ownership and intent; completely anonymous or unindexed number generation is an audit violation — [ASSUMPTION] (confidence: high)
- Concurrency & lock constraints: `LockService` script lock has a 30,000 ms timeout window (`src/numbering.service.gs:32`). Quick number allocation operations are safe, but handling long-term reservations requires persistent storage rather than in-memory locks — [source: src/numbering.service.gs:32] (confidence: high)

## Evidence Against the Idea

- Circumvention of Governance & Separation of Duties: The foundational principle of `001-manajemen-surat` is hierarchical review (`FR-003`, `FR-006`) and separation of duties. Allowing drafters to generate official numbers unassisted removes supervisor oversight prior to external document distribution — [source: specs/001-manajemen-surat/spec.md:FR-003, FR-006] (confidence: high)
- Risk of "Phantom" / Abandoned Numbers: If drafters take numbers that are never subsequently uploaded or reconciled, the organization is left with missing files in official audit trails, which is a major compliance risk — [ASSUMPTION] (confidence: high)
- Recycled Pool Ambiguity: If a taken number is later cancelled or abandoned, re-releasing it into the `recycledNumbers` pool creates uncertainty if the number was already communicated or printed on external physical letterheads — [source: src/numbering.service.gs:106-136] (confidence: medium)
- Disincentive for In-App System Adoption: Providing a zero-friction "take number" escape hatch may discourage users from utilizing the full in-app authoring and digital signature workflows — [ASSUMPTION] (confidence: medium)

## Gaps & Open Questions

- [NEEDS CLARIFICATION: Who raised this request, and is this an edge case or a daily operational requirement?] Drafter request numbers, higher authority approve the request.
- [NEEDS CLARIFICATION: What minimum metadata (e.g., classification code, subject, recipient, purpose) must be captured upon taking a number?] Drafter must fill subject, recipient and date
- [NEEDS CLARIFICATION: Should standalone number taking be restricted to specific privileged roles (e.g. Secretary / Admin) rather than all Drafters?] All Drafters is okay because there are approval workflow
- [NEEDS CLARIFICATION: Should the system enforce an expiration period (e.g. 7 or 14 days) and require an eventual scan upload to close the record?] 7 days, When number reserved drafter or approver must provide scanned letter using system.
- [NEEDS CLARIFICATION: How should taken numbers without a final PDF appear in the public archive search (FR-012)?] 

## Sources

- Internal Repository: `specs/001-manajemen-surat/spec.md` (Features, FR-003, FR-004, FR-006, FR-012)
- Internal Repository: `specs/001-manajemen-surat/data-model.md` (Letters schema, Counter schema)
- Internal Repository: `src/numbering.service.gs` (allocateNumber, releaseNumber, LockService)
- Internal Repository: `src/letter.service.gs` (createLetter flow and numbering invocation)
- Internal Repository: `.specify/assessments/take-number/intake.md` (Initial idea capture)
