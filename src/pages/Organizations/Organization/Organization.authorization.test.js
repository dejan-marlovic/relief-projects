import { fireEvent, render, screen } from "@testing-library/react";
import Organization from "./Organization";

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


test("compact editing uses explicit save and retains draft across viewport changes", () => {
  const onSave = jest.fn();
  const props = { ...baseProps, canManage: true, isEditing: true, onSave,
    editedValues: { organizationId: 5, organizationStatusId: 2 } };
  const { rerender } = render(<Organization {...props} compact />);
  fireEvent.blur(screen.getByRole("combobox", { name: "Organization" }));
  expect(onSave).not.toHaveBeenCalled();
  fireEvent.click(screen.getByRole("button", { name: "Save" }));
  expect(onSave).toHaveBeenCalledTimes(1);
  rerender(<Organization {...props} compact={false} />);
  expect(screen.getByRole("combobox", { name: "Organization" })).toHaveValue("5");
  fireEvent.blur(screen.getByRole("combobox", { name: "Status" }));
  expect(onSave).toHaveBeenCalledTimes(2);
  rerender(<Organization {...props} compact saving />);
  expect(screen.getByRole("button", { name: "Save" })).toBeDisabled();
  expect(screen.getByRole("button", { name: "Cancel" })).toBeDisabled();
  expect(screen.getByRole("combobox", { name: "Status" })).toBeDisabled();
});

test("compact viewer has address access but no link mutation or bank access", () => {
  render(<Organization {...baseProps} compact />);
  expect(screen.getByRole("button", { name: "Show address details" })).toBeEnabled();
  expect(screen.queryByRole("button", { name: "Show bank details" })).not.toBeInTheDocument();
  expect(screen.queryByRole("button", { name: "Edit" })).not.toBeInTheDocument();
});
