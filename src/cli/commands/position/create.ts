import type { Command } from "@commander-js/extra-typings"
import { createPosition } from "../../../organization/position/create-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { createDescriptionFileOption } from "../../options.ts"
import { projectRoot } from "../../project-root.ts"
import { readTextOrFile } from "../../read-text-or-file.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerPositionCreateCommand(positionCommand: Command): void {
    positionCommand
        .command("create")
        .alias("open")
        .description("Create (open) a position.")
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .requiredOption("-t, --title <title>", "position title")
        .option(
            "-d, --description <text>",
            "what the position is responsible for",
            "",
        )
        .addOption(createDescriptionFileOption())
        .action(async (rawId, options, command) => {
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const position = await runCommandOperation(command, () =>
                createPosition(projectRoot, rawId, {
                    title: options.title,
                    description,
                }),
            )
            console.log(`Created position "${position.id}".`)
        })
}
