import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadProject } from "../../../organization/project/storage.ts"
import { projectRoot } from "../../project-root.ts"

export function registerProjectShowCommand(projectCommand: Command): void {
    projectCommand
        .command("show")
        .description("Display the project's description.")
        .action(async () => {
            await requireCompany(projectRoot)
            const { description } = await loadProject(projectRoot)
            console.log(
                description.trim() === ""
                    ? "The project has no description yet: add one with `aico project update -d <text>`."
                    : description,
            )
        })
}
