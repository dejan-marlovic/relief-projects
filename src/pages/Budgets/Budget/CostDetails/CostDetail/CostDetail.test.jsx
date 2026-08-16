import { fireEvent, render, screen } from "@testing-library/react";
import CostDetail from "./CostDetail";

const cost = {
  costDetailId: 7,
  costDescription: "Emergency shelter",
  costTypeId: 1,
  costId: 2,
  noOfUnits: 10,
  unitPrice: 100,
  percentageCharging: 50,
  amountLocalCurrency: 500,
  amountReportingCurrency: 500,
  amountGBP: 40,
  amountEuro: 45,
};

const renderEditableRow = (overrides = {}) => {
  const props = {
    cost,
    costTypes: [{ id: 1, costTypeName: "Direct" }],
    costs: [{ id: 2, costName: "Shelter" }],
    isEditing: true,
    editedValues: { ...cost },
    onEdit: jest.fn(),
    onChange: jest.fn(),
    onSave: jest.fn(),
    onCancel: jest.fn(),
    onDelete: jest.fn(),
    canEdit: true,
    canDelete: true,
    ...overrides,
  };

  render(<CostDetail {...props} />);
  return props;
};

describe("CostDetail explicit editing", () => {
  test("changing and leaving fields does not save or exit edit mode", () => {
    const props = renderEditableRow();
    const description = screen.getByPlaceholderText("Description");
    const units = screen.getByPlaceholderText("Units");

    fireEvent.change(description, { target: { value: "Updated shelter" } });
    fireEvent.blur(description);
    fireEvent.change(units, { target: { value: "12" } });
    fireEvent.blur(units);

    expect(props.onChange).toHaveBeenCalledWith(
      "costDescription",
      "Updated shelter"
    );
    expect(props.onChange).toHaveBeenCalledWith("noOfUnits", 12);
    expect(props.onSave).not.toHaveBeenCalled();
    expect(screen.getByTitle("Save")).toBeInTheDocument();
  });

  test("saves only when the Save button is clicked", () => {
    const props = renderEditableRow();

    fireEvent.click(screen.getByTitle("Save"));

    expect(props.onSave).toHaveBeenCalledTimes(1);
  });
});
