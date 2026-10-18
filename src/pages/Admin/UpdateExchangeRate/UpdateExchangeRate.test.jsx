import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import UpdateExchangeRate from "./UpdateExchangeRate";

test("changing the quote currency preserves the required original rate date", async () => {
 const rate = {id:7,baseCurrencyId:1,quoteCurrencyId:2,rate:0.08,rateDate:"2026-10-18T15:01:12"};
 global.fetch = jest.fn(async (url, options = {}) => ({ok:true,status:200,text:async()=>JSON.stringify(
   options.method === "PUT" ? {...rate,...JSON.parse(options.body)} : url.includes("currencies") ? [{id:1,name:"SEK"},{id:2,name:"EUR"},{id:3,name:"GBP"}] : url.endsWith("/7") ? rate : [rate]
 )}));
 localStorage.setItem("authToken","test-token");
 render(<MemoryRouter><UpdateExchangeRate/></MemoryRouter>);
 await screen.findByRole("option",{name:/SEK → EUR/});
 const [record,,quote] = screen.getAllByRole("combobox");
 fireEvent.change(record,{target:{value:"7"}});
 fireEvent.change(quote,{target:{value:"3"}});
 fireEvent.click(screen.getByRole("button",{name:"Save changes"}));
 await waitFor(()=>expect(fetch.mock.calls.some(([,o])=>o.method==="PUT")).toBe(true));
 const [,options] = fetch.mock.calls.find(([,o])=>o.method==="PUT");
 expect(JSON.parse(options.body)).toEqual({baseCurrencyId:1,quoteCurrencyId:3,rate:0.08,rateDate:rate.rateDate});
 localStorage.removeItem("authToken");
});

test("changed server data blocks saving and retains the edited quote", async () => {
 jest.spyOn(console,"error").mockImplementation(()=>{});
 const rate={id:7,baseCurrencyId:1,quoteCurrencyId:2,rate:0.08,rateDate:"2026-10-18T15:01:12"};
 global.fetch=jest.fn(async url=>({ok:true,status:200,text:async()=>JSON.stringify(url.includes("currencies") ? [{id:1,name:"SEK"},{id:2,name:"EUR"},{id:3,name:"GBP"}] : url.endsWith("/7") ? {...rate,rate:0.09} : [rate])}));
 localStorage.setItem("authToken","test-token");
 render(<MemoryRouter><UpdateExchangeRate/></MemoryRouter>);
 await screen.findByRole("option",{name:/SEK → EUR/});
 fireEvent.change(screen.getByLabelText("Exchange rate"),{target:{value:"7"}});
 fireEvent.change(screen.getByLabelText("Quote currency"),{target:{value:"3"}});
 fireEvent.click(screen.getByRole("button",{name:"Save changes"}));
 expect(await screen.findByText(/This exchange rate changed elsewhere/)).toBeInTheDocument();
 expect(screen.getByLabelText("Quote currency")).toHaveValue("3");
 expect(fetch.mock.calls.some(([,o])=>o.method==="PUT")).toBe(false);
 localStorage.removeItem("authToken");
 jest.restoreAllMocks();
});
