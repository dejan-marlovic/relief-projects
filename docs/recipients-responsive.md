# Recipients responsive pilot

## Layout and behavior

- Above 1100px: existing desktop columns, column preferences, sorting, filters, and inline blur-save behavior.
- 701–1100px: compact flexible rows. All three data fields remain visible; organization names wrap. Column preferences continue to apply.
- 700px and below: labeled cards with organization, payment order, computed amount, selection, and touch-sized actions. Desktop hidden-column preferences are retained but do not hide card information.
- Phone editing uses an in-place form with explicit Save/Cancel. Blurring a field does not submit it. Creation and edits share existing payload construction, API calls, errors, locks, and role checks with desktop.
- Phone controls include sorting, filters, select-all, selected export, and existing bulk deletion. Filters/selection controls are disabled while a phone draft is open, preventing the active form from being hidden. Failed saves retain inputs and field-specific errors. A request guard prevents duplicate saves.
- Recipient route uses document scrolling on phones; shared header/project selection wraps within the available width. Other routes retain their existing scrolling behavior. Filter popovers gain bounded widths and touch-sized fields on phones.
- Reusable `useMediaQuery` hook handles viewport changes and listener cleanup. No Bootstrap or additional dependency.

## Verification

- Full existing/new suite: 239 tests across 40 suites passed.
- Additional page-level mobile test passed, bringing covered tests to 240: filter/selection controls, exact existing PUT payload, failed draft retention, and explicit retry.
- JSX/SCSS checks and git diff whitespace checks passed.
- Production build passed with existing repository warnings; final rebuild performed after the page-level guard changes.
- Isolated browser fixtures rendered the actual Recipient component and compiled styles at 320, 390, 900, and 1440px. Measured document scroll widths matched client widths at all four sizes; narrow-phone and tablet screenshots inspected, including long labels, editing errors and locked rows.
- Fixtures were static and separate from the application. No application records were changed. Live authenticated end-to-end acceptance and real-device keyboard behavior remain for manual checking.

## Manual acceptance

Open Recipients and resize the browser (or use device mode). Verify cards below 700px and compact rows up to 1100px. On a phone-width viewport, edit both relationship fields: moving between them must not save. Test explicit Save, Cancel, selection/export, filters and locked records. Resize with a draft open and confirm its values remain. Return to desktop and verify existing column preferences and editing behavior. No backend restart is required.

No commit created. Signatures is the next responsive slice.
