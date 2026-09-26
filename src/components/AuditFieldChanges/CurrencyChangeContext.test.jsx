import { render, screen } from "@testing-library/react";
import AuditFieldChanges from "./AuditFieldChanges";
const context = { version: 1, operationId: "shared-operation", mode: "CONVERT", sourceCurrency: { label: "Historic USD" }, targetCurrency: { label: "Historic SEK" }, conversionRate: { id: 40, base: { label: "USD" }, quote: { label: "SEK" }, value: "10.50000000", date: "2026-09-21T10:00:00" }, outputRates: [], unitPriceScale: 12, amountScale: 3, roundingMode: "HALF_UP" };
test.each(["BUDGET", "COST_DETAIL"])("%s update shows immutable currency context even without field changes", (entityType) => {
  render(<AuditFieldChanges event={{ action: "UPDATE", entityType, budgetCurrencyChangeContext: context }} />);
  expect(screen.getByText(/Historic USD → Historic SEK/)).toBeInTheDocument();
  expect(screen.getByText(/10.50000000/)).toHaveTextContent("2026-09-21 10:00:00");
  expect(screen.getByText(/shared-operation/)).toBeInTheDocument();
});
test("keep-values is distinguished and older audit events remain unchanged", () => {
  const { rerender } = render(<AuditFieldChanges event={{ action: "UPDATE", budgetCurrencyChangeContext: { ...context, mode: "KEEP_VALUES", conversionRate: null } }} />);
  expect(screen.getByText(/No conversion: the entered limit and retained unit prices/)).toBeInTheDocument();
  rerender(<AuditFieldChanges event={{ action: "UPDATE", budgetCurrencyChangeContext: null }} />);
  expect(screen.queryByRole("region", { name: "Recorded currency change" })).not.toBeInTheDocument();
});
