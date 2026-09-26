# Financial-record supporting documents

Implemented a shared, responsive Supporting documents section beside record history for budgets, transactions and payment orders.

## Behavior

- Loads associations when expanded and refreshes on window focus or explicit refresh.
- Downloads the exact linked version through the protected download endpoint. Replacement uploads never silently change links.
- Shows document category, date, status, version, newer-version notices and retained unavailable associations.
- Opens existing version history read-only.
- Admin and Finance can link/unlink active Draft or Returned records; submitted, approved and Booked records remain read-only. Finish header editing before changing links.
- Uses the record's project; payment orders resolve ownership through their active header transaction, never their lines or the page's selected project.
- Selects current project documents by default, with an explicit option for active historical versions.
- Removing a link preserves the document/file. Headerless or inactive-project cases may still remove retained links where the backend permits it.
- Failed writes refresh server state without automatic retries or replacement operations.

## Verification

- 18 focused component tests; full frontend suite: 54 suites, 327 tests passed.
- New component ESLint and stylesheet compilation passed.
- Final diff review and `git diff --check` passed.
- Read-only browser smoke check against the running backend: Budget #24 supporting-documents section loaded its empty state and role restriction.
- Live link/unlink and replacement acceptance remain for manual testing with Admin or Finance. No application records were changed during browser verification.

## Manual acceptance

1. Use the backend build containing V24 (rebuild/restart IntelliJ if not already running it).
2. Open a Draft budget or transaction, then expand Supporting documents beside History.
3. Link a document from its project and download the linked version.
4. Upload a replacement through Documents; refresh the supporting-documents panel. Confirm the newer-version notice appears and the original linked download stays unchanged.
5. Explicitly link the replacement, then remove the original link. Verify both document versions remain available in Documents.
6. Repeat with a payment order with an active header transaction. Check read-only behavior for submitted/approved/Booked records and other roles.

No backend files, application database configuration, storage or commits were changed by this frontend slice.
