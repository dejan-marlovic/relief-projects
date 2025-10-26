// src/components/PaymentOrders/PaymentOrders.jsx

/*
//useState: Store component state. Adds local, reactive state to a function component.
Store things like input values, toggles, counters, fetched data, etc.
Whenever you call the setter, React re-renders with the new value.

example:
const [count, setCount] = useState(0);

return (
  <button onClick={() => setCount(count + 1)}>
    You clicked {count} times
  </button>
);

/*
useEffect: Runs side effects after render (things that affect the outside world). Fetch data, set up listeners

Fetching data
Setting up event listeners or timers
Syncing with browser APIs
Cleaning up when the component unmounts

useEffect(() => {
  const timer = setInterval(() => console.log("tick"), 1000);
  return () => clearInterval(timer); // cleanup
}, []); // [] means r

useCallback: Caches a function so that it keeps the same identity between renders — unless dependencies change.

const handleClick = useCallback(() => {
  console.log("Clicked!");
}, []); /
*/
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
      //standard fetch with deafult get. Takes API call as string and object headers: authHeaders
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

  //we call save useCallbeck fetchOrders in useEffect hook
  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  //gridCols for SCSS variable
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
