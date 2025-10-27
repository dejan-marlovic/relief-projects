//ES module syntax: import <defaultName> from "<package-or-file>";
//react is a package name. Bundler resolves it from node_modules/react
//The line imports the default export from the react package and binds it to the local name React.
//comes from the npm package named "react"
//The bundler reads the package’s package.json and loads its entry file (e.g., index.js) which exports
//import React from "react";

import styles from "./PaymentOrder.module.scss";
//react-icons library popular package /fi = the Feather Icons pack
//FiEdit, FiTrash2, FiSave, FiX = specific icons from that pack, exposed as React components
import { FiEdit, FiTrash2, FiSave, FiX } from "react-icons/fi";

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

const PaymentOrder = ({
  po,
  isEditing = false,
  editedValues,
  onEdit,
  onChange,
  onSave,
  onCancel,
  onDelete,
}) => {
  //alias ev with fallback
  //Provides a fallback: If editedValues is undefined/null (i.e., not in edit mode yet),
  // ev becomes an empty object {}.

  /*
  Avoids crashes when reading fields
  Later you do ev[field]. If editedValues were undefined, editedValues[field] would throw. With ev = {}
  you can safely do ev[field] (it’s just undefined), and then your chain ev[field] ?? po[field] ?? "" works.

  Keeps inputs controlled
  Your inputs use value={ev[field] ?? po[field] ?? ""}. The final "" ensures React sees a string/number, not undefined, avoiding the “changing an uncontrolled input to controlled” warning.

  Less repetition & cleaner code
  You reference ev[...] many times. Having the alias keeps the code compact and readable.
  */
  const ev = editedValues || {};
  const submit = (e) => {
    //Cancels the browser’s default action for the event
    //Typical defaults you might prevent: a form submit (which would reload/navigate), a link click (navigation), etc.
    //Save button isn’t inside a <form> (at least in the snippet), so there’s no default submit to stop right now.
    // But adding preventDefault() is a safe guard in case this row later ends up
    // inside a form, or you switch to a form onSubmit={submit} pattern. It prevents unexpected page reloads.
    e.preventDefault();

    //Why it matters here: your row or a parent container may have its own onClick (e.g., “select row”,
    // “toggle expand”, “navigate to detail”). Without stopPropagation(),
    // clicking Save could also trigger that parent handler—causing
    // weird side effects like leaving edit mode, navigating away, etc.
    e.stopPropagation();
    onSave();
  };
  //Empty stays empty, everything else becomes a Number.

  //Why not just Number(v) always?

  //Because when the field is empty,
  // Number("") becomes 0 (surprising!),
  // or if it’s a partial like "-" or ".", it becomes NaN. Either result breaks UX:
  //Users can’t temporarily clear/half-type values.
  //You might render NaN back into the input or lose control of it.
  /*
  You render with:

  value={ev[field] ?? po[field] ?? ""}
  Thanks to toNum, ev[field] is either "" or a number. That keeps the input controlled and predictable.
  */
  const toNum = (v) => (v === "" ? "" : Number(v));

  const inputNum = (field, step = "1") => (
    <input
      type="number"
      step={step}
      value={ev[field] ?? po[field] ?? ""}
      onChange={(e) => onChange(field, toNum(e.target.value))}
      className={styles.input}
    />
  );

  const inputText = (field) => (
    <input
      type="text"
      value={ev[field] ?? po[field] ?? ""}
      onChange={(e) => onChange(field, e.target.value)}
      className={styles.input}
    />
  );

  const inputDate = (
    <input
      type="datetime-local"
      value={toDateTimeLocal(ev.paymentOrderDate ?? po.paymentOrderDate)}
      onChange={(e) =>
        onChange("paymentOrderDate", new Date(e.target.value).toISOString())
      }
      className={styles.input}
    />
  );

  return (
    <div className={`${styles.row} ${styles.gridRow}`}>
      <Cell>
        {isEditing ? (
          // FIX: className should use the CSS module (was "styles.actions")
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={submit}
              title="Save"
            >
              <FiSave />
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={onCancel}
              title="Cancel"
            >
              <FiX />
            </button>
          </div>
        ) : (
          // FIX: add actions container and restore Edit button
          <div className={styles.actions}>
            <button
              type="button"
              className={styles.actionBtn}
              onClick={(e) => {
                // keep clicks from triggering parent row handlers
                e.preventDefault();
                e.stopPropagation();
                onEdit();
              }}
              title="Edit"
            >
              <FiEdit />
            </button>
            <button
              type="button"
              className={`${styles.actionBtn} ${styles.danger}`}
              onClick={(e) => {
                e.preventDefault();
                e.stopPropagation();
                onDelete(po.id);
              }}
              title="Delete"
            >
              <FiTrash2 />
            </button>
          </div>
        )}
      </Cell>

      <Cell>{po.transactionId ?? "-"}</Cell>
      {
        //Editing? show the input.
        //Not editing + have a date? show a formatted date/time.
        //Not editing + no date? show a dash placeholder.
      }
      <Cell>
        {isEditing
          ? inputDate
          : po.paymentOrderDate
          ? new Date(po.paymentOrderDate).toLocaleString()
          : "-"}
      </Cell>
      <Cell>
        {
          //inputNum is a tiny factory that can render a number input for any field.
          //It needs to know which key in your data it should read/write.
        }
        {isEditing
          ? inputNum("numberOfTransactions", "1")
          : po.numberOfTransactions ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputText("paymentOrderDescription")
          : po.paymentOrderDescription ?? "-"}
      </Cell>
      <Cell>
        {isEditing ? inputNum("amount", "0.000001") : po.amount ?? "-"}
      </Cell>
      <Cell>
        {isEditing
          ? inputNum("totalAmount", "0.000001")
          : po.totalAmount ?? "-"}
      </Cell>
      <Cell>{isEditing ? inputText("message") : po.message ?? "-"}</Cell>
      <Cell>{isEditing ? inputText("pinCode") : po.pinCode ?? "-"}</Cell>
    </div>
  );
};

export default PaymentOrder;
