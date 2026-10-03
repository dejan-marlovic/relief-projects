# Project assessment frontend

Implemented 3 October 2026 against `D:/projects/relief_projects/docs/project-assessment.md` (V44). Backend restart/application migration and live acceptance are user-controlled.

## Workflow

**Project work → Assessment** follows the selected project. Four expandable steps explain preparation, exact-version evidence, independent submission/approval and explicit corrections. Backend capabilities control actions; the frontend grants no role or identity bypass. Approval remains separate from financial capacity, donor approval, operational status and closeout.

The page supports incomplete drafts, editing with reasons after submission, submission/withdrawal, independent approval with missing-evidence explanation, return, approval withdrawal, restricted deletion and ADMIN restoration. Immutable submission/approval bases, actors, retained history and current review warnings remain visible. Evidence links show purpose, captured/current labels, version, availability, removal attribution and whether included in approval or added later. Downloads use the existing protected download helper.

Each command retains the revision captured when its form opens. Double submission is guarded. Errors retain the draft and refresh assessment, evidence, history and project metadata; no command retries automatically. Explicit retry acknowledgement requires fresh permitted state and matching history/evidence revisions. A successful create followed by a lost response cannot silently create again. Navigation reuses unsaved-change confirmation. Focus/visibility refreshes reads without replacing form input.

## Compatibility changes

- Registration defaults to No and explains that new projects start unassessed.
- Project and Admin Update Project no longer expose editable approval controls.
- Ordinary Project metadata/caption saves omit managed approval and summary fields; Admin Update Project omits approval too.
- Project details, Admin update/restore and the project Excel export display provenance: legacy value without a recorded decision, default unassessed, or recorded assessment decision, with state/deletion/review flags.
- Assessment commands refresh the project DTO. Other project/admin screens reload project summaries when entered; there is no optimistic approval toggle or parallel approval writer.
- Existing success notifications distinguish assessment commands from ordinary project updates.

## Manual acceptance

1. Restart the backend normally for V44, then select a project and open **Project work → Assessment**.
2. Create an assessment. Fill rationale, feasibility and risks; select Proceed. Optional evidence uses exact versions. Submit for approval.
3. Verify the author/contributor cannot approve. Use a different active ADMIN/APPROVER account mapped to a different active Employee. Approve with a note and an explanation if assessment/committee evidence is missing.
4. Confirm recorded approval and immutable basis/history. Open Project details and verify the read-only provenance display.
5. Add late evidence; confirm it is outside the approval basis. Withdraw approval, edit with a reason and resubmit. Withdrawal must show no current recorded approval, not restore a legacy Yes.
6. Later test legacy Yes enrollment, changes to approved project context, stale revisions, deleted evidence, assessment deletion/restoration and new-project registration with realistic fixtures.

No application records were created or changed for automated frontend verification. No backend files, migrations, commits or pushes are part of this implementation. Extensive live acceptance remains pending.

## Verification

- Full frontend suite: **624 tests across 95 suites passed**.
- Eighteen added workflow/compatibility tests cover command payloads, independent approval capability, gap explanations, exact-version evidence, retained basis/late links, withdrawal/restoration, stale revisions, uncertain creation, failed refreshes, provenance and actual registration payload defaults.
- Production build passed with existing unrelated lint/bundle-size warnings.
- Targeted lint and `git diff --check` passed. Existing Project page retains its unrelated unused `projectOrgOptions` warning.

## User smoke acceptance — 3 October 2026

After rebuilding and restarting the corrected backend, the user confirmed independent approval by dario.marlovic: decision #7 approved submission #6 prepared by dejan.marlovic. The recorded approval, actor, missing-evidence explanation and retained history were displayed correctly. The false project-context warning disappeared. Extensive testing remains planned. Known wording issue: missing-evidence warnings still say an explanation is required after an approval with an explanation has been recorded; this does not invalidate the saved decision.
