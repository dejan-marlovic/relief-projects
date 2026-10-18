import { act, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import DeleteExchangeRate from "../DeleteExchangeRate/DeleteExchangeRate";
import RestoreExchangeRate from "../RestoreExchangeRate/RestoreExchangeRate";

let mockRefresh;
jest.mock("../../../hooks/useAutomaticRefresh", () => callback => { mockRefresh = callback; });
test.each([DeleteExchangeRate, RestoreExchangeRate])("list refresh retains rates after failure and never performs a mutation", async Component => {
  jest.spyOn(console,"error").mockImplementation(()=>{});
  localStorage.setItem("authToken","test-token");
  global.fetch=jest.fn(async url=>({ok:true,status:200,text:async()=>JSON.stringify(url.includes("currencies") ? [{id:1,name:"SEK"},{id:2,name:"GBP"}] : [{id:7,baseCurrencyId:1,quoteCurrencyId:2,rate:0.08,rateDate:"2026-10-18T15:01:00"}])}));
  render(<MemoryRouter><Component/></MemoryRouter>);
  const option=await screen.findByRole("option",{name:/SEK.*GBP/});
  fetch.mockRejectedValueOnce(new Error("Offline"));
  await act(async()=>{await mockRefresh();});
  expect(screen.getByRole("option",{name:/SEK.*GBP/})).toBe(option);
  expect(fetch.mock.calls.every(([,o])=>!o.method || o.method==="GET")).toBe(true);
  localStorage.removeItem("authToken");
  jest.restoreAllMocks();
});
