import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { BrowserRouter } from "react-router-dom";
import ProjectCloseout, { CloseoutPanel } from "./ProjectCloseout";
import { DecisionSnapshot, FinancialRow } from "./CloseoutViews";
const reply = (body,status=200) => ({ ok: status<400, status, text: async () => JSON.stringify(body) });
const base = () => ({ projectId:1, revision:0, closeoutStatus:"NOT_RECORDED", acceptance:{status:"NOT_RECORDED",documentIds:[]}, archive:{status:"NOT_RECORDED"}, evidence:[], readiness:{status:"ATTENTION_REQUIRED",warnings:[{code:"RISK_OPEN",count:2,message:"Two risks remain open."}],coverage:{checklist:"COMPLETE",risks:"COMPLETE",followUps:"COMPLETE",financial:{status:"PARTIAL",recordsAssessed:1,recordsConsidered:2}}}, permissions:{canEditAcceptance:true,canClose:false,canReopen:false,canMarkArchived:false,canRevokeArchive:false},issues:[] });
const page = content => ({page:0,size:20,totalPages:content.length?1:0,totalElements:content.length,content});
function setup(data, mutate = () => reply({...data,revision:data.revision+1})) {
  global.fetch=jest.fn(async (url,options) => options?.method ? mutate(url,options) : String(url).includes('/history?') ? reply(page([])) : String(url).includes('/financial-attention?') ? reply(page([])) : String(url).includes('/documents/project/') ? reply([{id:81,projectId:1,isDeleted:false,documentName:"Final report",versionNumber:1}]) : reply(data));
}
const mount=()=>render(<BrowserRouter><CloseoutPanel projectId={1}/></BrowserRouter>);
const reason = () => fireEvent.change(screen.getByLabelText("Decision reason"),{target:{value:"Reviewed the project"}});
const calls = () => fetch.mock.calls.filter(([,options])=>options?.method);

