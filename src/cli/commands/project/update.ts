import type { Command } from "@commander-js/extra-typings"
import { updateProject } from "../../../organization/project/update-project.ts"
import { createDescriptionFileOption } from "../../options.ts"
import { projectRoot } from "../../project-root.ts"
import { readTextOrFile } from "../../read-text-or-file.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerProjectUpdateCommand(projectCommand: Command): void {
    projectCommand
        .command("update")
        .description("Update the project: only the options given change.")
        .option("-d, --description <text>", "project description")
        .addOption(createDescriptionFileOption())
        .action(async (options, command) => {
            requireAtLeastOneOption(options)
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            await runCommandOperation(command, () =>
                updateProject(projectRoot, { description }),
            )
            console.log("Updated the project.")
        })
}
