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
    filledPositionIds,
    handedOverPositionIds,
    endedTemporaryPositionIds,
    keptTemporaryPositionIds,
}: ReplaceEmployeeResult): string {
    const keptMessage =
        keptTemporaryPositionIds.length === 0
            ? ""
            : ` "${employeeId}" stays assigned temporarily to ${keptTemporaryPositionIds.join(", ")}.`
    const changedPositionIds = [
        ...filledPositionIds,
        ...handedOverPositionIds,
        ...endedTemporaryPositionIds,
    ]
    if (changedPositionIds.length === 0) {
        return `"${employeeId}" fills no position: nothing to replace.${keptMessage}`
    }
    const roleMessages: string[] = []
    if (filledPositionIds.length > 0) {
        roleMessages.push(
            `as default employee of ${filledPositionIds.join(", ")}`,
        )
    }
    if (handedOverPositionIds.length > 0) {
        roleMessages.push(
            `as temporary assignee of ${handedOverPositionIds.join(", ")}`,
        )
    }
    const replacedMessage =
        roleMessages.length === 0
            ? `"${replacementId}" already works by default what "${employeeId}" covered`
            : `"${replacementId}" replaces "${employeeId}" ${roleMessages.join(" and ")}`
    const endedMessage =
        endedTemporaryPositionIds.length === 0
            ? ""
            : ` Temporary assignments ended: ${endedTemporaryPositionIds.join(", ")}.`
    return `${replacedMessage}; "${employeeId}" stays hired.${endedMessage}${keptMessage}`
}

export function registerEmployeeReplaceCommand(employeeCommand: Command): void {
    employeeCommand
        .command("replace")
        .alias("hand-over")
        .description(
            "Replace (hand over) an employee by another in every position it fills by default. It stays hired, and keeps its temporary assignments unless --temporary.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .argument(
            "<replacement-id>",
            "id of the employee taking its positions over (e.g. omar)",
        )
        .option("-t, --temporary", "also hand over its temporary assignments")
        .action(async (rawId, rawReplacementId, options, command) => {
            const handover = await runCommandOperation(command, () =>
                replaceEmployee(projectRoot, rawId, rawReplacementId, {
                    shouldHandOverTemporaryAssignments: options.temporary,
                }),
            )
            console.log(formatReplacedMessage(handover))
        })
}
