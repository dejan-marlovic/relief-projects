# Printable payment-order report

Implements `GET /api/payment-orders/{id}/documentation` version 1 from the backend contract. No migration is required; the updated backend must be restarted before live acceptance.

## Entry and observation

Payments → an existing order → Details & activity → View / print payment-order report opens `/payment-orders/:id/report` in a separate tab, preserving the original editing draft. This read-only route is outside the project navigation layout so printing contains the report. Authentication is supplied by the normal authenticated fetch helper; backend read authorization controls access, including Booked/deleted cases. No selected-project identity is inferred.

The report renders only the single metadata response. Refresh replaces the entire observation and failures remove the old printable content. Unsupported/incomplete envelopes and structured limit errors block the Print button. Observation time and metadata/file-check boundaries are visible. No server snapshot or evidence is created.

## Contents and protection

Separate sections show order details, exact line/recipient commitments and currency diagnostics, outgoing-payment summaries/entries including corrections and voids, signature metadata, and current exact-version evidence associations. Amounts remain strings; unavailable values never become zero. Recipient subtotals are not added to commitments; whole-order remaining is explicitly not recipient payment authorization. Captured payment denomination and changed labels remain visible.

Only explicit report fields are rendered as React text. No raw signature, PIN, banking data, storage key or HTML is rendered. Historical evidence is downloaded by exact document ID through the existing protected blob helper, never by current-version redirects or public links. Downloads occur only on a user click and preserve actionable permission/file/storage errors.

Browser Print / Save as PDF uses a fixed numeric order-based title, A4 landscape styling, repeated table headings and wrapped content. Navigation/download buttons are hidden in print. Existing selected-order Excel export is unchanged. Browser page-break and saved-PDF acceptance remains manual.

## Manual acceptance

1. Open an approved/Booked order and its report. Compare commitments, recipient subtotal and recorded payments with the existing screen.
2. Print preview / Save as PDF; inspect long labels, multi-page tables and attribution. The report must not claim signing or settlement.
3. Download a linked historical document version and confirm its identity. Check an unavailable/storage-error fixture retains a clear failure.
4. Refresh after an allowed change and confirm the whole observation updates. Check headerless or inconsistent legacy orders display unavailable diagnostics.

Open requirements remain: the archive guide's combined signed evidence file, late order-level attachments, and agreed document-role/completeness rules. No financial/document mutations, backend edits, application-data writes, commit or push by this frontend work.

Verification: 18 focused report/protected-download tests passed; targeted ESLint passed without warnings; production build passed with existing application lint/bundle warnings. Final whitespace checks passed. Live print preview, pagination and protected-file acceptance remain manual.

User acceptance, 4 October 2026: user printed a payment-order report successfully and confirmed its presentation. Comprehensive manual and stakeholder verification remain pending.
