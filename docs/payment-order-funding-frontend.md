# Payment-order funding frontend coordination

Implements the V32 contract in the backend's `docs/payment-order-funding-contract.md`.

## Behavior

- Line create/update sends amount strings. Validation accepts positive DECIMAL(20,6) values and equivalent trailing zeros; rejects overflow and excess meaningful fractional precision without rounding.
- Order totals and recipient subtotals use the server's calculated amount and summary. Missing, unavailable or inconsistent summaries never become zero or a locally invented total. EMPTY displays zero when provided by the server.
- Amount displays preserve meaningful digits while removing insignificant fractional zeros. Current currency ID/name and summary status appear with the amount; issue details retain codes and affected line IDs. Line inputs preserve saved amounts even when their currency is unavailable.
- Requested/approved funding and existing authorization, lifecycle and Booked behavior remain unchanged. No currency conversion or settlement inference was added.
- Order and recipient amount sorting/range filters use exact scaled integers. Their normalizers retain nulls and summary diagnostics.
- Excel exports retain six-decimal amounts, use text above Excel's 15-digit precision, and group usable totals by current currency ID. Unknown-currency, inconsistent and unavailable totals are excluded. Individual line amounts and currency observations remain exported. No cross-currency grand total or independently entered header-versus-line reconciliation is shown.
- Recipient summaries are independent server observations over the contributing subset; a valid subtotal does not certify the full order.
- Admin detail/restore/update views show amount summaries rather than replacing unavailable amounts with zero. Update recipient state preserves authoritative nulls and refreshed summary metadata.
- Combined and Admin history render versioned payment currency context, including before/current observations and issues. Earlier events explicitly show that no historical currency observation was recorded.

## Refresh and editing

Header mutations reload order lists and advance the history refresh key, which reloads expanded lines. Line mutations reload the order list, transaction choices, line list, eligible allocation choices and combined history. Refresh lines also refreshes its order summary. Recipient and transaction routes load current data when navigated to; this is not live cross-browser synchronization. No new line move UI was introduced. Existing full-form concurrency limitations remain; errors retain inputs and tell the user to refresh rather than retry automatically.

## Verification

- Complete frontend suite: 68 suites / 399 tests passed.
- Added precision boundary, exact string request, rejected-input retention, decimal filter/sort, currency-grouped real-workbook export, null diagnostic and historical context tests.
- Updated responsive fixtures to include the new summary contract.
- Changed-file ESLint: no errors; two existing export-sanitizer regex warnings.
- PaymentAmount Sass compiled; git diff --check passed.
- Live browser opened successfully, but project/data requests returned 401 in the in-app session. Authenticated browser acceptance remains manual; no application data was written.

## Manual acceptance

After restarting the backend with V32 and signing in:

1. Open Payments and expand a draft/returned order. Check calculated total, currency and any legacy issue details.
2. Save a permitted line amount such as 125.123456; check the refreshed order total, recipient subtotal and combined history. Funding/allocation caps still apply.
3. Try a seventh meaningful decimal: the form must reject it without rounding or discarding the input. Equivalent trailing zeros are accepted.
4. Check a legacy conflicting/unavailable order: total is unavailable, diagnostics identify the issue, and saved individual line amounts remain readable.
5. Export orders and recipients in different currencies: totals remain separate by currency ID, unknown totals are excluded, and precise amounts survive export.
6. Check mobile layouts and locked/read-only orders, plus a historical audit without currency context.

No backend edits, application database changes, restart, commit or push performed by the frontend task.
