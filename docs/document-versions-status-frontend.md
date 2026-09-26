# Document status and replacement history — frontend

Implements `D:/projects/relief_projects/docs/document-versions-status.md`.

## Behavior

- Ordinary uploads (Documents and Admin) default to Draft and allow Final. Current metadata forms allow setting Draft/Final; legacy unknown status stays unknown until explicitly changed. Final is labelled as descriptive, not approval/signing.
- Documents defaults to the database-filtered `currentOnly=true` view. All active versions omits that predicate; category filtering remains independent. Rows identify status, version number and current/historical state.
- Version history uses a single chain request and preserves backend order. It shows deleted members and separates current-chain-head status from availability. Unknown deletion state never enables download or replacement.
- Version history offers replacement upload only on an active current version for ADMIN/PROJECT_MANAGER. It uses a new file with category inheritance, empty document date and Draft defaults. Only file/status and explicitly supplied category/date are sent. Old keys, identity and relationship fields are never submitted.
- Replacements use an explicit Save replacement action. Duplicate submissions are guarded. Conflict/missing-target responses refresh both history and the list; uncertain network outcomes close the form and ask the user to inspect refreshed history before retrying. No automatic upload retry is performed.
- Historical active files use the existing authenticated download helper. Deleted versions have no download action. ADMIN can delete/restore from history; deleting a head warns that older versions will not be promoted. A deleted head is explicitly shown as leaving no active current version.
- Historical metadata edits are disabled on Documents and Admin UpdateDocument. Project moves are disabled for any linked version. Admin conflicts reload current metadata rather than retrying a stale form.
- Successful mutations refresh the project view and open chain history. An open chain remains visible even if its latest version no longer matches the project filter. If every chain member is deleted, use the existing Admin Restore Document screen to restore an eligible member and reopen its history from Documents.
- Existing small-screen wrapping and theme colors are reused for the new controls and history panel.

## Verification

- Full suite: **309 tests across 53 suites passed**.
- New coverage includes replacement defaults/payloads, permissions, active historical downloads, deleted heads, restoration, unknown availability, 404/409/500 handling, uncertain network responses, current/all filtering, status updates, frozen historical metadata and linked project-move restrictions.
- Changed production files passed ESLint. JSX parsing, Documents SCSS compilation and `git diff --check` passed.
- The available browser session did not load project data, so live visual and replacement acceptance for this slice remains pending. No application files were uploaded/replaced/deleted and no backend restart or direct database access was performed.

## Manual acceptance

1. Rebuild/start the updated backend from IntelliJ so reviewed V23 is applied, then refresh/sign in to the frontend.
2. Upload a Draft document; set it to Final using Edit details.
3. Open Version history, choose Upload replacement, and verify Draft/empty date/inherited category defaults. Select a file and Save replacement.
4. Verify the list shows the new current version, history retains both, and both active files download. All active versions should show the older row without Edit details.
5. As ADMIN, delete the head in history. Confirm no active current version and no promoted predecessor. Restore the head and confirm it is current again.
6. Check that Admin Update Document prevents editing historical metadata and moving a linked version to another project. Check narrow-screen controls.

No backend source changes, file relocation or commit.
