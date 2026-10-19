import type { Command } from "@commander-js/extra-typings"
import { createPosition } from "../../../organization/position/create-position.ts"
import { createDescriptionFileOption } from "../../create-description-file-option.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { readTextOrFile } from "../../read-text-or-file.ts"
import { requireDirector } from "../../require-director.ts"

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
        .hook("preAction", requireDirector)
        .action(async (rawId, options) => {
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const position = await createPosition(projectRoot, rawId, {
                title: options.title,
                description,
            })
            console.log(`Created position "${position.id}".`)
        })
}
