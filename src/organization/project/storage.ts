import { join } from "node:path"
import { getAicoFolderPath } from "../../files/get-aico-folder-path.ts"
import { readTextFile } from "../../files/read-text-file.ts"
import type { Project } from "./schema.ts"

function getProjectDescriptionPath(projectRoot: string): string {
    return join(getAicoFolderPath(projectRoot), "project", "description.md")
}

export async function loadProject(projectRoot: string): Promise<Project> {
    const descriptionPath = getProjectDescriptionPath(projectRoot)
    return { description: await readTextFile(projectRoot, descriptionPath) }
}

export async function saveProject(
    projectRoot: string,
    project: Project,
): Promise<void> {
    await Bun.write(getProjectDescriptionPath(projectRoot), project.description)
}
