import type { Command } from "@commander-js/extra-typings"
import { updatePosition } from "../../../organization/position/update-position.ts"
import { createDescriptionFileOption } from "../../create-description-file-option.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { readTextOrFile } from "../../read-text-or-file.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { requireDirector } from "../../require-director.ts"

export function registerPositionUpdateCommand(positionCommand: Command): void {
    positionCommand
        .command("update")
        .description(
            "Update a position: only the options given change. Its default employee changes with assign and unassign.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .option("-t, --title <title>", "position title")
        .option(
            "-d, --description <text>",
            "what the position is responsible for",
        )
        .addOption(createDescriptionFileOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, options) => {
            requireAtLeastOneOption(options)
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const position = await updatePosition(projectRoot, rawId, {
                title: options.title,
                description,
            })
            console.log(`Updated position "${position.id}".`)
        })
}
