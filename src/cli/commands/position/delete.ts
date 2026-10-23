import type { Command } from "@commander-js/extra-typings"
import { deletePosition } from "../../../organization/position/delete-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

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
        .option("-f, --force", "delete it even with tasks pending in threads")
        .action(async (rawId, { force: shouldForce }, command) => {
            const { position, pendingThreadIds } = await runCommandOperation(
                command,
                () => deletePosition(projectRoot, rawId, { shouldForce }),
            )
            const deletedMessage =
                position.defaultEmployeeId === undefined
                    ? `Deleted position "${position.id}"`
                    : `Deleted position "${position.id}"; its default employee "${position.defaultEmployeeId}" stays hired`
            console.log(
                pendingThreadIds.length === 0
                    ? `${deletedMessage}.`
                    : `${deletedMessage}. Its tasks stay pending in: ${pendingThreadIds.join(", ")}.`,
            )
        })
}
