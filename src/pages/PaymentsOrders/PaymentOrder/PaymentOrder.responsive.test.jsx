import { fireEvent, render, screen } from "@testing-library/react";
import PaymentOrder from "./PaymentOrder";
jest.mock("../../../components/RecordHistory/RecordHistory", () => () => null);
const props = {
  po: { id: 106, transactionId: 47, paymentOrderDescription: "Demo payment", amount: 123.45, lifecycleStatus: "DRAFT" },
  transactions: [{ id: 47 }], visibleCols: Array(8).fill(true),
  onSave: jest.fn(), onChange: jest.fn(), onCancel: jest.fn(), canEdit: true, canDelete: true,
};
test("compact edit requires Save and preserves values when resizing", () => {
  const onSave = jest.fn();
  const { rerender } = render(<PaymentOrder {...props} compact isEditing onSave={onSave} />);
  fireEvent.blur(screen.getByRole("textbox", { name: "Description" }));
  expect(onSave).not.toHaveBeenCalled();
  expect(screen.getByText("123.45")).toBeInTheDocument();
  expect(screen.queryByRole("spinbutton")).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  rerender(<PaymentOrder {...props} isEditing onSave={onSave} />);
  expect(screen.getByRole("textbox", { name: "Description" })).toHaveValue("Demo payment");
  fireEvent.blur(screen.getByRole("textbox", { name: "Description" }));
  expect(onSave).toHaveBeenCalledTimes(2);
  rerender(<PaymentOrder {...props} compact isEditing saving />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getByRole("textbox", { name: "Description" })).toBeDisabled();
});
test("Booked order remains selectable and readable but cannot mutate", () => {
  const onSelectChange = jest.fn();
  render(<PaymentOrder {...props} compact locked canSubmitLifecycle onSelectChange={onSelectChange} />);
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete payment order" })).toBeDisabled();
  expect(screen.queryByRole("button", { name: /Submit payment order/ })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show lines" })).toBeEnabled();
  fireEvent.click(screen.getByRole("checkbox", { name: "Select payment order 106" }));
  expect(onSelectChange).toHaveBeenCalledWith(106, true);
});
test("compact viewer has no mutation controls", () => {
  render(<PaymentOrder {...props} compact canEdit={false} canDelete={false} />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete payment order" })).not.toBeInTheDocument();
  expect(screen.getByRole("button", { name: "Show lines" })).toBeEnabled();
});
