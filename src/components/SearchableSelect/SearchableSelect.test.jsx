import React, { useState } from "react";
import { fireEvent, render, screen, within } from "@testing-library/react";
import SearchableSelect from "./SearchableSelect";

const names = ["Dejan Marlovic", "Demo Mira Manager", "Anna", "Ben", "Cora", "Dario", "Ellen", "Felix"];
const choices = names.map((name, index) => <option key={index} value={String(index + 1)}>{name}</option>);
function Form({ multiple = false, onChange = jest.fn(), disabled = false }) {
  const [value, setValue] = useState(multiple ? ["2"] : "");
  return <form><label>Employee<SearchableSelect name="employeeId" required multiple={multiple} value={value} disabled={disabled} onChange={event => {
    const next = multiple ? Array.from(event.target.selectedOptions, option => option.value) : event.target.value;
    onChange({ name: event.target.name, value: next }); setValue(next);
  }}><option value="">All employees</option>{choices}</SearchableSelect></label></form>;
}
test("long lists search case-insensitively and send a real select change only on selection", () => {
  const onChange = jest.fn(); render(<Form onChange={onChange} />);
  const select = screen.getByLabelText("Employee");
  expect(select.checkValidity()).toBe(false);
  fireEvent.mouseDown(select, { button: 0 });
  const search = screen.getByRole("combobox", { name: "Search Employee" });
  fireEvent.change(search, { target: { value: "dEj" } });
  expect(onChange).not.toHaveBeenCalled();
  expect(within(screen.getByRole("dialog")).getAllByRole("option")).toHaveLength(1);
  fireEvent.keyDown(search, { key: "Enter" });
  expect(onChange).toHaveBeenCalledWith({ name: "employeeId", value: "1" });
  expect(select).toHaveValue("1"); expect(select.checkValidity()).toBe(true);
  expect(select).toHaveFocus(); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
test("unmatched search, escape and outside click preserve the selected value", () => {
  const onChange = jest.fn(); render(<Form onChange={onChange} />);
  const select = screen.getByLabelText("Employee");
  fireEvent.keyDown(select, { key: "z" });
  expect(screen.getByRole("status")).toHaveTextContent("No matching options");
  fireEvent.keyDown(screen.getByRole("combobox", { name: "Search Employee" }), { key: "Enter" });
  fireEvent.keyDown(screen.getByRole("dialog"), { key: "Escape" });
  expect(onChange).not.toHaveBeenCalled(); expect(select).toHaveValue("");
  fireEvent.click(select);
  fireEvent.mouseDown(screen.getByRole("dialog").parentElement);
  expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
});
test("multiple selection preserves items hidden by search and permits deselection", () => {
  const onChange = jest.fn(); render(<Form multiple onChange={onChange} />);
  fireEvent.click(screen.getByLabelText("Employee"));
  const search = screen.getByRole("combobox", { name: "Search Employee" });
  fireEvent.change(search, { target: { value: "Dejan" } });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(onChange).toHaveBeenLastCalledWith({ name: "employeeId", value: ["1", "2"] });
  fireEvent.keyDown(search, { key: "Enter" });
  expect(onChange).toHaveBeenLastCalledWith({ name: "employeeId", value: ["2"] });
});
test("short lists stay native, and asynchronously expanded lists become searchable", () => {
  const { rerender } = render(<label>Status<SearchableSelect><option>Open</option><option>Closed</option></SearchableSelect></label>);
  fireEvent.click(screen.getByLabelText("Status")); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  rerender(<label>Status<SearchableSelect>{choices}</SearchableSelect></label>);
  fireEvent.click(screen.getByLabelText("Status")); expect(screen.getByRole("dialog")).toBeInTheDocument();
});
test("disabled selects and disabled options cannot be selected via search", () => {
  const { rerender } = render(<Form disabled />);
  fireEvent.click(screen.getByLabelText("Employee")); expect(screen.queryByRole("dialog")).not.toBeInTheDocument();
  const change = jest.fn();
  rerender(<label>Employee<SearchableSelect value="" onChange={change}><option value="">Choose</option><optgroup label="Unavailable" disabled>{choices}</optgroup></SearchableSelect></label>);
  fireEvent.click(screen.getByLabelText("Employee"));
  fireEvent.click(within(screen.getByRole("dialog")).getByRole("option", { name: "Unavailable — Dejan Marlovic" }));
  expect(change).not.toHaveBeenCalled();
});
