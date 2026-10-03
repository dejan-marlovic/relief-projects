export const workflowLabels = { TODO: "To do", IN_PROGRESS: "In progress", DONE: "Done" };
export const workflowLabel = task => workflowLabels[task?.workflowState] || (task?.status === "COMPLETED" ? "Completed" : "Open (progress not recorded)");

export function moveCommand(task, target) {
  if (!task || task.isDeleted || task.projectDeleted || task.workflowState === target) return null;
  const permissions = task.permissions || {};
  if (task.workflowState === "DONE") return target === "TODO" && permissions.canReopen ? { action: "reopen" } : null;
  if (!["TODO", "IN_PROGRESS"].includes(task.workflowState)) return null;
  if (target === "DONE" && permissions.canComplete) return { action: "complete" };
  if (target === "IN_PROGRESS" && permissions.canStartWork) return { action: "progress", values: { target } };
  if (target === "TODO" && permissions.canReturnToTodo) return { action: "progress", values: { target } };
  return null;
}

// Independent column reads may straddle a concurrent move. Show each loaded ID
// once, using its newest revision, without inventing counts or fetching all pages.
export function boardColumns(pages) {
  const newest = new Map();
  Object.values(pages).forEach(page => page.content.forEach(task => {
    if (!newest.has(task.id) || newest.get(task.id).revision < task.revision) newest.set(task.id, task);
  }));
  return Object.fromEntries(Object.keys(workflowLabels).map(state => [state, [...newest.values()].filter(task => task.workflowState === state)]));
}
