import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../organization/company/require-company.ts"
import { loadExistingEmployee } from "../../../organization/employee/load-existing-employee.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { formatPositionsHeldBy } from "./format-positions-held-by.ts"

export function registerEmployeeShowCommand(employeeCommand: Command): void {
    employeeCommand
        .command("show")
        .description("Display an employee.")
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .action(async (rawId) => {
            await requireCompany(projectRoot)
            const [employee, positions] = await Promise.all([
                loadExistingEmployee(projectRoot, rawId),
                listPositions(projectRoot),
            ])
            console.log(
                [
                    `# ${employee.name}`,
                    "",
                    `kind: ${employee.kind}`,
                    `provider: ${employee.providerId}`,
                    `model: ${employee.modelId}`,
                    `positions: ${formatPositionsHeldBy(positions, employee.id)}`,
                ].join("\n"),
            )
        })
}
