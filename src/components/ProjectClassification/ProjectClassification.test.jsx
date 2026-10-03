import React from "react";
import { render, screen, fireEvent, waitFor } from "@testing-library/react";
import ProjectClassification from "./ProjectClassification";
import { classificationChanges, classificationErrors, supportsClassification } from "../../utils/projectClassification";
import { projectMetadataPayload } from "../../utils/projectApproval";

const project = { id: 1, projectName: "Canonical", projectCode: "P1", projectTypeId: 2, projectStatusId: 1, projectNameSv: "Titel", projectNameEn: null, targetGroupDescription: "Households" };
const response = data => ({ ok: true, json: async () => data });

test("capability requires every response key, including explicit nulls", () => {
  expect(supportsClassification({ projectNameSv: null, projectNameEn: null, targetGroupDescription: null })).toBe(true);
  expect(supportsClassification({ projectNameSv: null })).toBe(false);
});
test("unrelated metadata writes omit classification and approval; changes preserve clear semantics", () => {
  expect(projectMetadataPayload({ ...project, approved: "Yes", assessmentSummary: {} })).toEqual({ id: 1, projectName: "Canonical", projectCode: "P1", projectTypeId: 2, projectStatusId: 1 });
  expect(classificationChanges({ ...project, projectNameSv: "   " }, project)).toEqual({ projectNameSv: null });
  expect(classificationErrors({ projectNameEn: "x".repeat(256) })).toEqual({ projectNameEn: "Use at most 255 characters." });
});
test("save uses fresh required fields and sends only the edited optional property", async () => {
  const fetch = jest.fn().mockResolvedValueOnce(response(project)).mockResolvedValueOnce(response({ ...project, projectCode: "LATEST" })).mockResolvedValueOnce(response(project)).mockResolvedValueOnce(response({ ...project, projectNameSv: null }));
  const onSaved = jest.fn();
  render(<ProjectClassification projectId={1} authFetch={fetch} canEdit onSaved={onSaved} />);
  fireEvent.change(await screen.findByLabelText(/Swedish title/), { target: { value: "" } });
  fireEvent.click(screen.getByText("Save optional details"));
  await waitFor(() => expect(onSaved).toHaveBeenCalled());
  const body = JSON.parse(fetch.mock.calls.find(([, options]) => options?.method === "PUT")[1].body);
  expect(body.projectCode).toBe("LATEST");
  expect(body.projectNameSv).toBeNull();
  expect(body).not.toHaveProperty("projectNameEn");
  expect(body).not.toHaveProperty("targetGroupDescription");
});
test("failed save retains draft, blocks retry, and refresh does not make untouched fields dirty", async () => {
  const fetch = jest.fn().mockResolvedValueOnce(response(project)).mockResolvedValueOnce(response(project)).mockRejectedValueOnce(new Error("Network failed"));
  render(<ProjectClassification projectId={1} authFetch={fetch} canEdit />);
  fireEvent.change(await screen.findByLabelText(/Swedish title/), { target: { value: "Ny titel" } });
  fireEvent.click(screen.getByText("Save optional details"));
  await screen.findByText(/Network failed/);
  expect(screen.getByText("Save optional details")).toBeDisabled();
  expect(screen.getByLabelText(/Swedish title/)).toHaveValue("Ny titel");
  fetch.mockResolvedValueOnce(response({ ...project, projectNameEn: "Someone else's edit" }));
  fireEvent.click(screen.getByText("Refresh saved values for review"));
  await waitFor(() => expect(screen.getByLabelText(/English title/)).toHaveValue("Someone else's edit"));
  expect(screen.getByLabelText(/Swedish title/)).toHaveValue("Ny titel");
});
test("old backend exposes no editable new fields", async () => {
  render(<ProjectClassification projectId={1} authFetch={async () => response({ id: 1 })} canEdit />);
  await screen.findByText(/unavailable on this backend/);
  expect(screen.queryByText("Save optional details")).not.toBeInTheDocument();
});
test("read-only readers see plain values and no save control", async () => {
  render(<ProjectClassification projectId={1} authFetch={async () => response(project)} canEdit={false} />);
  await screen.findByText("Households");
  expect(screen.getByText("Not recorded")).toBeInTheDocument();
  expect(screen.queryByText("Save optional details")).not.toBeInTheDocument();
});
