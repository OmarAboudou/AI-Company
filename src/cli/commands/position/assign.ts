import type { Command } from "@commander-js/extra-typings"
import {
    type AssignPositionResult,
    assignPosition,
} from "../../../organization/position/assign-position.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { formatStillTemporaryMessage } from "./format-still-temporary-message.ts"

function formatAssignedMessage({
    positionId,
    employeeId,
    previousEmployeeId,
    hasEndedTemporaryAssignment,
    temporaryAssignment,
}: AssignPositionResult): string {
    if (previousEmployeeId === employeeId) {
        return `"${employeeId}" is already the default employee of position "${positionId}".`
    }
    const assignedMessage =
        previousEmployeeId === undefined
            ? `"${employeeId}" is now the default employee of position "${positionId}"`
            : `"${employeeId}" replaces "${previousEmployeeId}" as the default employee of position "${positionId}"`
    return hasEndedTemporaryAssignment
        ? `${assignedMessage}, which ends its temporary assignment.`
        : `${assignedMessage}.${formatStillTemporaryMessage(temporaryAssignment)}`
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
