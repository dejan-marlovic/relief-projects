# Budget input precision frontend

Coordinated frontend support for the V27 CostDetailDTO decimal-string quantity contract.

- Quantity is validated as a positive decimal with up to twelve meaningful decimal places and DECIMAL(31,12) capacity, then submitted as an exact string.
- Price accepts twelve meaningful decimal places within DECIMAL(30,12); allocation accepts twelve within 0–100. Excess trailing zeros are accepted; meaningful excess is rejected without rounding.
- Inline create/edit and the standalone creation form allow fractional quantities and fine-grained price/percentage inputs. Periods remain integral, with the existing browser-safe integer limitation unchanged.
- Advisory previews reuse exact BigInt intermediate arithmetic and independently round converted unrounded local values. Saved backend amounts remain authoritative.
- Excel input formats show up to twelve fractional places; periods have integer formatting and output amounts retain three places. Values exceeding Excel's significant-digit limit remain text. Totals still sum saved values.
- Audit rendering already preserves DECIMAL strings and historical INTEGER values; regression coverage added without rewriting history.

## Verification

Full frontend suite passed: 56 suites, 350 tests. Subsequently strengthened exact save/export tests and added an audit compatibility test; all nine tests in the three affected suites passed. Utility ESLint and final diff/whitespace review passed.

Examples include the 0.125-unit contract case, twelve-place workbook row 29, smallest positive quantity, storage limits, meaningful-scale rejection and trailing-zero equivalence. No application records or backend processes changed; nothing committed.

## Manual test

Rebuild/restart the matching backend in IntelliJ so V27 is applied before fractional writes. In a Draft/Returned budget, enter 0.125 units, price 19.99, 3 periods and 25% allocation. Local preview/save should be 1.874. With reporting 10.5, GBP 0.8 and EUR 0.9 the other values are 19.678, 1.499 and 1.687. Different configured rates produce different conversions.

Reload and verify fractional inputs, then change a twelfth decimal, check exact history and export. Inputs with a thirteenth nonzero decimal should fail validation. This slice does not reinterpret budget header totals or transaction shares.
