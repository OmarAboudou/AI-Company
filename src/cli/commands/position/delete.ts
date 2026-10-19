import type { Command } from "@commander-js/extra-typings"
import { requireDirector } from "../../../human/current-human.ts"
import { deletePosition } from "../../../organization/position/delete-position.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"

export function registerPositionDeleteCommand(positionCommand: Command): void {
    positionCommand
        .command("delete")
        .alias("close")
        .description(
            "Delete (close) a position, except the director's. Its default employee stays hired. Refused while threads await it, unless --force.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .option("-f, --force", "delete it even if threads await it")
        .hook("preAction", requireDirector)
        .action(async (rawId, { force: shouldForce }) => {
            const { position, awaitingThreadIds } = await deletePosition(
                projectRoot,
                rawId,
                { shouldForce },
            )
            const deletedMessage =
                position.defaultEmployeeId === undefined
                    ? `Deleted position "${position.id}"`
                    : `Deleted position "${position.id}"; its default employee "${position.defaultEmployeeId}" stays hired`
            console.log(
                awaitingThreadIds.length === 0
                    ? `${deletedMessage}.`
                    : `${deletedMessage}. Still awaited in: ${awaitingThreadIds.join(", ")}.`,
            )
        })
}
