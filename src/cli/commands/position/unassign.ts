import type { Command } from "@commander-js/extra-typings"
import {
    type UnassignPositionResult,
    unassignPosition,
} from "../../../organization/position/unassign-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"
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
        .action(async (rawId, _options, command) => {
            const unassignment = await runCommandOperation(command, () =>
                unassignPosition(projectRoot, rawId),
            )
            console.log(formatUnassignedMessage(unassignment))
        })
}
