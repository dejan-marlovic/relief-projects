import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import { RevisionPanel } from "./BudgetRevisions";
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true, hasRole: () => true }) }));
const reply = (body, status = 200) => ({ ok: status < 400, status, text: async () => JSON.stringify(body) });
const budget = { id: 1, projectId: 2, localCurrencyId: 3, lifecycleStatus: "APPROVED", contentRevision: 8 };
const familyData = () => ({ budget, family: { id: 7, revision: 4, financialBudgetId: 1, currentPlanBudgetId: null, latestRevisionBudgetId: 1 }, members: [{ ...budget, revisionNumber: 1 }], donorDecisions: [{ id: 44, budgetId: 1, kind: "APPROVED", voided: false, details: { donor: { id: 5, capturedName: "Donor" }, decisionDate: "2026-09-20" }, currentEvidence: [{ documentId: 81, capturedName: "Original report", downloadEligible: false }] }] });
const calls = () => fetch.mock.calls.filter(([, options]) => options?.method);
function setup(data, mutation) {
  global.fetch = jest.fn(async (url, options) => {
    if (options?.method) return mutation ? mutation(url, options) : reply(data);
    if (url.includes("/decisions?")) return reply({ content: [], totalPages: 0 });
    if (url.includes("/documents/project/")) return reply([{ id: 81, projectId: 2, isDeleted: false, documentName: "Report", versionNumber: 1 }]);
    if (url.includes("/organizations/")) return reply([{ id: 5, organizationName: "Donor" }]);
    return reply(data);
  });
}
const mount = onChanged => render(<BrowserRouter><RevisionPanel budget={budget} onChanged={onChanged} /></BrowserRouter>);
test("legacy planning warning distinguishes execution from retained original references", async () => {
  setup({ ...familyData(), issues: [{ code: "PLANNING_FINANCIAL_BASIS_DIFFER", message: "Financial records remain on budget 1." }] }); mount();
  expect(await screen.findByText(/Financial execution below determines new funding eligibility/)).toBeInTheDocument();
  expect(screen.queryByText("Financial records remain on budget 1.")).not.toBeInTheDocument();
});
test("copy uses source version, explicit name and optional new-only currency adoption", async () => {
  const data = { budget, family: null, members: [] };
  const changed = jest.fn(); setup(data, () => reply(familyData())); mount(changed);
  fireEvent.click(await screen.findByRole("button", { name: "Create planning revision" }));
  fireEvent.change(screen.getByLabelText("New budget name"), { target: { value: "Revision two" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Updated plan" } });
  fireEvent.click(screen.getByRole("checkbox"));
  fireEvent.click(screen.getByRole("button", { name: "Save revision" }));
  await waitFor(() => expect(changed).toHaveBeenCalled());
  expect(JSON.parse(calls()[0][1].body)).toEqual({ expectedSourceRevision: 8, budgetName: "Revision two", reason: "Updated plan", confirmedLocalCurrencyId: 3 });
});
test("donor approval records one donor and selected exact version without promoting plan", async () => {
  setup(familyData()); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Record donor decision / addendum" }));
  await screen.findByRole("option", { name: "Donor" });
  fireEvent.change(screen.getByLabelText("Governing donor"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Explanation"), { target: { value: "Approved quantities" } });
  fireEvent.click(screen.getByRole("checkbox", { name: /Report · Document #81/ }));
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await waitFor(() => expect(calls()).toHaveLength(1));
  expect(calls()[0][0]).toContain("/budgets/1/donor-decisions");
  expect(JSON.parse(calls()[0][1].body)).toMatchObject({ expectedFamilyRevision: 4, kind: "APPROVED", donorOrganizationId: 5, documentIds: [81] });
  expect(calls().some(([url]) => url.includes("current-plan"))).toBe(false);
});
test("explicit selection uses the governing decision and does not change financial basis", async () => {
  setup(familyData()); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Select as current plan" }));
  fireEvent.change(screen.getByLabelText("Governing approval"), { target: { value: "44" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Selected plan" } });
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await waitFor(() => expect(calls()).toHaveLength(1));
  expect(JSON.parse(calls()[0][1].body)).toEqual({ expectedFamilyRevision: 4, budgetId: 1, donorDecisionId: 44, reason: "Selected plan" });
  expect(calls()[0][1].method).toBe("PUT");
});
test("stale failure retains draft and blocks automatic replay until explicit review", async () => {
  const data = familyData(); setup(data, () => { data.family.revision = 5; return reply({ message: "Stale family" }, 409); }); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Void decision #44" }));
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong approval" } });
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await screen.findByText(/Your draft is retained/);
  expect(screen.getByLabelText("Reason")).toHaveValue("Wrong approval");
  expect(screen.getByRole("button", { name: "Save decision" })).toBeDisabled();
  expect(calls()).toHaveLength(1);
  const review = await screen.findByRole("button", { name: /I reviewed state/ });
  await waitFor(() => expect(review).toBeEnabled());
  fireEvent.click(review); fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await waitFor(() => expect(calls()).toHaveLength(2));
  expect(JSON.parse(calls()[1][1].body).expectedFamilyRevision).toBe(5);
});
test("correction has explicit replacement and no inherited evidence", async () => {
  setup(familyData()); mount();
  fireEvent.click(await screen.findByRole("button", { name: "Correct decision #44" }));
  await screen.findByRole("option", { name: "Donor" });
  fireEvent.change(screen.getByLabelText("Governing donor"), { target: { value: "5" } });
  fireEvent.change(screen.getByLabelText("Explanation"), { target: { value: "Corrected" } });
  fireEvent.change(screen.getByLabelText("Reason"), { target: { value: "Wrong reference" } });
  fireEvent.click(screen.getByRole("button", { name: "Save decision" }));
  await waitFor(() => expect(calls()).toHaveLength(1));
  expect(JSON.parse(calls()[0][1].body)).toMatchObject({ expectedFamilyRevision: 4, reason: "Wrong reference", replacement: { documentIds: [] } });
});
test("unavailable evidence is retained and cannot be downloaded", async () => {
  setup(familyData()); mount();
  expect(await screen.findByRole("button", { name: "Unavailable" })).toBeDisabled();
  expect(screen.getByText(/Original report · Document #81/)).toBeInTheDocument();
  expect(screen.getByText(/Not selected — family planning total unavailable/)).toBeInTheDocument();
});
