# Responsive documents

Documents retains its desktop list. At tablet widths, padding is reduced and action targets are at least 44px. At phone widths (700px and below), file details and actions stack, Delete gains a visible label, and the list uses document scrolling. Long filenames, uploader names, and project names wrap within the available width. Styles use existing theme variables.

Upload wording now works for touch and mouse users. Upload validation, permissions, download links, delete confirmation, and API calls are unchanged.

Verification: all 28 existing Documents and Layout authorization/file-validation tests passed. Production build passed with existing lint and bundle-size warnings; diff checks passed. Isolated markup fixtures using the production styles were visually checked at 320px and 900px, including long filenames and uploader names. Live authenticated acceptance remains a manual check.

Manual check: open Documents at phone and tablet widths, select a project, inspect long filenames, and try permitted upload/download/delete actions using disposable demo files. Confirm viewer accounts have no upload/delete controls.

No backend restart required. No application data changed and no commit created.
