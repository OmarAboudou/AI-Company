import type { Command } from "@commander-js/extra-typings"
import {
    type UnassignPositionResult,
    unassignPosition,
} from "../../../organization/position/unassign-position.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"
import { formatStillTemporaryMessage } from "./format-still-temporary-message.ts"

function formatUnassignedMessage({
    positionId,
    previousEmployeeId,
    temporaryAssignment,
}: UnassignPositionResult): string {
    if (previousEmployeeId === undefined) {
        return `Position "${positionId}" is already vacant.`
    }
    return `Position "${positionId}" is now vacant: "${previousEmployeeId}" is no longer its default employee.${formatStillTemporaryMessage(temporaryAssignment)}`
}

export function registerPositionUnassignCommand(
    positionCommand: Command,
): void {
    positionCommand
        .command("unassign")
        .description(
            "Remove the default employee of a position, leaving it vacant.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawId) => {
            const unassignment = await unassignPosition(projectRoot, rawId)
            console.log(formatUnassignedMessage(unassignment))
        })
}
