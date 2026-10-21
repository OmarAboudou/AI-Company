import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadExistingPositionAssignment } from "../../../organization/position/load-existing-position-assignment.ts"
import type { PositionAssignment } from "../../../organization/position/schema.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"

function formatCurrentEmployee({
    state,
    currentWorker,
}: PositionAssignment): string {
    if (currentWorker === undefined) {
        return "(vacant)"
    }
    const workerName =
        currentWorker.kind === "directors"
            ? "the repository's git users"
            : currentWorker.employeeId
    return state.temporaryAssignment === undefined
        ? workerName
        : `${workerName} (temporarily)`
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
            const assignment = await loadExistingPositionAssignment(
                projectRoot,
                rawId,
            )
            const { position } = assignment
            const holderLines = assignment.isDirectorPosition
                ? ["held by: the repository's git users"]
                : [
                      `current employee: ${formatCurrentEmployee(assignment)}`,
                      `default employee: ${position.defaultEmployeeId ?? "(none)"}`,
                  ]
            console.log(
                `# ${position.title}\n\n${holderLines.join("\n")}\n\n${position.description}`,
            )
        })
}
