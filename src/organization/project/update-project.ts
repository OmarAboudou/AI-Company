import { requireCompany } from "../company/require-company.ts"
import type { Project } from "./schema.ts"
import { loadProject, saveProject } from "./storage.ts"

export async function updateProject(
    projectRoot: string,
    changes: { description?: string },
): Promise<Project> {
    await requireCompany(projectRoot)
    const updatedProject = {
        description:
            changes.description ?? (await loadProject(projectRoot)).description,
    }
    await saveProject(projectRoot, updatedProject)
    return updatedProject
}
