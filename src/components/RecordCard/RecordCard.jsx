import React, { forwardRef } from "react";
import RecordListLabel from "../RecordListLabel/RecordListLabel";

/** Shared record shell. The host element and existing classes preserve list,
 * scrolling, mobile-tile and financial layouts. Workflows remain with callers. */
const RecordCard = forwardRef(function RecordCard({
  as: Element = "article", variant = "card", type = "record", label,
  viewing = false, children, ...props
}, ref) {
  return <Element ref={ref} data-record-card="true" data-record-item={variant === "card" ? "card" : undefined}
    data-open-record={viewing ? "true" : undefined} {...props}>
    {viewing && <span className="open-record-label">Viewing record</span>}
    {label && <RecordListLabel type={type}>{label}</RecordListLabel>}
    {children}
  </Element>;
});

// Reuses the platform's right-aligned, wrapping action layout without adding
// wrappers around buttons or changing their visual and keyboard order.
export function RecordCardActions({ as: Element = "div", placement = "section", children, ...props }) {
  return <Element data-action-group={placement} {...props}>{children}</Element>;
}
export default RecordCard;
