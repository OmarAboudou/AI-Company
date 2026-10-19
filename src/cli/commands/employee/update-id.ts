import type { Command } from "@commander-js/extra-typings"
import {
    type UpdateEmployeeIdResult,
    updateEmployeeId,
} from "../../../organization/employee/update-employee-id.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../../format-new-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { createReuseIdOption } from "./create-reuse-id-option.ts"

function formatRenamedMessage({
    employee,
    renamedEmployee,
    filledPositionIds,
    temporarilyWorkedPositionIds,
}: UpdateEmployeeIdResult): string {
    const updatedPositionIds = [
        ...filledPositionIds,
        ...temporarilyWorkedPositionIds.map((id) => `${id} (temporarily)`),
    ]
    const renamedMessage = `Employee "${employee.id}" is now "${renamedEmployee.id}"`
    return updatedPositionIds.length === 0
        ? `${renamedMessage}.`
        : `${renamedMessage}; updated positions: ${updatedPositionIds.join(", ")}.`
}

export function registerEmployeeUpdateIdCommand(
    employeeCommand: Command,
): void {
    employeeCommand
        .command("update-id")
        .description(
            "Change the id of an employee and of the positions it fills.",
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
        .hook("preAction", requireDirector)
        .action(async (rawId, rawNewId, { reuseId }) => {
            const renaming = await updateEmployeeId(
                projectRoot,
                rawId,
                rawNewId,
                { shouldReuseId: reuseId },
            )
            console.log(formatRenamedMessage(renaming))
        })
}
