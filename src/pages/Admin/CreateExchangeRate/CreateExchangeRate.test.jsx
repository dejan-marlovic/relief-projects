import { fireEvent, render, screen, waitFor, within } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import CreateExchangeRate from "./CreateExchangeRate";

beforeEach(() => {
  localStorage.setItem("authToken", "test-token");
  global.fetch = jest.fn(async (_, options) => ({
    ok: true, status: 200,
    text: async () => JSON.stringify(options.method === "POST" ? { id: 7 } : [{ id: 1, name: "SEK" }, { id: 2, name: "EUR" }]),
  }));
});
afterEach(() => localStorage.removeItem("authToken"));

test("unfinished entries recover in this tab without creating an exchange rate", async () => {
  localStorage.setItem("authToken", `x.${btoa(JSON.stringify({sub:"draft-test"}))}.x`);
  const {unmount} = render(<MemoryRouter><CreateExchangeRate /></MemoryRouter>);
  await screen.findAllByRole("option", {name:"SEK"});
  fireEvent.change(screen.getByLabelText("Base currency"), {target:{value:"1"}});
  fireEvent.change(screen.getByLabelText("Rate"), {target:{value:"0.08"}});
  unmount();
  render(<MemoryRouter><CreateExchangeRate /></MemoryRouter>);
  await screen.findAllByRole("option", {name:"SEK"});
  expect(screen.getByLabelText("Rate")).toHaveValue("0.08");
  expect(screen.getByLabelText("Base currency")).toHaveValue("1");
  expect(fetch.mock.calls.some(([,o])=>o.method === "POST")).toBe(false);
  sessionStorage.clear();
});

test.each(["1", "1.00000000", "0.99", "1.00000000000000001"])("same-currency rate %s is validated before creation", async (rate) => {
  render(<MemoryRouter><CreateExchangeRate /></MemoryRouter>);
  await screen.findAllByRole("option", { name: "SEK" });
  const [base, quote] = screen.getAllByRole("combobox");
  fireEvent.change(base, { target: { value: "1" } });
  expect(within(quote).getByRole("option", { name: "SEK" })).toBeEnabled();
  fireEvent.change(quote, { target: { value: "1" } });
  fireEvent.change(screen.getByPlaceholderText("e.g. 10.5321"), { target: { value: rate } });
  fireEvent.click(screen.getByRole("button", { name: "Create exchange rate" }));
  if (rate === "1" || rate === "1.00000000") {
    await waitFor(() => expect(fetch.mock.calls.some(([, o]) => o.method === "POST")).toBe(true));
    const [, options] = fetch.mock.calls.find(([, o]) => o.method === "POST");
    expect(JSON.parse(options.body)).toMatchObject({ baseCurrencyId: 1, quoteCurrencyId: 1, rate: 1 });
  } else {
    expect(await screen.findAllByText("For matching currencies, the rate must be exactly 1.")).not.toHaveLength(0);
    expect(fetch.mock.calls.some(([, o]) => o.method === "POST")).toBe(false);
  }
});
