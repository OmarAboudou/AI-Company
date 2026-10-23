import type { Command } from "@commander-js/extra-typings"
import {
    type DeleteEmployeeResult,
    deleteEmployee,
} from "../../../organization/employee/delete-employee.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

function formatDeletedMessage({
    employee,
    releasedPositionIds,
}: DeleteEmployeeResult): string {
    return releasedPositionIds.length === 0
        ? `Deleted employee "${employee.id}".`
        : `Deleted employee "${employee.id}"; back to you: ${releasedPositionIds.join(", ")}.`
}

export function registerEmployeeDeleteCommand(employeeCommand: Command): void {
    employeeCommand
        .command("delete")
        .alias("fire")
        .description("Delete (fire) an employee.")
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .option(
            "-f, --force",
            "delete it even if it holds positions, giving them back to you",
        )
        .action(async (rawId, { force: shouldForce }, command) => {
            const deletion = await runCommandOperation(command, () =>
                deleteEmployee(projectRoot, rawId, {
                    shouldForce,
                }),
            )
            console.log(formatDeletedMessage(deletion))
        })
}
