# Next requirements slice: project closeout and archive tracking

Reviewed 26 September 2026. This is a proposal/handoff, not an implemented backend contract.

## Why this slice

The task **Clarify next slice workflow** establishes the sequence: backend proposal, agreement on the contract, backend implementation, frontend integration, manual testing, then commits. Continue that sequence for new domain behavior.

The original requirements assessment is dated 18 September. Several gaps in it have since been addressed: protected document delivery, categories and metadata, version history, financial-record evidence, the project document checklist, assigned follow-ups, budget precision/limits/conversion, and transaction/payment amount consistency. Do not use its original missing-feature table as a current backlog without checking the newer contracts.

Incoming funding receipts have a new backend contract in `D:/projects/relief_projects/docs/funding-receipts.md` and an active backend task. Leave that implementation and its frontend integration with the existing workstream. The shared frontend also has broad notification/form changes in progress.

Project closeout is an independent remaining requirement. Read-only inspection of Project.java and ProjectController.java found ordinary project status, a Yes/No approval field, operational dates and soft deletion, but no closeout record or operations. A targeted source search found no donor final-report acceptance, physical archive location or retention/transfer review field. The document-checklist contract explicitly excludes closure, retention and file operations.

## Requirements evidence and limits

Sources:

- [Original requirements assessment](original-requirements-assessment.md), particularly findings 5 and the recommended sequence.
- [2023 archive guide](<D:/Operationella dokument för bistånd/Arkivering (Internationella projekt) ny 2023_1.odt>), sections on completed projects and digital documentation. Its text was reread directly for this proposal.
- [Current checklist contract](<D:/projects/relief_projects/docs/project-document-checklist.md>).
- [Current follow-ups contract](<D:/projects/relief_projects/docs/project-follow-ups.md>).

The archive guide connects administrative completion to receipt of approval of the final report. It requires physical and digital project documentation, identifiable locations and responsibility for archiving. It also describes later transfer of physical/digital records after ten years, with digital timing tied to donor approval. These are supplied organizational procedures, not a legal retention determination. The wording does not authorize destruction. The precise trigger, anniversary handling and applicability of a review reminder need agreement before calculation is implemented.

The existing checklist records evidence, not content review, completeness, donor acceptance or verified physical filing. A FINAL document label, completed follow-up, Closed status, financial approval or Booked order must not automatically become a closeout decision. An archive record also does not establish settlement or a zero financial balance.

## Recommended first boundary

Ask the backend for a proposal for an explicit **closeout and archive tracking record**, kept separate from the existing project status and deletion state. Investigate final-report acceptance date and exact-version supporting evidence, physical archive location/reference, a recorded filing date, and actor/time attribution. Recommend how corrections are recorded and how stale edits are rejected.

Prefer a small tracking feature first. A cross-module project lock, formal approval workflow, mandatory finance reconciliation, file relocation, export packet, retention enforcement and deletion automation are separate decisions and should remain deferred. The backend should determine whether even a formal CLOSED state belongs in this first slice or whether it would overstate what has been verified.

Potential frontend home: a separate closeout panel under Documents, next to the checklist. This is a recommendation, not an agreed navigation/API contract. Implement it only after the backend proposal is agreed and the final contract exists; use server permissions, exact-version evidence, revision-aware commands and clear unknown/unavailable states.

## Handoff

Use [project-closeout-backend-prompt.md](project-closeout-backend-prompt.md) in the existing backend task after its current receipt work is complete. The prompt is investigation-only. It has not been dispatched, and this task has not modified the backend, accessed the application database, or introduced placeholder closeout UI.

After the proposal: resolve its explicit product choices, request implementation and a verified frontend contract, then build the frontend and provide a short manual acceptance test. Commits are authorized by the user; stage only files owned by this slice and preserve unrelated work.
