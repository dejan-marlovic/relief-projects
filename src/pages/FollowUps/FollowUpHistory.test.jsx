import { act, fireEvent, render, screen, waitFor } from "@testing-library/react";
import FollowUpDetails from "./FollowUpDetails";
const task = { id: 3, projectId: 7, revision: 1, title: "Task", assignee: {displayName:"Current name"} };
const event = {id:10, action:"UPDATE", revision:1, occurredAt:"2026-10-17T10:00:00Z", actor:{userId:1,username:"manager",employeeName:"Historical name"}, changedFields:["description","assignee"], before:{description:null,assignee:{employeeId:2,displayName:"Original owner"}}, after:{description:"<b>Plain text</b>",assignee:{employeeId:3,displayName:"New owner"}}};
const listing = {projectId:7,followUpId:3,coverage:"PARTIAL_LEGACY",page:0,totalElements:1,totalPages:1,content:[event]};
const response = data => ({ok:true,json:async()=>data});
test("loads lazily using the task project and renders captured changes as text", async () => {
  const fetch = jest.fn(async()=>response(listing));
  render(<FollowUpDetails task={task} authFetch={fetch} />);
  expect(fetch).not.toHaveBeenCalled();
  fireEvent.click(screen.getByText("Details & activity"));
  await screen.findByText("Details changed");
  expect(fetch.mock.calls[0][0]).toContain("/projects/7/follow-ups/3/history?page=0&size=20");
  expect(screen.getByText(/Earlier changes are not available/)).toBeVisible();
  fireEvent.click(screen.getByText("Details changed"));
  expect(screen.getByText(/Historical name/)).toBeVisible();
  expect(screen.getAllByText("<b>Plain text</b>")[0]).toBeVisible();
  expect(screen.getAllByText("Original owner")[0]).toBeVisible();
});
test("paging resets to latest history after a task revision changes", async () => {
  const fetch = jest.fn(async url=>response({...listing,page:url.includes("page=1")?1:0,totalPages:2,totalElements:21}));
  const view = render(<FollowUpDetails task={task} authFetch={fetch} />);
  fireEvent.click(screen.getByText("Details & activity"));
  fireEvent.click(await screen.findByText("Older history"));
  await waitFor(()=>expect(fetch.mock.calls.at(-1)[0]).toContain("page=1"));
  view.rerender(<FollowUpDetails task={{...task,revision:2}} authFetch={fetch} />);
  await waitFor(()=>expect(fetch.mock.calls.at(-1)[0]).toContain("page=0"));
});
test("failed history is separate from saved task data and retryable", async () => {
  const fetch = jest.fn().mockRejectedValueOnce(new Error("History unavailable")).mockResolvedValue(response({...listing,content:[],totalPages:0,totalElements:0}));
  render(<FollowUpDetails task={task} authFetch={fetch} />);
  fireEvent.click(screen.getByText("Details & activity"));
  await screen.findByRole("alert");
  expect(screen.queryByText(/No detailed changes/)).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Retry history"));
  await screen.findByText("No detailed changes have yet been recorded.");
  expect(screen.getByText(/Earlier changes are not available/)).toBeVisible();
});

test.each([["CREATE","Created"],["PROGRESS","Progress changed"],["COMPLETE","Completed"],["REOPEN","Reopened"],["DELETE","Deleted"],["RESTORE","Restored"]])("labels %s and shows cleared or initial values accurately", async (action,label) => {
  const fetch = jest.fn(async()=>response({...listing,coverage:"FROM_CREATION",content:[{...event,action,before:action === "CREATE" ? null : {completedAt:"2026-10-17T10:00:00Z"},after:{completedAt:null},changedFields:["completedAt"]}]}));
  render(<FollowUpDetails task={task} authFetch={fetch} />);
  fireEvent.click(screen.getByText("Details & activity"));
  fireEvent.click(await screen.findByText(label));
  expect(screen.getByText("History recorded from creation.")).toBeVisible();
  expect(screen.queryByText(/Earlier changes are not available/)).not.toBeInTheDocument();
  expect(screen.getAllByText("Not recorded")[0]).toBeVisible();
});

test("refresh retains expanded history while the newer revision is loading", async () => {
  let finish;
  const fetch = jest.fn().mockResolvedValueOnce(response(listing)).mockImplementationOnce(()=>new Promise(resolve=>{finish=resolve;}));
  const view = render(<FollowUpDetails task={task} authFetch={fetch} />);
  fireEvent.click(screen.getByText("Details & activity"));
  const heading = await screen.findByText("Details changed");
  fireEvent.click(heading);
  view.rerender(<FollowUpDetails task={{...task,revision:2}} authFetch={fetch} />);
  expect(screen.getByText("Details changed")).toBe(heading);
  expect(screen.getAllByText("<b>Plain text</b>")[0]).toBeVisible();
  expect(screen.queryByText("Loading history…")).not.toBeInTheDocument();
  await act(async()=>finish(response(listing)));
});

test("legacy creation appears once at the end, without duplicate current attribution", async () => {
  const fetch = jest.fn(async url=>response({...listing,page:url.includes("page=1")?1:0,totalPages:2,totalElements:21}));
  render(<FollowUpDetails task={{...task,createdAt:"2026-10-01T09:00:00Z",createdBy:{username:"original.creator"},updatedAt:event.occurredAt,completedAt:event.occurredAt}} authFetch={fetch} />);
  fireEvent.click(screen.getByText("Details & activity"));
  await screen.findByText("Details changed");
  expect(screen.queryByText("Created · from existing record")).not.toBeInTheDocument();
  fireEvent.click(screen.getByText("Older history"));
  await screen.findByText("Created · from existing record");
  expect(screen.getAllByRole("list")).toHaveLength(1);
  expect(screen.queryByText("Last changed")).not.toBeInTheDocument();
  expect(screen.queryByText("Current record attribution")).not.toBeInTheDocument();
});
test.each([["IN_PROGRESS","Started work"],["TODO","Returned to To do"]])("uses a clear label for %s progress", async (workflowState,label) => {
  const fetch = jest.fn(async()=>response({...listing,content:[{...event,action:"PROGRESS",after:{workflowState},changedFields:["workflowState"]}]}));
  render(<FollowUpDetails task={task} authFetch={fetch} />);
  fireEvent.click(screen.getByText("Details & activity"));
  expect(await screen.findByText(label)).toBeVisible();
});
