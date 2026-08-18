export const getSelectedProjectName = (projects, selectedProjectId) => {
  if (!selectedProjectId) return "";

  const selectedProject = (projects || []).find(
    (project) => String(project.id) === String(selectedProjectId)
  );

  return (
    selectedProject?.projectName ||
    selectedProject?.name ||
    `Project #${selectedProjectId}`
  );
};
