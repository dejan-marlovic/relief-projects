import { render, screen } from "@testing-library/react";
import RecordReference from "./RecordReference";
import { ProjectContext } from "../../context/ProjectContext";
import { HistorySnapshot } from "../../pages/Results/ResultViews";
import AssessmentSnapshot from "../../pages/OrganisationAssessment/AssessmentSnapshot";

test("uses recorded names ahead of current project names", () => {
  render(<ProjectContext.Provider value={{ projects: [{ id: 7, projectName: "Renamed project" }] }}><RecordReference field="projectId" value={7} record={{ projectName: "Original project" }} /></ProjectContext.Provider>);
  expect(screen.getByText("Original project · Reference 7")).toBeInTheDocument();
  expect(screen.queryByText(/Renamed/)).not.toBeInTheDocument();
});
test("labels current project names and never borrows a different project's name", () => {
  render(<ProjectContext.Provider value={{ projects: [{ id: 7, projectName: "Riverbend" }] }}><p><RecordReference field="projectId" value={7} /></p><p><RecordReference field="projectId" value={9} currentProject={{ id: 8, projectName: "Wrong project" }} /></p></ProjectContext.Provider>);
  expect(screen.getByText("Riverbend (current name) · Reference 7")).toBeInTheDocument();
  expect(screen.getByText("Reference 9 · Name not recorded")).toBeInTheDocument();
});
test.each([HistorySnapshot, AssessmentSnapshot])("snapshot renderer pairs nested captured names with exact references", Component => {
  render(<Component value={{ evidence: [{ documentId: 42, capturedName: "Original.pdf", versionNumber: 2 }], followUpId: 13, capturedTitle: "Confirm backup support" }} />);
  expect(screen.getByText("Original.pdf · Reference 42")).toBeInTheDocument();
  expect(screen.getByText("Confirm backup support · Reference 13")).toBeInTheDocument();
});
