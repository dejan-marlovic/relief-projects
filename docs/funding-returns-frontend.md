# Returns to financiers frontend

4 October 2026. Implements the first direction in the V51 funding-return contract; recipient returns remain deferred.

- Each supported funding receipt has a Returns to financier section. Transaction and receipt summaries separately display gross received, returned principal and net retained, using exact server strings and all-page aggregates. Missing capability is unavailable, never zero. Multi-currency/invalid scalar totals remain unavailable, with server per-currency observations retained.
- Commands use the original receipt's captured currency, date-only return date, exact three-decimal input, reason and optional exact document versions. Ownership for document selection is fetched from the source receipt, never inferred from the project selector. Evidence is independently selected for corrections.
- Server collection/row eligibility governs create, correct, void and evidence actions. Both revision tokens are captured where required. A stale/definitive error preserves input and requires explicit review before using refreshed tokens. Uncertain outcomes persist the exact request ID/body in tab storage scoped to user and receipt; deliberate retry uses the identical command even after navigation/reload. No automatic retries.
- Original receipt correction/void is blocked when recorded returns exist, including an already open form. Genuine returned money must not be voided to bypass the guard. Evidence actions remain independent.
- Return details include retained corrections/voids, cross-page related-entry lookup, protected exact-version downloads and per-row availability issues. Parent transaction history and Admin audit render FUNDING_RETURN context. Closeout shows separate returned/net figures without changing gross diagnostics, decisions or redaction.
- Success notifications identify financier returns rather than incorrectly reporting another receipt. Existing funding/commitment totals and outgoing-payment reports retain their meanings.

Verification: 60 focused tests passed across returns, receipts, transaction history, Admin audit, closeout and notifications. Targeted ESLint passed. Production build passed with existing application lint/bundle warnings. Backend rebuild/restart was reported by the user; on 6 October the user confirmed a 57 USD return against receipt #3 on transaction #105: gross 200 USD remained unchanged, returned 57 USD and net retained 143 USD, with original-receipt change guards displayed. Broader acceptance remains pending.

Manual smoke test: open an active Approved transaction and its recorded receipt. Expand Returns to financier, record a small positive amount in the receipt's currency, with an actual return date and reason. Confirm gross is unchanged, returned increases, net decreases, and original receipt correction/void is blocked. Inspect transaction History with child activity included. Broader acceptance includes partial/full/capped returns, corrections, evidence, lost-response replay, stale revisions and currency/reference diagnostics.

No bank transfer, reconciliation, new spending capacity, automatic order creation or recipient-return workflow is introduced.
