import type { Command } from "@commander-js/extra-typings"
import { requireCompany } from "../../../company/require-company.ts"
import { listEmployees } from "../../../organization/employee/storage.ts"
import { listPositions } from "../../../organization/position/storage.ts"
import { printColumns } from "../../print-columns.ts"
import { projectRoot } from "../../project-root.ts"
import { formatPositionsFilledBy } from "./format-positions-filled-by.ts"

export function registerEmployeeListCommand(employeeCommand: Command): void {
    employeeCommand
        .command("list")
        .description("List the employees.")
        .option(
            "-p, --positions",
            "also list the positions each employee fills",
        )
        .action(async ({ positions: shouldListPositions }) => {
            await requireCompany(projectRoot)
            const [employees, positions] = await Promise.all([
                listEmployees(projectRoot),
                shouldListPositions ? listPositions(projectRoot) : [],
            ])
            if (employees.length === 0) {
                console.log("No employees yet. Run `llmco employee create`.")
                return
            }
            printColumns(
                employees.map((employee) => {
                    const row = [
                        employee.id,
                        employee.name,
                        employee.kind === "llm"
                            ? `${employee.providerId}/${employee.modelId}`
                            : "human",
                    ]
                    return shouldListPositions
                        ? [
                              ...row,
                              formatPositionsFilledBy(positions, employee.id),
                          ]
                        : row
                }),
            )
        })
}
