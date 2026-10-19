import type { Command } from "@commander-js/extra-typings"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
import { createReuseIdOption } from "../create-reuse-id-option.ts"

export function registerEmployeeCreateHumanCommand(
    employeeCreateCommand: Command,
): void {
    employeeCreateCommand
        .command("human")
        .description("Create an employee who is a human.")
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "omar"),
        )
        .requiredOption("-n, --name <name>", "employee name")
        .addOption(createReuseIdOption())
        .action(async (rawId, { name, reuseId: shouldReuseId }) => {
            const employee = await createEmployee(
                projectRoot,
                rawId,
                { name, kind: "human" },
                { shouldReuseId },
            )
            console.log(`Created employee "${employee.id}".`)
        })
}
