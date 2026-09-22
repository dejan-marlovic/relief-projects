import { fireEvent, render, screen } from "@testing-library/react";
import Recipient from "./Recipient";
const row = { id: 7, organizationId: 1, paymentOrderId: 20, amount: "12.50", amountSummary: {status:"CONSISTENT",source:"CURRENT_BUDGET_CONFIGURATION",currency:{id:1,name:"SEK"}} };
const props = () => ({ row, compact: true, canManage: true, visibleCols: [true, false, false, false], orgOptions: [{ id: 1, label: "Relief organization with a long name" }, { id: 2, label: "Second organization" }], poOptions: [{ id: 20 }], onSave: jest.fn(), onChange: jest.fn(), onCancel: jest.fn(), onDelete: jest.fn(), onEdit: jest.fn(), onSelectChange: jest.fn() });
test("mobile editing requires Save and retains accessible field errors", () => {
  const p = props();
  render(<Recipient {...p} isEditing editedValues={{ organizationId: 1, paymentOrderId: 20 }} fieldErrors={{ organizationId: "Organization is required" }} />);
  const org = screen.getByLabelText("Organization", { selector: "select" });
  fireEvent.change(org, { target: { value: "2" } }); fireEvent.blur(org);
  expect(p.onChange).toHaveBeenCalledWith("organizationId", 2);
  expect(p.onSave).not.toHaveBeenCalled();
  expect(org).toHaveAttribute("aria-invalid", "true");
  expect(org).toHaveAccessibleDescription("Organization is required");
  fireEvent.click(screen.getByRole("button", { name: "Save" })); expect(p.onSave).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(p.onCancel).toHaveBeenCalledTimes(1);
});
test("desktop retains inline blur save", () => {
  const p = props(); render(<Recipient {...p} compact={false} isEditing />);
  fireEvent.blur(screen.getByLabelText("Payment order", { selector: "select" }));
  expect(p.onSave).toHaveBeenCalledTimes(1);
});
test("locked cards remain selectable but cannot be edited or deleted", () => {
  const p = props(); render(<Recipient {...p} locked />);
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete recipient" })).toBeDisabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Select recipient 7" }));
  expect(p.onSelectChange).toHaveBeenCalledWith(7, true);
});
test("viewer has selection and information but no mutation actions", () => {
  render(<Recipient {...props()} canManage={false} />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete recipient" })).not.toBeInTheDocument();
  expect(screen.getByText("12.5")).toBeInTheDocument();
});
test("resize keeps the current controlled draft; saving disables repeated actions", () => {
  const p = props(); const editedValues = { organizationId: 2, paymentOrderId: 20 };
  const view = render(<Recipient {...p} isEditing editedValues={editedValues} />);
  view.rerender(<Recipient {...p} compact={false} isEditing editedValues={editedValues} saving />);
  expect(screen.getByLabelText("Organization", { selector: "select" })).toHaveValue("2");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
});
