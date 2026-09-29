import { render, screen, within } from "@testing-library/react";
import AllocationAuditDetails from "../AllocationAuditDetails/AllocationAuditDetails";
import LineAuditDetails from "../LineAuditDetails/LineAuditDetails";

test.each([[AllocationAuditDetails, "allocationContext"], [LineAuditDetails, "lineContext"]])("renders recorded execution provenance without live lookups", (Component, field) => {
  const event = { action: "CREATE", [field]: { version: 1, execution: { version: 1, familyId: 7, executableBudgetId: 27, executionDecisionId: 51, originBudgetId: 26, targetBudgetId: 27, bucketId: 272, assignmentId: 8, currencyId: 3, capturedCurrencyName: "Captured USD", reason: "Assigned for training" } } };
  const view = render(<Component event={event} />);
  const context = within(screen.getByRole("region", { name: "Recorded execution context" }));
  expect(context.getByText("Captured USD (#3)")).toBeInTheDocument();
  expect(context.getByText("#51")).toBeInTheDocument();
  expect(context.getByText("Assigned for training")).toBeInTheDocument();
  view.rerender(<Component event={{ action: "CREATE", [field]: { version: 1 } }} />);
  expect(screen.queryByRole("region", { name: "Recorded execution context" })).not.toBeInTheDocument();
});
