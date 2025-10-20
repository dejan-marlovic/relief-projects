// src/components/PaymentOrders/PaymentOrders.jsx
import { useMemo } from "react";
import PaymentOrder from "./PaymentOrder/PaymentOrder";
import styles from "./PaymentOrders.module.scss";

const headerLabels = [
  "Actions",
  "Transaction",
  "Date",
  "#Tx",
  "Description",
  "Amount",
  "Total Amount",
  "Message",
  "Pin Code",
];

// widths must match headers
const BASE_COL_WIDTHS = [110, 140, 180, 90, 300, 140, 160, 200, 140];

const fake = {
  id: 1,
  transactionId: null,
  paymentOrderDate: "2025-01-01T12:00:00Z",
  numberOfTransactions: 2,
  paymentOrderDescription: "Seed PO",
  amount: 100,
  totalAmount: 100,
  message: "Hello",
  pinCode: "1234",
};

export default function PaymentOrders() {
  // build the CSS variable string "110px 140px ..."
  //const result = useMemo(() => someComputation(), [dependencies]);
  //useMemo is a React hook that lets you cache the
  // result of a calculation so it doesn’t get recomputed on every re-render.
  const gridCols = useMemo(
    //"110px 140px 180px 90px 300px 140px 160px 200px 140px"
    () => BASE_COL_WIDTHS.map((w) => `${w}px`).join(" "),
    []
  );

  return (
    <div className={styles.container}>
      <div
        className={styles.table}
        style={{ ["--po-grid-cols"]: gridCols }} // custom CSS var for the row grid
      >
        {/* Header */}
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          {headerLabels.map((h) => (
            <div key={h} className={styles.headerCell}>
              {h}
            </div>
          ))}
        </div>

        {/* Smoke row */}
        <PaymentOrder po={fake} />
      </div>
    </div>
  );
}
