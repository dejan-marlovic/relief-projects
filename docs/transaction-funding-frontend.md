# Transaction funding precision and currency

Frontend coordination for the backend V30 contract in `D:/projects/relief_projects/docs/transaction-funding-contract.md`.

## Behavior

- Normal transaction create/edit and Admin create/update send all four financial fields as decimal strings. Requested and approved funding accept zero and up to 19 integer digits / three meaningful decimals, including trailing-zero equivalents. Excess precision is rejected without rounding. Shares retain their existing interpretation and server rounding behavior.
- Labels distinguish requested funding, approved funding and legacy shares. Help explains that own contribution is a recorded flag, not an amount or percentage; approval does not establish receipt or settlement. The operational guide's old funding-split and paid-allocation language is corrected.
- Saved transaction rows, Admin update/delete/restore and payment-order restoration references show currency from `fundingCurrency`. Unavailable metadata displays `Currency unavailable`, without guessing from old budget references. Observations describe current configuration, not historical verification. New unsaved records follow the chosen budget; their authoritative observation arrives with the saved DTO.
- Funding range filtering and sorting use exact scaled integers, distinguishing neighboring amounts beyond JavaScript's safe integer range. Identifiers retain numeric handling.
- Allocation approved funding, planned totals and remaining capacity use exact decimal arithmetic at six decimals. Unknown amounts stay unavailable. Header changes refresh allocation metadata and rows through the existing history refresh key. The percentage bar is advisory; exact remaining amounts determine its within/over-cap indication. Backend funding floors and ownership checks remain authoritative.
- Normal transaction saves reload the list and refresh history. Admin updates use the authoritative response, including rounded stored share values. Rejected writes retain entered values and show field errors.

## Excel

Selected-transaction exports preserve requested/approved values at three decimals, shares at two, and allocations at six. Values exceeding Excel's 15-significant-digit precision are text cells. Unknown values are not exported as zero. Current observed currency accompanies each transaction's budget label.

Per-transaction allocation totals and remaining capacity remain exact. Cross-transaction grand totals are deliberately omitted, including same-currency selections in this bounded slice; no new funding coverage report is introduced. A worksheet note explains mixed/unknown currency and unresolved share meanings. Shares are never summed as a meaningful financial total.

## History

Both record history and global Admin history render `transactionCurrencyContext` for every transaction action. Version 1 shows recorded current/previous names and budget IDs without live lookups. Older null context explicitly has no historical observation; unknown versions have a fallback. Existing field changes, lifecycle states and return reasons are preserved.

## Verification

- Full frontend suite: **64 suites, 388 tests passed**.
- New cases cover storage extremes, zero/trailing zeros/precision rejection, exact six-decimal shortfalls, large-value sort/filter distinctions, unknown currency, exact Excel values and suppressed totals, immutable audit observations, normal input strings, Admin request bodies and retained input/field errors, and allocation refresh after header edits.
- Changed-file ESLint: no errors after corrections; the existing Excel text-sanitizer control-character warning remains.
- Both changed Sass modules compiled; `git diff --check` passed.
- Read-only browser inspection confirmed the transaction page and revised labels load. The available browser session has no editing controls; application-data mutation acceptance is left to the user. No backend files, database records, configuration, migrations or commits were changed by this frontend task.

## Manual acceptance

1. Edit a DRAFT/RETURNED transaction as ADMIN/FINANCE. Save requested and approved funding with three decimals; verify values after reload and in history.
2. Check the displayed current budget currency. Older audit events must not gain a guessed currency observation.
3. With allocations present, try an approved amount below the permitted floor; inspect the error and retained input. A six-decimal commitment can require rounding the entered three-decimal funding amount upward explicitly.
4. Verify the allocation panel refreshes after a successful header edit.
5. Export selected transactions and inspect decimal values, per-transaction allocations and the explanatory note replacing grand totals.

Receipt/payment settlement, funding coverage, transaction FX, interpretation of legacy shares and historical currency adoption remain outside this slice.
