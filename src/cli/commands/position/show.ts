import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../company/require-company.ts"
import { loadCompany } from "../../../company/storage.ts"
import { parseId } from "../../../ids/parse-id.ts"
import { loadExistingPosition } from "../../../organization/position/load-existing-position.ts"
import type { Position, Worker } from "../../../organization/position/schema.ts"
import { loadPositionState } from "../../../organization/position/storage.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"

function currentEmployeeInShow(
    { defaultEmployeeId }: Position,
    temporaryAssignment: Worker | undefined,
): string {
    if (temporaryAssignment === undefined) {
        return defaultEmployeeId ?? "(vacant)"
    }
    return temporaryAssignment.kind === "directors"
        ? "the repository's git users (temporarily)"
        : `${temporaryAssignment.employeeId} (temporarily)`
}

export function registerPositionShowCommand(positionCommand: Command): void {
    positionCommand
        .command("show")
        .description(
            "Display a position: title, current and default employees, and description.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany(projectRoot)
            const [position, company, { temporaryAssignment }] =
                await Promise.all([
                    loadExistingPosition(projectRoot, rawId),
                    loadCompany(projectRoot),
                    loadPositionState(projectRoot, parseId("position", rawId)),
                ])
            const holders =
                position.id === company.directorPositionId
                    ? ["held by: the repository's git users"]
                    : [
                          `current employee: ${currentEmployeeInShow(position, temporaryAssignment)}`,
                          `default employee: ${position.defaultEmployeeId ?? "(none)"}`,
                      ]
            console.log(
                `# ${position.title}\n\n${holders.join("\n")}\n\n${position.description}`,
            )
        })
}
