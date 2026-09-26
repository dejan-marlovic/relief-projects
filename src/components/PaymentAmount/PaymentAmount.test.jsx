import { render, screen } from "@testing-library/react";
import PaymentAmount from "./PaymentAmount";
import PaymentCurrencyContext from "../PaymentCurrencyContext/PaymentCurrencyContext";
test("unavailable order totals expose diagnostics without inventing zero",()=>{
 render(<PaymentAmount record={{amount:null,amountSummary:{status:"INCONSISTENT",issues:[{code:"CURRENCY_MISMATCH",message:"Currencies differ",lineIds:[81,82]}]}}}/>);
 expect(screen.getByText("Unavailable")).toBeInTheDocument();
 expect(screen.getByText(/CURRENCY_MISMATCH: Currencies differ.*81, 82/)).toBeInTheDocument();
});
test("unavailable line currency does not hide the exact saved amount",()=>{
 render(<PaymentAmount line record={{amount:"125.123456",amountCurrency:{availability:"CURRENCY_DELETED",currency:null}}}/>);
 expect(screen.getByText("125.123456")).toBeInTheDocument();
 expect(screen.getByText(/CURRENCY_DELETED/)).toBeInTheDocument();
});
test("history uses captured before and after currency and leaves old history unknown",()=>{
 const {rerender}=render(<PaymentCurrencyContext event={{entityType:"PAYMENT_ORDER_LINE"}}/>);
 expect(screen.getByText(/not recorded/)).toBeInTheDocument();
 rerender(<PaymentCurrencyContext event={{entityType:"PAYMENT_ORDER_LINE",paymentCurrencyContext:{version:1,previous:{status:"CONSISTENT",currency:{id:1,name:"Old currency"}},current:{status:"CONSISTENT",currency:{id:2,name:"New currency"}}}}}/>);
 expect(screen.getByText(/Before:.*Old currency/)).toBeInTheDocument();
 expect(screen.getByText(/After:.*New currency/)).toBeInTheDocument();
});
