import type { Command } from "@commander-js/extra-typings"
import {
    type AssignPositionResult,
    assignPosition,
} from "../../../organization/position/assign-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"

function formatAssignedMessage({
    positionId,
    employeeId,
    previousEmployeeId,
}: AssignPositionResult): string {
    if (previousEmployeeId === employeeId) {
        return `"${employeeId}" already holds position "${positionId}".`
    }
    return previousEmployeeId === undefined
        ? `"${employeeId}" now holds position "${positionId}".`
        : `"${employeeId}" replaces "${previousEmployeeId}" in position "${positionId}".`
}

export function registerPositionAssignCommand(positionCommand: Command): void {
    positionCommand
        .command("assign")
        .description(
            "Give a position, except the director's, to an LLM employee, which then holds it in your place.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .option("-r, --replace", "replace the employee holding it")
        .action(async (rawPositionId, rawEmployeeId, options, command) => {
            const assignment = await runCommandOperation(command, () =>
                assignPosition(projectRoot, rawPositionId, rawEmployeeId, {
                    shouldReplace: options.replace,
                }),
            )
            console.log(formatAssignedMessage(assignment))
        })
}
