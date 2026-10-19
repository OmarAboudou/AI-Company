import type { Command } from "@commander-js/extra-typings"
import {
    type DeleteEmployeeResult,
    deleteEmployee,
} from "../../../organization/employee/delete-employee.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"

function formatDeletedMessage({
    employee,
    vacatedPositionIds,
    endedTemporaryPositionIds,
}: DeleteEmployeeResult): string {
    const changeMessages: string[] = []
    if (vacatedPositionIds.length > 0) {
        changeMessages.push(`now vacant: ${vacatedPositionIds.join(", ")}`)
    }
    if (endedTemporaryPositionIds.length > 0) {
        changeMessages.push(
            `temporary assignments ended: ${endedTemporaryPositionIds.join(", ")}`,
        )
    }
    return changeMessages.length === 0
        ? `Deleted employee "${employee.id}".`
        : `Deleted employee "${employee.id}"; ${changeMessages.join("; ")}.`
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
            "delete it even if it fills positions, leaving them vacant, or works them temporarily, ending these assignments",
        )
        .hook("preAction", requireDirector)
        .action(async (rawId, { force: shouldForce }) => {
            const deletion = await deleteEmployee(projectRoot, rawId, {
                shouldForce,
            })
            console.log(formatDeletedMessage(deletion))
        })
}
