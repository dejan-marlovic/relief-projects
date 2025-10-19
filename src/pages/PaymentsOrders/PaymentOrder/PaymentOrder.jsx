//ES module syntax: import <defaultName> from "<package-or-file>";
//react is a package name. Bundler resolves it from node_modules/react
//The line imports the default export from the react package and binds it to the local name React.
//comes from the npm package named "react"
//The bundler reads the package’s package.json and loads its entry file (e.g., index.js) which exports
//import React from "react";

import styles from "./PaymentOrder.module.scss";

//The component returns a <div> with a composed className and renders whatever you put between
//<Cell> ... </Cell> as its children
const Cell = ({ children, className }) => (
  //The curly braces { ... } mean “evaluate this JavaScript expression”.
  //${className || ""}: if a className prop was passed, use it; otherwise use "" (empty string)
  <div className={`${styles.cell} ${className || ""}`}>{children}</div>
);

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
