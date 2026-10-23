import type { Command } from "@commander-js/extra-typings"
import { updatePositionId } from "../../../organization/position/update-position-id.ts"
import {
    formatIdArgumentDescription,
    formatNewIdArgumentDescription,
} from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerPositionUpdateIdCommand(
    positionCommand: Command,
): void {
    positionCommand
        .command("update-id")
        .description(
            "Change the id of a position, which renames its folder. For the founder's position, the company follows.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<new-position-id>",
            formatNewIdArgumentDescription("position", "api-developer"),
        )
        .action(async (rawId, rawNewId, _options, command) => {
            const { position, renamedPosition } = await runCommandOperation(
                command,
                () => updatePositionId(projectRoot, rawId, rawNewId),
            )
            console.log(
                `Position "${position.id}" is now "${renamedPosition.id}".`,
            )
        })
}
