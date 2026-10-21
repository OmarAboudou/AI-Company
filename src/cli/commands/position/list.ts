import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositionAssignments } from "../../../organization/position/list-position-assignments.ts"
import type { PositionAssignment } from "../../../organization/position/schema.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"

function formatCurrentEmployee({
    position,
    state,
    currentWorker,
}: PositionAssignment): string {
    if (currentWorker === undefined) {
        return "(vacant)"
    }
    if (state.temporaryAssignment === undefined) {
        return currentWorker.kind === "directors"
            ? "(git users)"
            : currentWorker.employeeId
    }
    const { defaultEmployeeId } = position
    const temporaryNote =
        defaultEmployeeId === undefined
            ? "temporarily"
            : `temporarily; default: ${defaultEmployeeId}`
    return currentWorker.kind === "directors"
        ? `(git users, ${temporaryNote})`
        : `${currentWorker.employeeId} (${temporaryNote})`
}

export function registerPositionListCommand(positionCommand: Command): void {
    positionCommand
        .command("list")
        .description(
            "List the positions and who works each now: its default employee, or whoever it is assigned to temporarily.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const assignments = await listPositionAssignments(projectRoot)
            printColumns(
                assignments.map((assignment) => [
                    assignment.position.id,
                    assignment.position.title,
                    formatCurrentEmployee(assignment),
                ]),
            )
        })
}
