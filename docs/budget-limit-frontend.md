# Budget limit frontend

Coordinated support for V28 and exact decimal-string BudgetDTO.totalAmount.

## Changes

- Budget create/edit and Admin forms preserve limit strings, validate positive DECIMAL(21,3) values without Number conversion, and label local-currency budget limits.
- Budget planning panel reads the server summary for limit, planned costs and remaining capacity. Unconfirmed meaning and unavailable totals remain distinct; invalid IDs and partial known subtotal are visible. Negative remaining capacity is preserved.
- Separate explicit confirmation/limit-only form sends just totalAmount and confirmedLocalCurrencyId. Only Admin/Finance on Draft/Returned budgets can use it; approved records remain read-only. Main budget adoption is disabled during other edits; Discard header edits provides a way back.
- Local-currency changes require explicit user confirmation and send the matching currency ID through ordinary PUT. Existing backend guards remain authoritative.
- Summary refresh follows child mutation history refresh, parent amount/currency/adoption/lifecycle changes and explicit refresh. Limit-only response refreshes parent detail state and history without recalculating children.
- Human backend limit errors remain visible; rejected operations never report successful partial saves.
- Excel exports use exact decimal protection for saved header limits and include currency plus unconfirmed-meaning labels. Existing audit total label is retained for historical compatibility; new currency-adoption references have a readable label.
- Admin limit-only form is available on Update Budget; Delete/Restore displays identify the stored limit without assuming confirmed currency meaning.

## Verification

Full frontend suite: 57 suites, 356 tests passed. New tests cover explicit adoption, exact maximum input, unavailable partial totals, negative capacity, approved read-only behavior, precision limits and server rejection. Strengthened export coverage verifies exact large header limits and unconfirmed currency labels. Relevant suites rerun after final fixes. Stylesheet compilation and ESLint checks completed; pre-existing CreateNewBudget useMemo dependency warnings remain.

No application database access, backend restart, adoption of real records or commit performed. Live manual acceptance requires the matching backend with V28.

## Manual acceptance

1. Rebuild/restart IntelliJ backend with V28 if not already running it.
2. Open an existing Draft/Returned budget. In Budget planning, inspect totals, enter the intended local-currency limit, check the explicit confirmation and save.
3. Confirm that unconfirmed status changes to Within limit, At limit, Over limit or Unavailable according to persisted records.
4. Add/edit a cost to exactly the limit, then attempt 0.001 above. Verify rejection and unchanged saved costs/history.
5. For an over-limit adopted budget, reduce costs or raise the limit; verify additions remain blocked during repair.
6. Check Excel, adoption history and approved legacy read-only behavior.

Backend contract: D:/projects/relief_projects/docs/budget-limit.md.
