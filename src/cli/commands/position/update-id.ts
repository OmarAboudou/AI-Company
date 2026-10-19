import type { Command } from "@commander-js/extra-typings"
import { updatePositionId } from "../../../organization/position/update-position-id.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../../format-new-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"

export function registerPositionUpdateIdCommand(
    positionCommand: Command,
): void {
    positionCommand
        .command("update-id")
        .description(
            "Change the id of a position, which renames its folder. For the director's position, the company follows.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<new-position-id>",
            formatNewIdArgumentDescription("position", "api-developer"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawId, rawNewId) => {
            const { position, renamedPosition } = await updatePositionId(
                projectRoot,
                rawId,
                rawNewId,
            )
            console.log(
                `Position "${position.id}" is now "${renamedPosition.id}".`,
            )
        })
}
