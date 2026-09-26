# Recipient contribution conflict handling

Implements the line PUT/DELETE 409 handoff in the backend recipient-contribution-consistency contract.

- Client errors retain every recipientConflicts entry alongside existing field errors and messages.
- A full-width themed row panel identifies each payment order, recipient and organization, shows exact current/proposed subtotal strings, explains both reason codes and gives permission-aware resolution guidance. Unknown reason codes remain visible.
- No client-side inference from unavailable currency totals or dependency counts; the server decides contribution validity.
- Failed edits and deletions do not trigger mutation-success refresh or automatic retries.
- Refresh keeps row components mounted, updates untouched fields and preserves edited values. Failed refresh keeps existing rows. Lines missing from a subsequent response remain read-only for review, with a notice; close/reopen dismisses them. Successful local deletion removes the row normally.
- Existing successful-mutation callbacks continue reloading order summaries, line lists, derived choices and parent history. Recipient routes fetch current subtotals when opened. No new move UI or cross-browser synchronization was added.
- Existing role, lifecycle, Booked and exact-decimal behavior is retained.

Verification: 69 suites / 401 tests passed (15-second per-test timeout; the initial targeted export run hit the default five-second timeout). Final targeted conflict tests: 2 passed. Tests exercise PUT/DELETE, multiple conflicts, both reason codes, exact subtotal text, rejected draft retention, refresh with changed saved data, no auto-retry and a disappeared line. Changed-file ESLint, Sass compilation and git diff --check passed.

Manual acceptance after restarting the backend:
1. On an editable, unbooked order with an active recipient, change its only matching line to another organization and save.
2. Confirm rejection shows the recipient IDs and before/proposed subtotals, retaining the selected organization.
3. Refresh lines; confirm the entered change stays for review without another PUT.
4. Try deleting the sole contributing line; confirm equivalent conflict details.
5. With another sufficient matching line present, retry a permitted reassignment and check refreshed order/recipient totals and history.

No application data, backend files, restart, commit or push performed by this frontend task. Browser acceptance remains manual.
