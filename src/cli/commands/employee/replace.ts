import type { Command } from "@commander-js/extra-typings"
import {
    type ReplaceEmployeeResult,
    replaceEmployee,
} from "../../../organization/employee/replace-employee.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

function formatReplacedMessage({
    employeeId,
    replacementId,
    heldPositionIds,
}: ReplaceEmployeeResult): string {
    return heldPositionIds.length === 0
        ? `"${employeeId}" holds no position: nothing to replace.`
        : `"${replacementId}" replaces "${employeeId}" in ${heldPositionIds.join(", ")}; "${employeeId}" stays hired.`
}

export function registerEmployeeReplaceCommand(employeeCommand: Command): void {
    employeeCommand
        .command("replace")
        .alias("hand-over")
        .description(
            "Replace (hand over) an employee by another in every position it holds. It stays hired.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .argument(
            "<replacement-id>",
            "id of the employee taking its positions over (e.g. omar)",
        )
        .action(async (rawId, rawReplacementId, _options, command) => {
            const handover = await runCommandOperation(command, () =>
                replaceEmployee(projectRoot, rawId, rawReplacementId),
            )
            console.log(formatReplacedMessage(handover))
        })
}
