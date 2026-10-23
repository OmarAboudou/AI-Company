import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { listPositionAssignments } from "../../../organization/position/list-position-assignments.ts"
import type { PositionAssignment } from "../../../organization/position/schema.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"

function formatHolder({ holder }: PositionAssignment): string {
    return holder.kind === "employee" ? holder.employeeId : "(you)"
}

export function registerPositionListCommand(positionCommand: Command): void {
    positionCommand
        .command("list")
        .description(
            "List the positions and who holds each: an LLM employee, or you.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const assignments = await listPositionAssignments(projectRoot)
            printColumns(
                assignments.map((assignment) => [
                    assignment.position.id,
                    assignment.position.title,
                    formatHolder(assignment),
                ]),
            )
        })
}
