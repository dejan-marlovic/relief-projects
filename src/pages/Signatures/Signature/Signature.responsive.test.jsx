import { fireEvent, render, screen } from "@testing-library/react";
import Signature from "./Signature";
const base = () => ({ row: { id: 7, signatureStatusId: 1, employeeId: 2, paymentOrderId: 20, signature: "Demo signature", signatureDate: "2026-09-18T12:00:00" }, compact: true, canManage: true, visibleCols: [true, false, false, false, false, false], statusOptions: [{ id: 1, label: "Booked" }], employeeOptions: [{ id: 2, label: "Example signer" }], poOptions: [{ id: 20 }], onChange: jest.fn(), onSave: jest.fn(), onCancel: jest.fn(), onEdit: jest.fn(), onDelete: jest.fn(), onSelectChange: jest.fn() });
test("compact form exposes all fields and saves explicitly", () => {
  const props = base(); render(<Signature {...props} isEditing fieldErrors={{ signature: "Signature is required" }} />);
  const signature = screen.getByRole("textbox", { name: "Signature" });
  expect(signature).toHaveAccessibleDescription("Signature is required");
  expect(screen.getByText("Signature details").parentElement).toHaveAttribute("open");
  fireEvent.change(signature, { target: { value: "Updated" } }); fireEvent.blur(signature);
  expect(props.onChange).toHaveBeenCalledWith("signature", "Updated"); expect(props.onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save" })); expect(props.onSave).toHaveBeenCalledTimes(1);
  fireEvent.click(screen.getByRole("button", { name: "Cancel" })); expect(props.onCancel).toHaveBeenCalledTimes(1);
});
test("desktop retains existing inline blur-save behavior", () => {
  const props = base(); render(<Signature {...props} compact={false} isEditing visibleCols={[true,true,true,true,true,true]} />);
  fireEvent.blur(screen.getByRole("textbox", { name: "Signature" })); expect(props.onSave).toHaveBeenCalledTimes(1);
});
test("edit and delete permissions stay independent, and selection remains available", () => {
  const props = base(); render(<Signature {...props} canEdit={false} canDelete />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button", { name: "Delete signature" })); expect(props.onDelete).toHaveBeenCalledWith(7);
  fireEvent.click(screen.getByRole("checkbox", { name: "Select signature 7" })); expect(props.onSelectChange).toHaveBeenCalledWith(7,true);
});
test("viewer cards show details but no mutations", () => {
  render(<Signature {...base()} canManage={false} />);
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Delete signature" })).not.toBeInTheDocument();
  expect(screen.getByText("Example signer")).toBeInTheDocument();
  expect(screen.getByText("Signature details").parentElement).not.toHaveAttribute("open");
});
test("resize retains the controlled draft and pending saves disable controls", () => {
  const props = base(), draft = { signature: "Unsaved" };
  const view = render(<Signature {...props} isEditing editedValues={draft} />);
  view.rerender(<Signature {...props} compact={false} isEditing editedValues={draft} saving visibleCols={[true,true,true,true,true,true]} />);
  expect(screen.getByRole("textbox", { name: "Signature" })).toHaveValue("Unsaved");
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
});