test("initial uncertainty and partial coverage are explicit, not completion claims",async()=>{
  setup(base());mount();expect(await screen.findByText("No closeout decision recorded")).toBeInTheDocument();
  expect(screen.getByText(/Financial coverage is partial/)).toBeInTheDocument();expect(screen.getByText("Not assessed by this feature")).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Record administrative closeout"})).not.toBeInTheDocument();expect(screen.queryByRole("progressbar")).not.toBeInTheDocument();
});
test.each(["ACCEPTED","NOT_APPLICABLE"])("acceptance %s sends only its valid fields and explicit evidence",async status=>{
  setup(base());mount();fireEvent.click(await screen.findByRole("button",{name:"Record / update final-report acceptance"}));
  fireEvent.change(screen.getByLabelText("Final-report decision"),{target:{value:status}});
  if(status==="ACCEPTED")fireEvent.change(screen.getByLabelText("Accepted by (donor / accepting party)"),{target:{value:"Donor representatives"}});
  else fireEvent.change(screen.getByLabelText("Why final-report acceptance is not applicable"),{target:{value:"No applicable final-report requirement"}});
  fireEvent.click(screen.getByRole("checkbox",{name:/I confirm these exact versions/}));reason();fireEvent.click(screen.getByRole("button",{name:"Save decision"}));
  await waitFor(()=>expect(calls()).toHaveLength(1));const body=JSON.parse(calls()[0][1].body);
  expect(calls()[0][1].method).toBe("PUT");expect(body).toMatchObject({expectedRevision:0,status,documentIds:[]});
  expect(body).not.toHaveProperty(status==="ACCEPTED"?"notApplicableReason":"acceptedDate");
  await waitFor(()=>expect(screen.queryByRole("form",{name:"Closeout decision"})).not.toBeInTheDocument());
});
test("close exposes required warning acknowledgment and date chronology",async()=>{
  const data=base();data.permissions.canClose=true;data.acceptance={status:"ACCEPTED",acceptedDate:"2026-09-20"};setup(data);mount();
  fireEvent.click(await screen.findByRole("button",{name:"Record administrative closeout"}));
  expect(screen.getByLabelText("Administrative closeout date")).toHaveAttribute("min","2026-09-20");
  expect(screen.getByRole("checkbox",{name:/I considered and acknowledge/})).toBeRequired();
  fireEvent.click(screen.getByRole("checkbox",{name:/I considered and acknowledge/}));fireEvent.change(screen.getByLabelText("Why closure can proceed with outstanding items"),{target:{value:"Remaining risks have assigned reviews"}});reason();fireEvent.click(screen.getByRole("button",{name:"Save decision"}));
  await waitFor(()=>expect(calls()).toHaveLength(1));expect(JSON.parse(calls()[0][1].body)).toMatchObject({acknowledgeOutstanding:true,outstandingReason:"Remaining risks have assigned reviews"});
  await waitFor(()=>expect(screen.queryByRole("form",{name:"Closeout decision"})).not.toBeInTheDocument());
});
test("review flags require explicit reopen and archive reaffirmation",async()=>{
  const data=base();data.closeoutStatus="CLOSED";data.closeoutReviewRequired=true;data.archive={status:"MARKED_ARCHIVED",reviewRequired:true};data.permissions={canReopen:true,canRevokeArchive:true};setup(data);mount();
  expect(await screen.findByText(/Closeout review required: acceptance changed/)).toBeInTheDocument();expect(screen.getByText(/Archive review required\./)).toBeInTheDocument();
  expect(screen.queryByRole("button",{name:"Record / reaffirm archive filing"})).not.toBeInTheDocument();
  fireEvent.click(screen.getByRole("button",{name:"Reopen closeout"}));reason();fireEvent.click(screen.getByRole("button",{name:"Save decision"}));
  await waitFor(()=>expect(calls()).toHaveLength(1));expect(JSON.parse(calls()[0][1].body)).toEqual({expectedRevision:0,reason:"Reviewed the project"});
  await waitFor(()=>expect(screen.queryByRole("form",{name:"Closeout decision"})).not.toBeInTheDocument());
});
test("stale response preserves draft and never silently advances its revision",async()=>{
  const data=base();setup(data,()=>{data.revision=2;return reply({message:"Closeout changed",fieldErrors:{expectedRevision:"Current revision is 2"}},409);});mount();
  fireEvent.click(await screen.findByRole("button",{name:"Record / update final-report acceptance"}));fireEvent.change(screen.getByLabelText("Accepted by (donor / accepting party)"),{target:{value:"Donor"}});fireEvent.click(screen.getByRole("checkbox",{name:/I confirm these exact versions/}));reason();fireEvent.click(screen.getByRole("button",{name:"Save decision"}));
  await screen.findByText(/Closeout changed.*Current revision is 2/);expect(screen.getByLabelText("Accepted by (donor / accepting party)")).toHaveValue("Donor");expect(screen.getByRole("button",{name:"Save decision"})).toBeDisabled();
  expect(calls()).toHaveLength(1);await waitFor(()=>expect(screen.getByRole("button",{name:/I reviewed state and history/})).toBeEnabled());fireEvent.click(screen.getByRole("button",{name:/I reviewed state and history/}));expect(calls()).toHaveLength(1);expect(screen.getByText(/Draft revision 2/)).toBeInTheDocument();
});
test("uncertain response refreshes state and history without replay",async()=>{
  const data=base();data.permissions.canReopen=true;setup(data,()=>{throw new Error("Connection lost");});mount();fireEvent.click(await screen.findByRole("button",{name:"Reopen closeout"}));reason();fireEvent.click(screen.getByRole("button",{name:"Save decision"}));
  await screen.findByText(/Connection lost/);await waitFor(()=>expect(fetch.mock.calls.filter(([url])=>String(url).includes('/history?')).length).toBeGreaterThan(1));expect(calls()).toHaveLength(1);expect(screen.getByRole("button",{name:"Save decision"})).toBeDisabled();
});
test("archive references are escaped plain text and history retains original basis",()=>{
  render(<DecisionSnapshot value={{closeoutStatus:"CLOSED",closure:{acceptedDate:"2026-09-20",acceptanceAtClose:{status:"ACCEPTED",acceptedByLabel:"Original donor"},evidenceLabelsAtClose:[{documentId:81,capturedName:"Original evidence"}]},archive:{status:"MARKED_ARCHIVED",digitalArchiveReference:"https://example.com/archive",physicalArchiveReference:"<script>bad()</script>"}}}/>);
  expect(screen.getByText("https://example.com/archive").closest("a")).toBeNull();expect(screen.getByText("<script>bad()</script>")).toBeInTheDocument();expect(screen.getByText("Original evidence (#81)")).toBeInTheDocument();
});
test("restricted diagnostics expose no identity and exact authorized values are not combined",()=>{
  const {rerender}=render(<FinancialRow row={{recordType:"PAYMENT",recordId:999,coverage:"RESTRICTED_OR_UNAVAILABLE",summary:{paidTotal:"SECRET"}}}/>);
  expect(screen.queryByText(/999|SECRET/)).not.toBeInTheDocument();
  rerender(<FinancialRow row={{recordType:"PAYMENT",recordId:12,coverage:"COMPLETE",status:"OVER_PAID",summary:{paidTotal:"9999999999999999999.999999",recipientRemaining:null,orderRemaining:"12.000001",currentOrderConfiguration:{currency:{id:3,name:"USD"}}}}}/>);
  expect(screen.getByText("9999999999999999999.999999")).toBeInTheDocument();expect(screen.getByText(/Order remaining is not authorization/)).toBeInTheDocument();
});
test("read-only project exposes decisions without mutation controls",async()=>{
  const data=base();data.permissions={};setup(data);mount();await screen.findByText("No closeout decision recorded");expect(screen.queryByRole("button",{name:"Record / update final-report acceptance"})).not.toBeInTheDocument();
});
test("re-entering disclosure refreshes observations",async()=>{
  setup(base());render(<BrowserRouter><ProjectCloseout projectId={1}/></BrowserRouter>);const details=screen.getByText("Closeout & archive").closest("details");details.open=true;fireEvent(details,new Event("toggle"));await screen.findByText("No closeout decision recorded");const before=fetch.mock.calls.length;details.open=false;fireEvent(details,new Event("toggle"));details.open=true;fireEvent(details,new Event("toggle"));await waitFor(()=>expect(fetch.mock.calls.length).toBeGreaterThan(before));
});
