import { render, screen } from "@testing-library/react";
import TransactionCurrencyContext from "./TransactionCurrencyContext";
const observed = (name, budgetId) => ({ source: "CURRENT_BUDGET_CONFIGURATION", availability: "AVAILABLE", currency: { id: 3, name }, budgetId });
test.each(["CREATE", "UPDATE", "DELETE", "RESTORE", "APPROVE"])("%s displays immutable observed currency without live lookups", (action) => {
  render(<TransactionCurrencyContext event={{ entityType: "TRANSACTION", action, transactionCurrencyContext: { version: 1, current: observed("Recorded SEK", 9), previous: observed("Previous SEK", 8) } }} />);
  expect(screen.getByText(/Before: Previous SEK/)).toHaveTextContent("Budget #8");
  expect(screen.getByText(/After: Recorded SEK/)).toHaveTextContent("Budget #9");
});
test("historical null context stays unknown and unsupported versions have a fallback", () => {
  const { rerender } = render(<TransactionCurrencyContext event={{ entityType: "TRANSACTION" }} />);
  expect(screen.getByText("Historical currency observation not recorded.")).toBeInTheDocument();
  rerender(<TransactionCurrencyContext event={{ entityType: "TRANSACTION", transactionCurrencyContext: { version: 2 } }} />);
  expect(screen.getByText(/unsupported format/)).toBeInTheDocument();
});
