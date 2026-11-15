import DocumentLabel from "../DocumentLabel/DocumentLabel";
import React, { useContext } from "react";
import { ProjectContext } from "../../context/ProjectContext";

const names = {
  projectId: ["projectName"], documentId: ["capturedDocumentName", "capturedName", "documentName", "fileName"],
  followUpId: ["capturedTitle", "followUpTitle"], employeeId: ["employeeName", "displayName"],
  ownerEmployeeId: ["ownerName"], userId: ["username"], organizationId: ["organizationName"],
  donorOrganizationId: ["donorOrganizationName", "donorName"], budgetId: ["budgetName"],
  indicatorId: ["indicatorName"], transactionId: ["transactionDescription"], paymentOrderId: ["paymentOrderDescription"],
  id: ["capturedName", "capturedDocumentName", "documentName", "capturedTitle", "title", "name", "displayName", "username", "budgetName", "projectName", "organizationName", "paymentOrderDescription", "transactionDescription"],
};
const text = value => typeof value === "string" && value.trim() ? value : null;
export const isRecordReference = key => Object.prototype.hasOwnProperty.call(names, key);
export default function RecordReference({ field, value, record = {}, currentProject }) {
  const context = useContext(ProjectContext);
  if (value == null || value === "") return <>Not recorded</>;
  const captured = (names[field] || []).map(key => text(record[key])).find(Boolean)
    || (["id", "indicatorId"].includes(field) && text(record.basis?.name))
    || (field === "projectId" && String(record.context?.projectId) === String(value) && text(record.context?.projectName));
  if (captured) {
    const label = <>{captured} · Reference {String(value)}</>;
    return field === "documentId" ? <DocumentLabel>{label}</DocumentLabel> : label;
  }
  if (field === "projectId") {
    const matches = item => item && String(item.id ?? item.projectId) === String(value);
    const project = matches(currentProject) ? currentProject : context?.projects?.find(matches);
    const name = text(project?.projectName) || text(project?.name);
    if (name) return <>{name} (current name) · Reference {String(value)}</>;
  }
  return <>Reference {String(value)} · Name not recorded</>;
}
