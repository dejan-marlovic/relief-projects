// src/components/PaymentOrders/PaymentOrders.jsx

import { useCallback, useEffect, useMemo, useState } from "react";
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

function PaymentOrders() {
  const [orders, setOrders] = useState([]);
  const [editingId, setEditingId] = useState(null);
  const [editedValues, setEditedValues] = useState({});

  // Begin editing a row: seed the draft with current values
  const startEdit = (po) => {
    setEditingId(po?.id ?? null);
    setEditedValues((prev) => ({
      ...prev,
      [po.id]: {
        transactionId: po.transactionId ?? "",
        paymentOrderDate: po.paymentOrderDate ?? "",
        numberOfTransactions: po.numberOfTransactions ?? "",
        paymentOrderDescription: po.paymentOrderDescription ?? "",
        amount: po.amount ?? "",
        totalAmount: po.totalAmount ?? "",
        message: po.message ?? "",
        pinCode: po.pinCode ?? "",
      },
    }));
  };

  // Update a single field in the current draft
  const onChange = (field, value) => {
    setEditedValues((prev) => ({
      ...prev,
      [editingId]: {
        ...prev[editingId],
        [field]: typeof value === "string" && value.trim() === "" ? "" : value,
      },
    }));
  };

  // Cancel editing: clear current id and remove its draft
  const cancel = () => {
    const id = editingId; // capture before we clear it
    setEditingId(null);
    setEditedValues((prev) => {
      const next = { ...prev };
      if (id && next[id]) delete next[id];
      return next;
    });
  };

  // Auth headers (memoized)
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

  // Fetch list
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

  // Save current draft (POST for create, PUT for update)
  const save = async () => {
    const id = editingId;
    const v = editedValues[id];
    if (!v) return;

    const isCreate = id === "new";

    /*
    convert strings from inputs into the right types (numbers/strings),

    turn “empty” values into null or "" consistently,

    avoid sending undefined.

    Type safety: Inputs give you strings; API likely expects numbers/strings/nulls. Converting here
    */
    const payload = {
      transactionId: v.transactionId !== "" ? Number(v.transactionId) : null,
      paymentOrderDate: v.paymentOrderDate || null,
      numberOfTransactions:
        v.numberOfTransactions !== "" ? Number(v.numberOfTransactions) : null,
      paymentOrderDescription: v.paymentOrderDescription || "",
      amount: v.amount !== "" ? Number(v.amount) : null,
      totalAmount: v.totalAmount !== "" ? Number(v.totalAmount) : null,
      //This guarantees the backend always gets a string (never undefined).
      message: v.message || "",
      pinCode: v.pinCode || "",
    };

    try {
      const res = await fetch(
        isCreate
          ? `${BASE_URL}/api/payment-orders`
          : `${BASE_URL}/api/payment-orders/${id}`,
        {
          method: isCreate ? "POST" : "PUT",
          headers: authHeaders,
          body: JSON.stringify(payload), // ← ensure payload is sent
        }
      );
      if (!res.ok)
        throw new Error(
          `${isCreate ? "Create" : "Update"} failed ${res.status}`
        );

      //Re-fetch the list from the server after a successful create/update.
      await fetchOrders();

      //Exit edit mode and clear the draft edits for the row you just saved.
      //This collapses the inline editor back to read-only and
      //removes editedValues[id], so the next time you edit it, you re-seed from the fresh server data you just fetched.
      cancel();
    } catch (e) {
      console.error(e);
      alert(`${isCreate ? "Create" : "Save"} failed.`);
    }
  };

  // Delete a row
  const remove = async (id) => {
    if (!id) return;
    if (!window.confirm("Delete this payment order?")) return;
    try {
      const res = await fetch(`${BASE_URL}/api/payment-orders/${id}`, {
        method: "DELETE",
        headers: authHeaders,
      });
      if (!res.ok) throw new Error("Delete failed");
      await fetchOrders();
    } catch (e) {
      console.error(e);
      alert("Delete failed.");
    }
  };

  // Build CSS var for the grid columns
  const gridCols = BASE_COL_WIDTHS.map((w) => `${w}px`).join(" ");

  const blankPO = {
    transactionId: "",
    paymentOrderDate: "",
    numberOfTransactions: "",
    paymentOrderDescription: "",
    amount: "",
    totalAmount: "",
    message: "",
    pinCode: "",
  };

  const startCreate = () => {
    setEditingId("new");
    //Updates the edited drafts map using the functional updater form.
    //prev is the latest state value that React passes into updater (prevents stale state bugs).
    //({ ...prev, new: { ...blankPO } }) builds the next state.
    //...prev copies all existing drafts (immutably).
    //new: { ...blankPO } adds (or replaces) the draft under the key "new" with a fresh clone of
    //...prev (object spread)
    //Creates a new object that contains all keys from the previous editedValues
    //This is immutable—we don’t mutate prev; we return a brand new object so React can detect the change and re-render.
    //{ ...blankPO }
    //Clones the template object for your empty form (e.g., { amount: "", message: "", ... }).
    //Cloning avoids sharing the same object reference across multiple “new” attempts. If you didn’t clone,
    // changing one field would mutate the shared blankPO everywhere.

    //Spread is shallow: it copies the top level. That’s perfect here because blankPO is a flat form object.
    // If it had nested objects you wanted to isolate, you’d also spread those, or use a deep clone strategy.
    setEditedValues((prev) => ({ ...prev, new: { ...blankPO } }));

    /*

    Why pass a function to setEditedValues?

    Avoid stale state: React batches state updates. If you did:

    setEditedValues({ ...editedValues, new: { ...blankPO } }); // ❌ can be stale


    editedValues here could be an old snapshot captured by closure. With the functional form:

    setEditedValues(prev => ({ ...prev, new: { ...blankPO } })); // ✅ fresh


    React guarantees prev is the current state at the moment of the update, so you never lose existing drafts.

    Next state depends on previous: You are literally building the next object from prev. 
    That’s exactly when the functional updater is recommended.

    Mental model

    After these two lines, your state looks like:

    editingId = "new";
    editedValues = {
      // ...whatever drafts existed before,
      new: {  a fresh copy of blankPO fields  }
    };


    List renders a “new row” in editing mode. Inputs read from editedValues["new"], 
    and as the user types, your onChange updates that draft.

    Common pitfalls (and why your version is right)

    Mutating state (don’t do this):

    setEditedValues(prev => {
      prev.new = { ...blankPO }; // ❌ mutates prev
      return prev;               // ❌ returns same object reference
    });


    This can prevent React from re-rendering because the reference didn’t change.

    Using non-functional form when combining updates in quick succession:

    // ❌ Could drop other pending changes if `editedValues` is stale
    setEditedValues({ ...editedValues, new: { ...blankPO } });


    Current version—functional updater + spread cloning—is the safe, idiomatic React way.


    */
  };

  return (
    <div className={styles.container}>
      <div className={styles.table} style={{ ["--po-grid-cols"]: gridCols }}>
        {/* Header */}
        <div className={`${styles.gridRow} ${styles.headerRow}`}>
          {headerLabels.map((h) => (
            <div key={h} className={styles.headerCell}>
              {h}
            </div>
          ))}
        </div>

        {/* Body */}
        {orders.length === 0 ? (
          <p style={{ padding: 12, color: "#666" }}>No payment orders.</p>
        ) : (
          orders.map((po) => (
            <PaymentOrder
              key={po.id}
              po={po}
              isEditing={editingId === po.id}
              editedValues={editedValues[po.id]}
              onEdit={() => startEdit(po)}
              onChange={onChange}
              onSave={save}
              onCancel={cancel}
              onDelete={remove}
            />
          ))
        )}

        {/* --- INLINE CREATE ROW --- */}
        {editingId === "new" && (
          <PaymentOrder
            po={{ id: "new", ...blankPO }}
            isEditing
            editedValues={editedValues.new}
            onChange={onChange}
            onSave={save}
            onCancel={cancel}
            onDelete={() => {}}
          />
        )}
      </div>

      {/* Add button below the table */}
      <div style={{ marginTop: 10 }}>
        <button
          onClick={startCreate}
          disabled={editingId === "new"}
          title={
            editingId === "new"
              ? "Finish the current draft first"
              : "Create new payment order"
          }
        >
          + New Payment Order
        </button>
      </div>
    </div>
  );
}

