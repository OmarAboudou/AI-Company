import type { Command } from "@commander-js/extra-typings"
import { formatTicketNumbers } from "../../../messaging/ticket/format-ticket-numbers.ts"
import { deletePosition } from "../../../organization/position/delete-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

export function registerPositionDeleteCommand(positionCommand: Command): void {
    positionCommand
        .command("delete")
        .alias("close")
        .description(
            "Delete (close) a position, except the founder's. Its employee stays hired. Refused while tasks on tickets await it, unless --force.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .option("-f, --force", "delete it even with tasks pending on tickets")
        .action(async (rawId, { force: shouldForce }, command) => {
            const { position, pendingTicketNumbers } =
                await runCommandOperation(command, () =>
                    deletePosition(projectRoot, rawId, { shouldForce }),
                )
            const deletedMessage =
                position.employeeId === undefined
                    ? `Deleted position "${position.id}"`
                    : `Deleted position "${position.id}"; its employee "${position.employeeId}" stays hired`
            console.log(
                pendingTicketNumbers.length === 0
                    ? `${deletedMessage}.`
                    : `${deletedMessage}. Its tasks stay pending on: ${formatTicketNumbers(pendingTicketNumbers)}.`,
            )
        })
}
