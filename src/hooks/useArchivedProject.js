import { useContext } from "react";
import { ProjectContext } from "../context/ProjectContext";
import { isArchivedProject } from "../utils/projectArchive";

// UI convenience only. The server enforces the lock for every mutation.
export default function useArchivedProject(projectId) {
  const context = useContext(ProjectContext);
  const id = projectId ?? context?.selectedProjectId;
  return isArchivedProject(context?.projects?.find(project => String(project.id) === String(id)));
}
