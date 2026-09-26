# Authoritative budget calculations: frontend

Implemented against the backend contract in `D:/projects/relief_projects/docs/budget-calculation-contract.md` (2026-09-18). No backend edits, database access, or commits.

## Behavior

- Removed the entire whole-row recalculation PUT loop. A budget-save refresh now performs GETs only. Budget PUT owns atomic recalculation.
- Cost details expose units, unit price, periods, and allocated share. Defaults are 1, 0.00, 1, and 100%. Existing missing inputs remain missing until explicitly corrected or normalized.
- Local preview = units × unit price × periods × allocation percentage / 100. Exact integer-backed decimal arithmetic rounds each currency independently HALF_UP to three places, using unrounded local. Missing/invalid directional rates leave converted previews blank. Previews are advisory; backend configuration, funding, lifecycle and overflow validation is authoritative.
- All four amounts are read-only. POST/PUT send editable inputs only, with decimal strings. Saved responses and fresh GETs replace previews. Failed requests retain drafts and show structured field errors, including configuration errors.
- Category totals sum saved decimals. Excel exports fetch saved rows, include periods and allocation percentage, and sum saved amounts exactly. Values beyond Excel's 15-digit precision remain text.
- Project snapshot displays separate exact reporting totals by configured currency. Allocation defaults and requests preserve decimal strings.
- ADMIN/FINANCE can explicitly recalculate editable budgets using one POST. ADMIN alone sees an opt-in checkbox to fill null inputs with defaults. No implicit normalization. Header drafts and active row edits disable recalculation; results report examined/updated/normalized counts.
- Successful recalculation reloads the header, child rows, rates, and combined history. Successful budget PUT uses its authoritative response and reloads rows/rates/history. Failed atomic operations do not update displayed saved values.
- Currency/rate selectors constrain directional pairs, positive rates and identity rates. Missing reporting targets may be derived by the backend from explicitly selected rates. Legacy localExchangeRateId remains outside calculation ownership.
- History labels include the three target currencies. Previous currency context renders for same-parent currency changes as well as moves; historical arithmetic is never recomputed.

## Limits

- Browser integer inputs are bounded to Number.MAX_SAFE_INTEGER, deliberately below backend BIGINT maximum, to prevent silently rounded JSON integers. Decimal inputs and amounts retain the full backend decimal precision.
- Existing alternate create-cost-detail form is aligned with defaults, input-only payloads and server errors. There is no separate Admin cost-detail amount override.
- Allocation/payment pages load capacity data on their own route; they are not mounted beside the budget editor. This does not add live cross-tab synchronization.
- No application-database or live-browser acceptance was performed. The pre-existing backend theme-column schema-validation mismatch is unchanged.

## Manual acceptance

1. Restart the updated backend and refresh the frontend. Select an editable demo budget with valid explicit local-to-reporting/GBP/EUR rates.
2. Create/edit a row: units 3, price 19.99, periods 2, allocation 25. Local should save as 29.985. At rates 10.5 / 0.8 / 0.9, outputs should be 314.843 / 23.988 / 26.987.
3. Confirm all four amount fields are read-only. Zero-price/zero-share drafts should show 0.000 after save. Invalid percentages, missing configuration or funding conflicts should retain the draft and show errors.
4. Save a selected rate change, then check saved rows, totals and history. Browser network traffic must contain no cost-detail PUT loop.
5. Use Recalculate saved costs; repeating with unchanged values should report zero updates. ADMIN normalization is explicitly opt-in and only fills missing values.
6. Export Excel and compare row values/category totals to saved values. Check periods and the configured reporting-currency label.

## Verification

- `npm test -- --watchAll=false --runInBand`: 233 tests across 38 suites passed.
- Coverage includes backend rounding examples, zero drafts, invalid input/rate previews, exact large totals, input-only create requests, preserved failed drafts, read-only amounts, refresh without child PUTs, recalculation permissions/normalization/errors, same-parent currency history, and actual ExcelJS worksheet contents from saved rows.
- `npm run build`: production build passed with existing repository lint/bundle-size warnings.
- `git diff --check`: passed.
- Manual/browser acceptance remains for the user; no application records were changed.
