import React from "react";
import { fireEvent, render, screen } from "@testing-library/react";
import CountryPicker from "./CountryPicker";
import { geographyChanges, geographyExport, supportsGeography } from "../../utils/projectGeography";
import { projectMetadataPayload } from "../../utils/projectApproval";

const countries = [{ code: "JO", label: "Jordan", selectable: true }, { code: "LB", label: "Lebanon", selectable: true }, { code: "AA", label: "Retired entry", selectable: false }];
const catalogue = { data: { countries, maxSelections: 2 }, loading: false, error: "", retry: jest.fn() };
test("country set comparison is order independent, with explicit clearing and payload exclusions", () => {
  expect(geographyChanges({ operatingCountryCodes: ["LB", "JO"] }, { operatingCountryCodes: ["JO", "LB"] })).toEqual({});
  expect(geographyChanges({ operatingCountryCodes: [] }, { operatingCountryCodes: ["LB"] })).toEqual({ operatingCountryCodes: [] });
  expect(projectMetadataPayload({ id: 1, operatingCountryCodes: ["LB"], operatingCountries: countries })).toEqual({ id: 1 });
  expect(supportsGeography({ operatingCountryCodes: [], operatingCountries: [] })).toBe(true);
  expect(supportsGeography({})).toBe(false);
});
test("search selects by code and retained retired selections can be removed", () => {
  const change = jest.fn();
  render(<CountryPicker codes={["AA"]} catalogue={catalogue} onChange={change} />);
  expect(screen.getByText(/Retired entry.*retired/)).toBeInTheDocument();
  fireEvent.change(screen.getByLabelText("Search countries or codes"), { target: { value: "leban" } });
  expect(screen.queryByLabelText("Jordan (JO)")).not.toBeInTheDocument();
  fireEvent.click(screen.getByLabelText("Lebanon (LB)"));
  expect(change).toHaveBeenCalledWith(["AA", "LB"]);
  fireEvent.click(screen.getByText("Remove AA"));
  expect(change).toHaveBeenCalledWith([]);
});
test("lookup errors retain visible saved values and disable country changes", () => {
  render(<CountryPicker codes={["LB"]} savedCountries={countries} catalogue={{ ...catalogue, data: null, error: "Lookup failed" }} onChange={jest.fn()} />);
  expect(screen.getByText("Lebanon (LB)")).toBeInTheDocument();
  expect(screen.getByText("Remove LB")).toBeDisabled();
  fireEvent.click(screen.getByText("Retry country lookup"));
  expect(catalogue.retry).toHaveBeenCalled();
});
test("selection limit blocks additions but permits removal", () => {
  render(<CountryPicker codes={["AA", "LB"]} catalogue={catalogue} onChange={jest.fn()} />);
  expect(screen.getByLabelText("Jordan (JO)")).toBeDisabled();
  expect(screen.getByText("Remove LB")).not.toBeDisabled();
});
test("export uses saved labels and codes, preserving missing-label diagnostics", () => {
  expect(geographyExport({ operatingCountryCodes: [], operatingCountries: [] })).toBe("Not recorded");
  expect(geographyExport({ operatingCountryCodes: ["LB", "ZZ"], operatingCountries: countries })).toBe("Lebanon (LB); Label unavailable (ZZ) — review required");
});
