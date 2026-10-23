import type { Command } from "@commander-js/extra-typings"
import {
    type UnassignPositionResult,
    unassignPosition,
} from "../../../organization/position/unassign-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

function formatUnassignedMessage({
    positionId,
    previousEmployeeId,
}: UnassignPositionResult): string {
    return previousEmployeeId === undefined
        ? `The directors already hold position "${positionId}".`
        : `Position "${positionId}" is back to the directors: "${previousEmployeeId}" no longer holds it.`
}

export function registerPositionUnassignCommand(
    positionCommand: Command,
): void {
    positionCommand
        .command("unassign")
        .description(
            "Give a position back to the directors, from the LLM employee holding it.",
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
