import type { Command } from "@commander-js/extra-typings"
import { requireDirector } from "../../../human/current-human.ts"
import {
    assignPosition,
    type PositionAssignment,
} from "../../../organization/position/assign-position.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { stillTemporary } from "./still-temporary.ts"

function formatAssignedMessage({
    positionId,
    employeeId,
    previousEmployeeId,
    hasEndedTemporaryAssignment,
    temporaryAssignment,
}: PositionAssignment): string {
    if (previousEmployeeId === employeeId) {
        return `"${employeeId}" is already the default employee of position "${positionId}".`
    }
    const assignedMessage =
        previousEmployeeId === undefined
            ? `"${employeeId}" is now the default employee of position "${positionId}"`
            : `"${employeeId}" replaces "${previousEmployeeId}" as the default employee of position "${positionId}"`
    return hasEndedTemporaryAssignment
        ? `${assignedMessage}, which ends its temporary assignment.`
        : `${assignedMessage}.${stillTemporary(temporaryAssignment)}`
}

export function registerPositionAssignCommand(positionCommand: Command): void {
    positionCommand
        .command("assign")
        .description(
            "Set the default employee of a position, except the director's. Assigning its temporary assignee ends the temporary assignment.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .option("-r, --replace", "replace the current default employee")
        .hook("preAction", requireDirector)
        .action(async (rawPositionId, rawEmployeeId, options) => {
            const assignment = await assignPosition(
                projectRoot,
                rawPositionId,
                rawEmployeeId,
                { shouldReplace: options.replace },
            )
            console.log(formatAssignedMessage(assignment))
        })
}
