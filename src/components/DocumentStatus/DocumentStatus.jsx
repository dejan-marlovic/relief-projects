import React from "react";

export const statusLabel = (status) => ({ DRAFT: "Draft", FINAL: "Final" }[status] || "Unknown");

export default function DocumentStatus({ value, onChange, disabled, label = "Status", allowUnknown = false, className }) {
  return <label>{label}<select className={className} value={value || ""} onChange={onChange} disabled={disabled}>
    {allowUnknown && <option value="" disabled>Unknown</option>}
    <option value="DRAFT">Draft</option><option value="FINAL">Final</option>
  </select></label>;
}
