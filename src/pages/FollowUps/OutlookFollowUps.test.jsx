import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import OutlookFollowUps from "./OutlookFollowUps";
const status = () => ({capabilities:{outlookFollowUpVersion:1},revision:2,configured:true,state:"AWAITING_CONFIRMATION",mappingStatus:"MAPPED",account:{displayName:"Demo account",accountType:"PERSONAL"},permissions:{canConfirm:true,canDisconnect:true},itemsRequiringAttention:[]});
const reply = (body, code=200) => ({ok:code<400,status:code,text:async()=>JSON.stringify(body)});
test("confirmation requires explicit acknowledgement and sends only current revision and confirmation",async()=>{
 const data=status();const fetch=jest.fn(async()=>reply(data));render(<OutlookFollowUps authFetch={fetch}/>);
 const button=await screen.findByRole("button",{name:"Confirm account and test publication"});expect(button).toBeDisabled();expect(screen.getByText(/Full synchronization is not ready/)).toBeInTheDocument();fireEvent.click(screen.getByRole("checkbox"));fireEvent.click(button);
 await waitFor(()=>expect(fetch.mock.calls.some(([,o])=>o?.method==="POST")).toBe(true));const [url,options]=fetch.mock.calls.find(([,o])=>o?.method==="POST");expect(url).toMatch(/\/confirm$/);expect(options.credentials).toBe("include");expect(JSON.parse(options.body)).toEqual({expectedRevision:2,confirmAccount:true});await waitFor(()=>expect(button).toBeDisabled());
});
test("unconfigured integration exposes no connection control",async()=>{
 const data={...status(),configured:false,permissions:{canConnect:true}};render(<OutlookFollowUps authFetch={jest.fn(async()=>reply(data))}/>);await screen.findByText(/Outlook publication is not configured/);expect(screen.queryByRole("button",{name:"Connect Microsoft account"})).not.toBeInTheDocument();
});
test("stale command refreshes without replay and resets consent",async()=>{
 const data=status();const fetch=jest.fn(async(url,o)=>o?.method?reply({message:"Refresh connection status"},409):reply(data));render(<OutlookFollowUps authFetch={fetch}/>);fireEvent.click(await screen.findByRole("checkbox"));fireEvent.click(screen.getByRole("button",{name:"Confirm account and test publication"}));await screen.findByText(/command will not be replayed/);await waitFor(()=>expect(screen.getByRole("checkbox")).not.toBeChecked());expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(1);
});
test("forget is distinct from cleanup and does not claim event removal",async()=>{
 const data=status();const fetch=jest.fn(async()=>reply(data));render(<OutlookFollowUps authFetch={fetch}/>);fireEvent.click(await screen.findByRole("button",{name:"Forget access now"}));await waitFor(()=>expect(fetch.mock.calls.some(([,o])=>o?.method)).toBe(true));expect(JSON.parse(fetch.mock.calls.find(([,o])=>o?.method)[1].body)).toEqual({expectedRevision:2,mode:"FORGET_NOW"});await screen.findByText(/Request accepted. Review/);
});
test("unsupported response does not expose mutation controls",async()=>{
 render(<OutlookFollowUps authFetch={jest.fn(async()=>reply({...status(),capabilities:{outlookFollowUpVersion:2}}))}/>);await screen.findByText(/does not provide a supported/);expect(screen.queryByRole("button",{name:"Forget access now"})).not.toBeInTheDocument();
});

