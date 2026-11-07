import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import EmployeeFilter from "./EmployeeFilter";

const employees = [{ id: 1, displayName: "Dejan Marlovic" }, { id: 52, displayName: "Demo Mira Manager" }];
test("searches names without changing the filter until a result is selected", () => {
  const onChange = jest.fn();
  render(<EmployeeFilter employees={employees} value="" onChange={onChange} />);
  const input = screen.getByRole("combobox", { name: "Assigned employee" });
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "dEj" } });
  expect(screen.getAllByRole("option")).toHaveLength(1);
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.keyDown(input, { key: "Enter" });
  expect(onChange).toHaveBeenCalledWith("1");
});
test("unmatched searches and Escape preserve selection; All employees resets it", () => {
  const onChange = jest.fn();
  render(<EmployeeFilter employees={employees} value="52" onChange={onChange} />);
  const input = screen.getByRole("combobox");
  fireEvent.focus(input);
  fireEvent.change(input, { target: { value: "unknown" } });
  expect(screen.getByText("No employees found")).toBeInTheDocument();
  fireEvent.keyDown(input, { key: "Enter" });
  fireEvent.keyDown(input, { key: "Escape" });
  expect(input).toHaveValue("Demo Mira Manager");
  expect(onChange).not.toHaveBeenCalled();
  fireEvent.click(input);
  fireEvent.click(screen.getByRole("option", { name: "All employees" }));
  expect(onChange).toHaveBeenCalledWith("");
});
