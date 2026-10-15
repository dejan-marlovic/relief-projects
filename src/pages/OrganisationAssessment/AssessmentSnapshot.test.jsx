import { render, screen } from "@testing-library/react";
import AssessmentSnapshot from "./AssessmentSnapshot";

test("captured assessment is grouped with readable labels and retained references", () => {
  render(<AssessmentSnapshot value={{ fields: { capacitySummary: "Local technicians", notes: "Training only" }, context: { projectName: "Riverbend", projectId: 7 }, evidence: [{ capturedName: "Concept.pdf", versionNumber: 2, documentId: 42 }] }} />);
  expect(screen.getByText("Assessment text")).toBeInTheDocument();
  expect(screen.getByText("Capacity")).toBeInTheDocument();
  expect(screen.getByText("Local technicians")).toBeInTheDocument();
  expect(screen.getByText("Project and organisation")).toBeInTheDocument();
  expect(screen.getByText("Evidence considered")).toBeInTheDocument();
  expect(screen.getByText("Concept.pdf")).toBeInTheDocument();
  expect(screen.getByText("42").closest("details")).not.toHaveAttribute("open");
});

test("unrecognised historical fields and empty values remain accessible", () => {
  render(<AssessmentSnapshot value={{ additionalContext: "Retained information", note: null, evidence: [] }} />);
  expect(screen.getByText("Retained information")).toBeInTheDocument();
  expect(screen.getByText("Not set")).toBeInTheDocument();
  expect(screen.getByText("None")).toBeInTheDocument();
});
