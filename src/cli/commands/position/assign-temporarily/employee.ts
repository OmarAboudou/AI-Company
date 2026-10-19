import type { Command } from "@commander-js/extra-typings"
import { assignPositionTemporarily } from "../../../../organization/position/assign-position-temporarily.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { formatTemporarilyAssignedMessage } from "./format-temporarily-assigned-message.ts"
import { replaceTemporaryOption } from "./replace-temporary-option.ts"

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
            formatIdArgumentDescription("employee", "julie"),
        )
        .addOption(replaceTemporaryOption())
        .action(async (rawPositionId, rawEmployeeId, options) => {
            const outcome = await assignPositionTemporarily(
                projectRoot,
                rawPositionId,
                { kind: "employee", rawEmployeeId },
                { shouldReplace: options.replace },
            )
            console.log(formatTemporarilyAssignedMessage(outcome))
        })
}
