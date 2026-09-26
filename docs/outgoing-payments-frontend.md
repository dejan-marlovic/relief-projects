# Outgoing payments frontend

Implements the backend V34 contract in `D:/projects/relief_projects/docs/outgoing-payments.md`.

## Interface

Each payment order has an **Outgoing payments** disclosure. Opening it loads the server's coherent page, totals, recipient, current project/currency, binding and eligibility. An empty list still shows eligibility. Headerless orders use the envelope's project for evidence; existing order supporting-document rules are unchanged.

Recipient commitments, paid, remaining and excess are primary. Whole-order comparisons are separate and explicitly not authorization to pay more to the recipient. Totals cover all pages; null means unavailable. Exact amount strings retain up to six meaningful decimal places without Number arithmetic or rounding.

Creation records the explicit recipient/currency shown when opening the form. The first payment requires denomination confirmation. Row actions use each payment's eligibility, not envelope action flags or guessed Booked rules. Admin corrections and voids require reasons; corrections start with an empty evidence selection. Retained originals, correction links, entry/void attribution and unavailable evidence remain visible.

Evidence uses exact project document versions and authenticated blob downloads. Focus/explicit refresh and command completion reload server availability. Outgoing-payment events are rendered in combined payment-order history and Admin audit history, including VOID and retained context.

## Retry behavior

An in-flight command is saved in tab-scoped session storage under the authenticated user's identity and payment-order ID before sending. A connection failure or uncertain server response retains the original UUID, route, JSON body and revision. **Retry same request** reuses that command, including after navigation/reload. Successful completion clears it and refreshes the list/history. Definitive validation/conflict responses preserve the form; stale revisions are never automatically replaced or retried.

The persisted command includes its draft and is scoped to this browser tab. Clearing tab/session storage loses that recovery state. UUID generation requires a supported secure browser context (HTTPS or localhost). The UI neither executes bank payments nor performs reconciliation, refunds or cost-detail expenditure allocation.

## Manual acceptance

1. Restart the backend normally to apply V34. Choose an eligible APPROVED order with one active recipient and valid approved funding references. Booked is not itself a blocker.
2. Expand Outgoing payments. Verify the recipient organization and contributing subtotal.
3. Record a small partial payment, choose its payment date and confirm denomination for the first entry. Optionally select evidence.
4. Verify recipient remaining decreases, the new payment appears in combined history, and commitments/signatures remain unchanged.
5. As Admin, correct the amount with a reason. The original must remain voided, the replacement must be linked, and only the replacement contributes to totals. Original evidence must not be silently copied.
6. Optionally test an excess payment: recipient excess must remain prominent even if order remaining is positive. Void the test entry with a reason; this is not a refund.

Automated verification is recorded in the task completion message. Live payment creation and broader operational acceptance remain user-controlled. No backend/database changes, commit or push are part of this frontend implementation.

## Automated verification

- 42 focused tests passed across outgoing payments, record history and Admin audit history.
- Full frontend suite: 461 tests in 77 suites passed.
- Production build passed (source maps disabled for this verification run), with existing lint/bundle-size warnings; no outgoing-payment warnings.
- Final diff and whitespace checks passed. No live outgoing payment was created by this task.
