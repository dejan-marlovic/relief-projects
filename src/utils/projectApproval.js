export function projectApprovalLabel(project) {
  const summary = project?.assessmentSummary;
  let text;
  if (summary?.source === "RECORDED_ASSESSMENT") {
    text = summary.currentApprovalId ? `Recorded assessment approval · Decision #${summary.currentApprovalId}` : "No current recorded approval";
  } else if (summary?.source === "DEFAULT_UNASSESSED") text = "Unassessed — no recorded approval";
  else text = `Legacy ${project?.approved ?? "unknown"} — no recorded decision`;
  if (summary?.state) text += ` · Assessment: ${summary.state.toLowerCase()}`;
  if (summary?.assessmentDeleted) text += " · Assessment deleted";
  if (summary?.reviewRequired) text += " · Review required";
  return text;
}
export function projectMetadataPayload(project) {
  const { approved, assessmentSummary, approvalSource, ...metadata } = project;
  return metadata;
}
