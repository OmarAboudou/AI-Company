import type { Command } from "@commander-js/extra-typings"
import {
    type UpdateEmployeeIdResult,
    updateEmployeeId,
} from "../../../organization/employee/update-employee-id.ts"
import {
    formatIdArgumentDescription,
    formatNewIdArgumentDescription,
} from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"
import { createReuseIdOption } from "./create-reuse-id-option.ts"

function formatRenamedMessage({
    employee,
    renamedEmployee,
    heldPositionIds,
}: UpdateEmployeeIdResult): string {
    const renamedMessage = `Employee "${employee.id}" is now "${renamedEmployee.id}"`
    return heldPositionIds.length === 0
        ? `${renamedMessage}.`
        : `${renamedMessage}; updated positions: ${heldPositionIds.join(", ")}.`
}

export function registerEmployeeUpdateIdCommand(
    employeeCommand: Command,
): void {
    employeeCommand
        .command("update-id")
        .description(
            "Change the id of an employee, and the positions it holds name the new one.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .argument(
            "<new-employee-id>",
            formatNewIdArgumentDescription("employee", "claude-lead"),
        )
        .addOption(createReuseIdOption())
        .action(
            async (rawId, rawNewId, { reuseId: shouldReuseId }, command) => {
                const renaming = await runCommandOperation(command, () =>
                    updateEmployeeId(projectRoot, rawId, rawNewId, {
                        shouldReuseId,
                    }),
                )
                console.log(formatRenamedMessage(renaming))
            },
        )
}
