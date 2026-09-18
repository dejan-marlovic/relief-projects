import { fireEvent, render, screen } from "@testing-library/react";
import Transaction from "./Transaction";
jest.mock("../../../components/RecordHistory/RecordHistory", () => () => null);
jest.mock("./TransactionAllocations/TransactionAllocations", () => () => <div>Allocation panel</div>);
const props = {
  tx: { id: 47, organizationId: 2, lifecycleStatus: "DRAFT", appliedForAmount: 100 },
  organizations: [{ id: 2, name: "Relief partner" }], visibleCols: Array(14).fill(true),
  onSave: jest.fn(), onCancel: jest.fn(), onChange: jest.fn(), canEdit: true,
};
test("compact editor requires Save and keeps values when resizing", () => {
  const onSave = jest.fn();
  const { rerender } = render(<Transaction {...props} onSave={onSave} compact isEditing />);
  fireEvent.blur(screen.getAllByRole("spinbutton")[0]);
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  rerender(<Transaction {...props} onSave={onSave} isEditing />);
  expect(screen.getAllByRole("spinbutton")[0]).toHaveValue(100);
  fireEvent.blur(screen.getAllByRole("spinbutton")[0]);
  expect(onSave).toHaveBeenCalledTimes(2);
  rerender(<Transaction {...props} compact isEditing saving />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getAllByRole("spinbutton")[0]).toBeDisabled();
});
test("compact viewer keeps selection and allocations without mutation actions", () => {
  const onSelectChange = jest.fn();
  render(<Transaction {...props} canEdit={false} compact expanded onSelectChange={onSelectChange} />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: /Submit transaction/ })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("checkbox", { name: "Select transaction 47" }));
  expect(onSelectChange).toHaveBeenCalledWith(47, true);
  expect(screen.getByText("Allocation panel")).toBeInTheDocument();
});
test("an active compact edit blocks other lifecycle and mutation actions", () => {
  render(<Transaction {...props} compact editingLocked canDelete canSubmitLifecycle />);
  expect(screen.getByRole("button", { name: "Edit" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Delete" })).toBeDisabled();
  expect(screen.getByRole("button", { name: /Submit transaction/ })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Show allocations" })).toBeDisabled();
});
