# Optional project metadata frontend

Implements the V47 contract in the backend's `docs/project-classification.md`.

- New Project can collect supplementary Swedish/English titles and narrative target group after a fresh project-detail response confirms all three keys (including explicit nulls). Without an existing project to probe, create normally and add optional details afterward. No write probes or inferred translations.
- Project details and Admin project editing use a shared optional-details section with its own Save optional details button. It loads a fresh detail, checks capability and submits existing required metadata plus only changed optional properties. Blank clears to null. Canonical names/selectors remain unchanged.
- Ordinary Project image/address/caption/general saves omit the new fields through `projectMetadataPayload`; Admin's existing explicit payload also omits them. Independent saving is labelled to avoid implying that the main project save submits these drafts.
- Read-only readers see explicit Not recorded values. Text is rendered as plain text. Length validation follows the documented Java whitespace normalization and UTF-16 limits.
- Drafts survive failed writes; saving is blocked until a read refresh. The refreshed saved values are shown for comparison, retaining intended changes and adopting unrelated new values. No automatic mutation retry or claim of server-side stale-write protection.
- Saves reread project details, refresh displayed assessment provenance and update the project export data. An event refreshes mounted assessment views; assessment navigation already fetches fresh details. Financial Project Snapshot metrics are unaffected and no translated titles are inserted into historical decisions.
- Project Excel export includes the three labelled fields when supported, with Not recorded for unknown values and the existing plain-string/wrapped report cells. Other exports retain the canonical name.

Verification: 35 focused tests initially passed across metadata, registration and both assessment pages. After adding registration capability coverage and refining failure recovery, all 8 metadata/registration tests passed. Targeted lint has only the pre-existing unused projectOrgOptions warning. Production build passed with existing lint/bundle warnings. Whitespace checks passed. Live acceptance is user-controlled.

Manual smoke test: open Project details, add Swedish and English titles and target group, click Save optional details and reload. Clear one title and save again. Change another project field or image caption; confirm the optional details remain. Check the Project Excel export. Target-group changes should show existing assessment review/resubmission behavior; supplementary titles alone should not. Repeat optional editing through Admin and create a new project with these fields.

Existing limitations remain: ordinary project metadata has no dedicated per-field history or atomic stale-form rejection. Theme, reporting geography, SDGs, strategic goals, gender and climate remain unresolved original requirements, separate from future MEAL work. No database access, backend changes, commit or push by this frontend slice.
