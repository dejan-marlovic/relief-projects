import React, { useCallback, useEffect, useMemo, useState } from "react";
import PaymentOrder from "./PaymentOrder/PaymentOrder";
import styles from "./PaymentOrders.module.scss";

const BASE_URL = "http://localhost:8080";

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
const BASE_COL_WIDTHS = [110, 140, 180, 90, 300, 140, 160, 200, 140];

const PaymentOrders = () => {
  const [orders, setOrders] = useState([]);

  const token = useMemo(() => localStorage.getItem("authToken"), []);
  const authHeaders = useMemo(
    () =>
      token
        ? {
            Authorization: `Bearer ${token}`,
            "Content-Type": "application/json",
          }
        : { "Content-Type": "application/json" },
    [token]
  );

  const fetchOrders = useCallback(async () => {
    try {
      const res = await fetch(`${BASE_URL}/api/payment-orders/active`, {
        headers: authHeaders,
      });
      if (!res.ok) throw new Error(`Failed ${res.status}`);
      setOrders(await res.json());
    } catch (e) {
      console.error(e);
      setOrders([]);
    }
  }, [authHeaders]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const gridCols = BASE_COL_WIDTHS.map((w) => `${w}px`).join(" ");

  return (
    <div className={styles.container}>
      <div className={styles.table} style={{ ["--po-grid-cols"]: gridCols }}>
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          {headerLabels.map((h) => (
            <div key={h} className={styles.headerCell}>
              {h}
            </div>
          ))}
        </div>

        {orders.length === 0 ? (
          <p style={{ padding: 12, color: "#666" }}>No payment orders.</p>
        ) : (
          orders.map((po) => <PaymentOrder key={po.id} po={po} />)
        )}
      </div>
    </div>
  );
};

export default PaymentOrders;
