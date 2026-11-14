// The backend supplies this flag from the archive marker, not project status.
export const isArchivedProject = project => project?.archived === true;

export const visibleProjects = (projects, showArchived, selectedId) =>
  (projects || []).filter(project => showArchived || !isArchivedProject(project) || String(project.id) === String(selectedId));
