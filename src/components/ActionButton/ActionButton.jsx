import React, { forwardRef } from "react";
import { FiPlus, FiEdit3, FiTrash2, FiMinusCircle, FiSave, FiX, FiSend, FiCheckCircle, FiRotateCcw, FiRefreshCw, FiDownload, FiUpload, FiLink, FiClipboard, FiEye, FiSearch, FiLogOut, FiLogIn, FiSlash, FiPrinter, FiArrowLeft } from "react-icons/fi";
import RecordIcon from "../RecordIcon/RecordIcon";
import styles from "./ActionButton.module.scss";

function textOf(children) {
  return React.Children.toArray(children).map(child => {
    if (typeof child === "string" || typeof child === "number") return String(child);
    if (!React.isValidElement(child) || child.props["aria-hidden"]) return "";
    return textOf(child.props.children);
  }).join(" ").trim();
}
function hasIcon(children) {
  return React.Children.toArray(children).some(child => {
    if (typeof child === "string") return /[←→↑↓×✕✖✓✔]/.test(child);
    if (!React.isValidElement(child)) return false;
    const name = child.type?.displayName || child.type?.name || "";
    if (child.type === "svg" || child.type === RecordIcon || /^Fi[A-Z]/.test(name)) return true;
    if (name === "TravelActionIcon" && ["submit", "approve", "return", "withdraw-approval", "withdraw-review"].includes(child.props.action)) return true;
    return hasIcon(child.props.children);
  });
}
const actions = [
  [/^delete\b/i, FiTrash2, "danger"], [/^(remove|unlink)\b/i, FiMinusCircle, "danger"],
  [/^(void|reject|revoke)\b/i, FiSlash, "danger"],
  [/^(restore|reopen|undo|return|withdraw)\b/i, FiRotateCcw],
  [/^(approve|resolve|complete|mark completed|confirm)\b/i, FiCheckCircle],
  [/^close (risk|project)\b/i, FiCheckCircle],
  [/^(save|apply|update)\b/i, FiSave], [/^(cancel|close|discard|clear|reset|hide)\b/i, FiX],
  [/^(submit|send)\b/i, FiSend], [/^(new|create|add|register)\b/i, FiPlus],
  [/^(edit|correct|change|rename)\b/i, FiEdit3], [/^(download|export)\b/i, FiDownload],
  [/^upload\b/i, FiUpload], [/^(link|attach)\b/i, FiLink],
  [/^(retry|refresh|reload|recalculate)\b/i, FiRefreshCw],
  [/^(review|record|start)\b/i, FiClipboard], [/^(show|view|inspect|preview)\b/i, FiEye],
  [/^(search|filter)\b/i, FiSearch], [/^log\s*out\b/i, FiLogOut],
  [/^log\s*in\b/i, FiLogIn], [/^print\b/i, FiPrinter], [/^back\b/i, FiArrowLeft],
  [/^done editing\b/i, FiX], [/^assign\b/i, FiLink],
  [/^(select|check|i reviewed|i checked)\b/i, FiCheckCircle],
  [/^(use |load |replace draft)/i, FiRefreshCw],
  [/^(version history|latest history|report again)\b/i, FiClipboard],
  [/^find\b/i, FiSearch], [/^keep\b/i, FiSave],
];

// Keep native button semantics, refs, handlers and labels. Existing explicit icons win.
// Plain navigation choices and state labels deliberately receive no inferred action icon.
const ActionButton = forwardRef(function ActionButton({ children, className, ...props }, ref) {
  const label = textOf(children) || props["aria-label"] || props.title || "";
  const selectionControl = ["tab", "option"].includes(props.role) || ["listbox", "dialog"].includes(props["aria-haspopup"]);
  const match = !selectionControl && actions.find(([pattern]) => pattern.test(label));
  const Icon = match?.[1];
  const danger = match?.[2] === "danger";
  const close = !selectionControl && (/^close\b/i.test(label) && !/^close (risk|project)\b/i.test(label) || /^done editing\b/i.test(label));
  return <button {...props} ref={ref} className={[className, danger && styles.danger, close && styles.close].filter(Boolean).join(" ") || undefined}>
    {Icon && !hasIcon(children) && <span className={styles.icon} aria-hidden="true"><Icon focusable="false" /></span>}{children}
  </button>;
});
export default ActionButton;
