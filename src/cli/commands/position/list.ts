import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../company/require-company.ts"
import { loadCompany } from "../../../company/storage.ts"
import type {
    Position,
    PositionState,
} from "../../../organization/position/schema.ts"
import {
    listPositions,
    loadPositionState,
} from "../../../organization/position/storage.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"

function formatCurrentEmployee(
    { defaultEmployeeId }: Position,
    { temporaryAssignment }: PositionState,
): string {
    if (temporaryAssignment === undefined) {
        return defaultEmployeeId ?? "(vacant)"
    }
    const temporaryNote =
        defaultEmployeeId === undefined
            ? "temporarily"
            : `temporarily; default: ${defaultEmployeeId}`
    return temporaryAssignment.kind === "directors"
        ? `(git users, ${temporaryNote})`
        : `${temporaryAssignment.employeeId} (${temporaryNote})`
}

export function registerPositionListCommand(positionCommand: Command): void {
    positionCommand
        .command("list")
        .description(
            "List the positions and who works each now: its default employee, or whoever it is assigned to temporarily.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [positions, company] = await Promise.all([
                listPositions(projectRoot),
                loadCompany(projectRoot),
            ])
            const rows = await Promise.all(
                positions.map(async (position) => {
                    const state = await loadPositionState(
                        projectRoot,
                        position.id,
                    )
                    const currentEmployeeCell =
                        position.id === company.directorPositionId
                            ? "(git users)"
                            : formatCurrentEmployee(position, state)
                    return [position.id, position.title, currentEmployeeCell]
                }),
            )
            printColumns(rows)
        })
}