test("updated capabilities explain blocked edits and manual removal without claiming remote inventory", async () => {
 const data = {...status(), capabilities: {outlookFollowUpVersion:1, creationSupported:true, automaticUpdates:false, automaticDeletes:false, removalMode:"MANUAL_ONLY", updateBlocker:"MEETING_AND_MOVE_RACES_UNVERIFIED"},
  removal: {reviewCount:2, mayRequireManualRemoval:true, remotePresenceVerified:false},
  cleanup: {credentialsRetained:false, forgetAvailable:false, deadline:"2026-10-11T10:00:00Z"},
  itemsRequiringAttention:[{taskId:4,state:"UPDATE_BLOCKED",code:"PATCH_SAFETY_UNVERIFIED",action:"REVIEW_MANUAL_UPDATE",message:"The title/deadline differs.",observedAt:null},
   {taskId:5,state:"DELETE_BLOCKED",code:"MANUAL_REMOVAL_REQUIRED",action:"REVIEW_FOR_MANUAL_REMOVAL"},
   {taskId:6,state:"UNKNOWN",code:"NEW_BACKEND_CODE",action:"NEW_ACTION",message:"Future guidance"}]};
 render(<OutlookFollowUps authFetch={jest.fn(async()=>reply(data))}/>);
 await screen.findByText(/Discovered mappings to review: 2/);
 expect(screen.getByText(/not a current Outlook inventory/)).toBeInTheDocument();
 expect(screen.getByText(/safety when an appointment is moved/)).toBeInTheDocument();
 expect(screen.getByText("The title/deadline differs.")).toBeInTheDocument();
 expect(screen.getByText(/do not create or import a replacement copy/)).toBeInTheDocument();
 expect(screen.getByText(/Review only the known app-created appointment/)).toBeInTheDocument();
 expect(screen.getByText("Future guidance")).toBeInTheDocument();
 expect(screen.getByText(/Suggested action: new action/)).toBeInTheDocument();
 expect(screen.getByText(/Credentials retained: No/)).toBeInTheDocument();
 expect(screen.getByText(/This is not a scheduled calendar cleanup/)).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Forget access now"})).not.toBeInTheDocument();
});

test("creation capability does not override eligibility and false suppresses enrollment", async () => {
 render(<OutlookFollowUps authFetch={jest.fn(async()=>reply({...status(), capabilities:{outlookFollowUpVersion:1,creationSupported:false},permissions:{canConnect:true,canConfirm:true,canDisconnect:true}}))}/>);
 await screen.findByText(/creation is not supported/);
 expect(screen.queryByRole("checkbox")).not.toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Connect Microsoft account"})).not.toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Confirm account and test publication"})).not.toBeInTheDocument();
 expect(screen.getByRole("button",{name:"Forget access now"})).toBeEnabled();
});

test("incomplete OAuth explains recovery and cannot confirm an absent account", async () => {
 render(<OutlookFollowUps authFetch={jest.fn(async()=>reply({...status(),account:null,authorization:{phase:"WAITING_FOR_CALLBACK",expiresAt:"2026-10-10T10:00:00Z",recovery:"DISCONNECT_FORGET_NOW_THEN_CONNECT"}}))}/>);
 await screen.findByText(/No account is ready to confirm/);
 expect(screen.getByText(/Do not reuse an old Microsoft sign-in link/)).toBeInTheDocument();
 expect(screen.queryByRole("button",{name:"Confirm account and test publication"})).not.toBeInTheDocument();
});

test("check queues observation and disconnect preserves the existing retention command", async () => {
 const data={...status(),permissions:{canCheck:true,canDisconnect:true}};
 const fetch=jest.fn(async()=>reply(data));
 render(<OutlookFollowUps authFetch={fetch}/>);
 fireEvent.click(await screen.findByRole("button",{name:"Check now"}));
 await screen.findByText("Check requested. This does not confirm calendar delivery.");
 const disconnect=screen.getByRole("button",{name:/Disconnect · retain credentials/});
 await waitFor(()=>expect(disconnect).toBeEnabled());
 fireEvent.click(disconnect);
 await waitFor(()=>expect(fetch.mock.calls.filter(([,o])=>o?.method)).toHaveLength(2));
 expect(JSON.parse(fetch.mock.calls.filter(([,o])=>o?.method)[1][1].body)).toEqual({expectedRevision:2,mode:"CLEANUP_THEN_DISCONNECT"});
 await screen.findByText(/Request accepted. Review/);
});
