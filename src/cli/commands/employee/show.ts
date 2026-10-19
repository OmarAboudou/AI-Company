import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../company/require-company.ts"
import { loadExistingEmployee } from "../../../organization/employee/load-existing-employee.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { formatIdArgumentDescription } from "../../format-id-argument-description.ts"
import { projectRoot } from "../../project-root.ts"
import { formatPositionsFilledBy } from "./format-positions-filled-by.ts"

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
            const lines = [`# ${employee.name}`, "", `kind: ${employee.kind}`]
            if (employee.kind === "llm") {
                lines.push(
                    `provider: ${employee.providerId}`,
                    `model: ${employee.modelId}`,
                )
            }
            lines.push(
                `positions: ${formatPositionsFilledBy(positions, employee.id)}`,
            )
            console.log(lines.join("\n"))
        })
}
