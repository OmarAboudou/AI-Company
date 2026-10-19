import type { Command } from "@commander-js/extra-typings"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { reuseIdOption } from "../reuse-id-option.ts"

export function registerEmployeeCreateHumanCommand(
    createEmployeeCommand: Command,
): void {
    createEmployeeCommand
        .command("human")
        .description("Create an employee who is a human.")
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "omar"),
        )
        .requiredOption("-n, --name <name>", "employee name")
        .addOption(reuseIdOption())
        .action(async (rawId, { name, reuseId }) => {
            const employee = await createEmployee(
                projectRoot,
                rawId,
                { name, kind: "human" },
                { shouldReuseId: reuseId },
            )
            console.log(`Created employee "${employee.id}".`)
        })
}
