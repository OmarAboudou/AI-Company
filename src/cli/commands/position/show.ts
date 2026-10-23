import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadExistingPositionAssignment } from "../../../organization/position/load-existing-position-assignment.ts"
import type { Worker } from "../../../organization/position/schema.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"

function formatHolder(holder: Worker): string {
    return holder.kind === "employee"
        ? holder.employeeId
        : "the directors, the repository's git users"
}

export function registerPositionShowCommand(positionCommand: Command): void {
    positionCommand
        .command("show")
        .description(
            "Display a position: title, who holds it, and description.",
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
            const { position, holder } = assignment
            console.log(
                `# ${position.title}\n\nheld by: ${formatHolder(holder)}\n\n${position.description}`,
            )
        })
}
