import { act, render, screen } from "@testing-library/react";
import Budgets from "./Budgets";
import { ProjectContext } from "../../context/ProjectContext";

let mockRefresh;
jest.mock("../../hooks/useAutomaticRefresh", () => (callback) => { mockRefresh = callback; });
jest.mock("../../hooks/useFinancialRefresh", () => () => 0);
jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasAnyRole: () => true }) }));
jest.mock("../../context/UnsavedChangesContext", () => ({ useUnsavedChange: () => {}, useUnsavedChanges: () => ({ hasUnsavedChanges: false }) }));
jest.mock("./Budget/Budget", () => ({ budget }) => <article>{budget.budgetName}</article>);
jest.mock("./CreateNewBudget/CreateNewBudget", () => () => null);

test("failed background reads retain the mounted budget and recover on retry", async () => {
 global.fetch = jest.fn().mockResolvedValue({ok:true,json:async()=>[{id:7,budgetName:"Riverbend budget"}]});
 render(<ProjectContext.Provider value={{selectedProjectId:2,projects:[]}}><Budgets/></ProjectContext.Provider>);
 const card = await screen.findByText("Riverbend budget");
 fetch.mockRejectedValueOnce(new Error("Offline"));
 await act(async()=>{ mockRefresh(); });
 expect(await screen.findByRole("alert")).toHaveTextContent("Previously loaded budgets are retained");
 expect(screen.getByText("Riverbend budget")).toBe(card);
 await act(async()=>{ mockRefresh(); });
 expect(screen.queryByRole("alert")).not.toBeInTheDocument();
 expect(screen.getByText("Riverbend budget")).toBe(card);
});
