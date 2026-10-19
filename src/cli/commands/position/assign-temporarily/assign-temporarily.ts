import type { Command } from "@commander-js/extra-typings"
import { requireDirector } from "../../../require-director.ts"
import { registerPositionAssignTemporarilyDirectorsCommand } from "./directors.ts"
import { registerPositionAssignTemporarilyEmployeeCommand } from "./employee.ts"

export function registerPositionAssignTemporarilyCommands(
    positionCommand: Command,
): void {
    const assignTemporarilyCommand = positionCommand
        .command("assign-temporarily")
        .alias("interim")
        .description(
            "Assign a position temporarily, until unassign-temporarily: to an employee, or to the directors themselves. Its default employee doesn't change.",
        )
        .hook("preAction", requireDirector)
    registerPositionAssignTemporarilyEmployeeCommand(assignTemporarilyCommand)
    registerPositionAssignTemporarilyDirectorsCommand(assignTemporarilyCommand)
}
