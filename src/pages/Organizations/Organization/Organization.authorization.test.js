import { MemoryRouter } from "react-router-dom";
import { fireEvent, render as rtlRender, screen } from "@testing-library/react";
import Organization from "./Organization";

const render = ui => rtlRender(ui, { wrapper: MemoryRouter });

const link = { id: 11, projectId: 1, organizationId: 5, organizationStatusId: 2 };
const baseProps = {
  link,
  isEditing: false,
  editedValues: {},
  onEdit: jest.fn(),
  onChange: jest.fn(),
  onSave: jest.fn(),
  onCancel: jest.fn(),
  onDelete: jest.fn(),
  organizations: [{ id: 5, name: "Relief Partner" }],
  projects: [{ id: 1, projectName: "Flood Relief" }],
  statuses: [{ id: 2, organizationStatusName: "Partner" }],
  visibleCols: [true, true, true],
};

describe("Organization row permissions", () => {
  test("PROJECT_MANAGER can edit/remove links and open addresses but cannot open bank details", () => {
    render(<Organization {...baseProps} canManage canManageAddresses />);
    expect(screen.getByRole("button", { name: "Edit" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Delete organization relation" })).toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show address details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show bank details" })).not.toBeInTheDocument();
  });

  test("VIEWER can view the link and open addresses without mutation or bank controls", () => {
    render(<Organization {...baseProps} />);
    expect(screen.getByText("Relief Partner")).toBeInTheDocument();
    expect(screen.getByText("Partner")).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete organization relation" })).not.toBeInTheDocument();
    expect(screen.getByRole("button", { name: "Show address details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Show bank details" })).not.toBeInTheDocument();
  });

  test("APPROVER can open bank details but cannot mutate the organization link", () => {
    render(<Organization {...baseProps} canViewBankDetails />);
    expect(screen.getByRole("button", { name: "Show bank details" })).toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
    expect(screen.queryByRole("button", { name: "Delete organization relation" })).not.toBeInTheDocument();
  });

  test("calls the supplied link actions when ADMIN uses them", () => {
    const onEdit = jest.fn();
    const onDelete = jest.fn();
    render(<Organization {...baseProps} onEdit={onEdit} onDelete={onDelete} canManage canViewBankDetails />);
    fireEvent.click(screen.getByRole("button", { name: "Edit" }));
    fireEvent.click(screen.getByRole("button", { name: "Delete organization relation" }));
    expect(onEdit).toHaveBeenCalledTimes(1);
    expect(onDelete).toHaveBeenCalledWith(11);
  });
});


test("existing relationships use the same change handler on mobile and desktop without a Save button", () => {
  const onChange = jest.fn();
  const props = { ...baseProps, canManage: true, isEditing: true, onChange,
    editedValues: { organizationId: 5, organizationStatusId: 2 } };
  const { rerender } = render(<Organization {...props} compact />);
  fireEvent.change(screen.getByRole("combobox", { name: "Organization" }), { target: { value: "5" } });
  expect(onChange).toHaveBeenCalledWith("organizationId", 5);
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  rerender(<Organization {...props} compact={false} />);
  expect(screen.queryByRole("button", { name: "Save" })).not.toBeInTheDocument();
  rerender(<Organization {...props} compact saving />);
  expect(screen.getByRole("button", { name: "Done editing" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled();
});

test("compact viewer has address access but no link mutation or bank access", () => {
  render(<Organization {...baseProps} compact />);
  expect(screen.getByRole("button", { name: "Show address details" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Show bank details" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
});