export default PaymentOrders;

/*
The parent (PaymentOrders) owns all state: orders, editingId, editedValues.

The child (PaymentOrder) is mostly dumb: it just renders one row and fires events when the user clicks/edits.

To let the child change parent state, the parent passes functions as props:

onEdit, onChange, onSave, onCancel, onDelete

The child calls those props → the parent updates its state → React re-renders → the child sees new props.

So: data flows down, events bubble up.



Why this pattern is good

Single source of truth
All edits are in one place (parent). No risk of the row going “out of sync” with the list.

Predictable data flow
Parent updates → children re-render. Debugging is easier.

Easier side-effects
Networking (save/delete), auth headers, and error handling stay in the parent.

Simple children
PaymentOrder is reusable and easy to test; it renders whatever props say.

What it’s called

Lifting state up (official React docs term)

Unidirectional data flow

Container (smart) / Presentational (dumb) components

Controlled inputs (the input’s value is derived from parent state; changes go through onChange)

Mental model (tiny diagram)
Parent: PaymentOrders (stateful)
   ├── state: orders, editingId, editedValues
   ├── handlers: startEdit, onChange, save, cancel, remove
   └── render row(s) with props ↓

Child: PaymentOrder (stateless-ish)
   ↑ calls props.onEdit / onChange / onSave / onCancel / onDelete


Down: data (po, isEditing, editedValues)

Up: events (callbacks)

Why not keep state in the row?

You could give each row its own local state. But then:

The parent needs to know when any row changed to enable Save All, refresh, etc.

Deleting/refreshing the list might discard the row’s local state.

Coordination between rows (e.g., “only one row can be in edit mode”) is tricky.

Keeping state up (in the parent) solves these.
*/
