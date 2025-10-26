//ES module syntax: import <defaultName> from "<package-or-file>";
//react is a package name. Bundler resolves it from node_modules/react
//The line imports the default export from the react package and binds it to the local name React.
//comes from the npm package named "react"
//The bundler reads the package’s package.json and loads its entry file (e.g., index.js) which exports
//import React from "react";

import styles from "./PaymentOrder.module.scss";
//react-icons library popular package /fi = the Feather Icons pack
//FiEdit, FiTrash2, FiSave, FiX = specific icons from that pack, exposed as React components
import { FiEdit, FiTrash2, FiSave, Fix } from "react-icons/fi";

//The component returns a <div> with a composed className and renders whatever you put between
//<Cell> ... </Cell> as its children
const Cell = ({ children, className }) => (
  //The curly braces { ... } mean “evaluate this JavaScript expression”.
  //${className || ""}: if a className prop was passed, use it; otherwise use "" (empty string)
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

//This function converts an ISO date string into the format expected by an HTML
// <input type="datetime-local"> (YYYY-MM-DDTHH:MM).
function toDateTimeLocal(iso) {
  //iso date string like: "2025-10-23T14:05:00Z").
  //T Time separator
  //Z Time zone indicator Z = Zulu time (UTC+0)
  //Means “this time is in UTC (Coordinated Universal Time)”
  if (!iso) return "";
  //Creates a JavaScript Date from the ISO string.
  //JavaScript converts that UTC time into your local timezone .toString()
  const d = new Date(iso);

  if (Number.isNaN(d.getTime())) return "";

  //short for zero-pad (a common term). The helper “pads” numbers like 5 → "05" so dates/times always have 2 digits
  // (e.g., 2025-03-07T09:04 instead of 2025-3-7T9:4).
  //converts the value n to a string.
  //if the string is shorter than length 2, add "0"s to the start until it’s length 2.
  const pad = (n) => String(n).padStart(2, "0");

  //getFullYear() → 4-digit year
  //getMonth() + 1 → months are 0-based, so add 1
  //getDate() → day of month
  //getHours() / getMinutes() → local time (not UTC)
  //Pads month/day/hour/minute to two digits
  //Returns something like "2025-10-23T16:07".
  return (
    `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}` +
    `T${pad(d.getHours())}:${pad(d.getMinutes())}`
  );
}

function PaymentOrder({ po }) {
  // shows 9 columns, plain text for now
  //?? is the nullish coalescing operator in JavaScript.
  //?? returns the left value unless that value is null or undefined.
  return (
    <div className={`${styles.row} ${styles.gridRow}`}>
      <Cell>—</Cell> {/* actions placeholder */}
      <Cell>{po.transactionId ?? "-"}</Cell>
      <Cell>{po.paymentOrderDate ?? "-"}</Cell>
      <Cell>{po.numberOfTransactions ?? "-"}</Cell>
      <Cell>{po.paymentOrderDescription ?? "-"}</Cell>
      <Cell>{po.amount ?? "-"}</Cell>
      <Cell>{po.totalAmount ?? "-"}</Cell>
      <Cell>{po.message ?? "-"}</Cell>
      <Cell>{po.pinCode ?? "-"}</Cell>
    </div>
  );
}

export default PaymentOrder;
