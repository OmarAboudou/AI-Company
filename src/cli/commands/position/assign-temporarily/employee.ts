import type { Command } from "@commander-js/extra-typings"
import { assignPositionTemporarily } from "../../../../organization/position/assign-position-temporarily.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
import { runCommandOperation } from "../../../run-command-operation.ts"
import { createReplaceTemporaryAssignmentOption } from "./create-replace-temporary-assignment-option.ts"
import { formatTemporarilyAssignedMessage } from "./format-temporarily-assigned-message.ts"

export function registerPositionAssignTemporarilyEmployeeCommand(
    assignTemporarilyCommand: Command,
): void {
    assignTemporarilyCommand
        .command("employee")
        .description("Assign a position temporarily to an employee.")
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-junior"),
        )
        .addOption(createReplaceTemporaryAssignmentOption())
        .action(async (rawPositionId, rawEmployeeId, options, command) => {
            const assignment = await runCommandOperation(command, () =>
                assignPositionTemporarily(
                    projectRoot,
                    rawPositionId,
                    { kind: "employee", rawEmployeeId },
                    { shouldReplace: options.replace },
                ),
            )
            console.log(formatTemporarilyAssignedMessage(assignment))
        })
}
