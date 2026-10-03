# Project operating countries frontend

Implements the backend V48 contract in `D:/projects/relief_projects/docs/project-geography.md`.

- New Project uses the authenticated catalogue to enable optional country selection, including when no projects exist. Project details and Admin reuse the optional-details editor, requiring the fresh detail's two geography arrays as well as a successful lookup.
- Searchable checkbox choices use backend labels/codes and the server selection cap. Selected codes remain visible separately and can be removed. Retired entries cannot be newly selected; unknown labels show the raw code and a diagnostic. Empty means Not recorded.
- Country coverage remains independent of Address, nationality and financial currency. No inference, Region field or catalogue changes.
- Set comparison ignores ordering. Only edited geography is included in the existing valid PUT, with an empty array for explicit clearing. Unrelated metadata/caption/address and V47-only saves omit both geography properties. Required project fields come from a fresh read.
- Lookup errors preserve selections and disable geography changes pending explicit retry. Failed saves preserve drafts and require saved-state refresh/comparison before manual retry. Existing metadata last-write-wins limitations remain.
- Saved responses refresh visible optional metadata, assessment provenance, mounted assessment readers and the Project export data. Financial snapshot metrics are unaffected. Historical assessment labels remain backend snapshots.
- Project Excel export adds saved labels and codes (or Not recorded), separately from Address. No other exports or per-country financial aggregation change.

Manual acceptance: select a project, search for Lebanon, select it and Save optional details. Reload to confirm persistence, add Jordan and save, then remove both and save to clear. Verify Address and language titles remain unchanged, and inspect Project Excel export. Repeat through New Project and Admin. A material coverage edit should produce the existing assessment review/resubmission behavior, not revoke approval automatically.

No application database access, backend changes, restart, commit or push. Region and the other agreed classification gaps remain unresolved original requirements; MEAL remains deferred.

Verification: 42 focused tests across five suites passed; production build passed with existing lint/bundle warnings. Targeted lint reported only the pre-existing projectOrgOptions warning. Final whitespace check passed. Live acceptance remains user-controlled.
