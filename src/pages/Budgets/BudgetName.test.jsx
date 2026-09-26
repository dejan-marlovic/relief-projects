import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateNewBudget from "./CreateNewBudget/CreateNewBudget";
import Budget from "./Budget/Budget";
import { ProjectContext } from "../../context/ProjectContext";

jest.mock("../../context/AuthContext", () => ({ useAuth: () => ({ hasRole: () => true, hasAnyRole: () => true }) }));
jest.mock("./Budget/CostDetails/CostDetails", () => () => null);
jest.mock("exceljs", () => ({}));
const currencies = [{id:1,name:"USD"},{id:2,name:"GBP"},{id:3,name:"SEK"},{id:4,name:"EUR"}];
const rates = [2,3,4].map((id) => ({id: id+10,baseCurrencyId:1,quoteCurrencyId:id,rate:1}));
const saved = { id:7,projectId:2,budgetName:"Original",budgetDescription:"Detailed narrative",lifecycleStatus:"DRAFT",totalAmount:100,localCurrencyId:1,reportingCurrencySekId:3,reportingCurrencyEurId:4,localExchangeRateToGbpId:12,reportingExchangeRateSekId:13,reportingExchangeRateEurId:14 };
const response = (body, ok=true) => ({ok, json:async()=>body,text:async()=>JSON.stringify(body)});

beforeEach(() => {
 jest.spyOn(window,"alert").mockImplementation(()=>{});
 global.fetch=jest.fn(async(url,options={}) => {
   if(options.method === "POST" || options.method === "PUT") return response({...saved,...JSON.parse(options.body)});
   return response(url.includes("exchange-rates") ? rates : currencies);
 });
});
afterEach(() => jest.restoreAllMocks());

const mount = async (edit) => {
 const onSaved=jest.fn();
 const view=render(<MemoryRouter><ProjectContext.Provider value={{selectedProjectId:2}}>{edit ? <Budget budget={saved} onUpdate={onSaved}/> : <CreateNewBudget onBudgetCreated={onSaved}/>}</ProjectContext.Provider></MemoryRouter>);
 await screen.findByLabelText("Budget name");
 await waitFor(()=>expect(view.container.querySelector('select[name="localCurrencyId"]')).toBeInTheDocument());
 const change=(name,value)=>fireEvent.change(view.container.querySelector(`[name="${name}"]`),{target:{name,value}});
 if(!edit){
   change("totalAmount","100");change("localCurrencyId","1");
   change("localExchangeRateToGbpId","12");change("reportingExchangeRateSekId","13");change("reportingExchangeRateEurId","14");
 }
 return {onSaved,change,save:()=>fireEvent.click(screen.getAllByRole("button",{name:edit?"Save changes":"Save",exact:true})[0])};
};

test.each([false,true])("%s: saves normalized names and preserves description",async(edit)=>{
 const {onSaved,change,save}=await mount(edit);
 change("budgetName","  Water supply  ");save();
 await waitFor(()=>expect(onSaved).toHaveBeenCalled());
 const call=fetch.mock.calls.find(([,options])=>options?.method===(edit?"PUT":"POST"));
 expect(JSON.parse(call[1].body)).toMatchObject({budgetName:"Water supply",budgetDescription:edit?"Detailed narrative":""});
});

test.each([false,true])("%s: blank name blocks mutation",async(edit)=>{
 const {change,save}=await mount(edit);change("budgetName","   ");save();
 expect(await screen.findByText("Budget name is required.")).toBeInTheDocument();
 expect(fetch.mock.calls.some(([,o])=>["POST","PUT"].includes(o?.method))).toBe(false);
});

test("server name validation is associated with the creation field",async()=>{
 const {change,save}=await mount(false);change("budgetName","Water");
 fetch.mockImplementationOnce(async()=>response({message:"Validation failed",fieldErrors:{budgetName:"Server name validation"}},false));
 save();
 expect(await screen.findByText("Server name validation")).toBeInTheDocument();
 expect(screen.getByLabelText("Budget name")).toHaveAttribute("aria-invalid","true");
});
