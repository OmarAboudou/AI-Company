import type { Command } from "@commander-js/extra-typings"
import { updateEmployee } from "../../../organization/employee/update-employee.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { runCommandOperation } from "../../run-command-operation.ts"
import { createModelOption } from "./create-model-option.ts"
import { createProviderOption } from "./create-provider-option.ts"

export function registerEmployeeUpdateCommand(employeeCommand: Command): void {
    employeeCommand
        .command("update")
        .description(
            "Update an employee: only the options given change. Its kind can't change.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .option("-n, --name <name>", "employee name")
        .addOption(createProviderOption())
        .addOption(createModelOption())
        .action(async (rawId, options, command) => {
            requireAtLeastOneOption(options)
            const employee = await runCommandOperation(command, () =>
                updateEmployee(projectRoot, rawId, {
                    name: options.name,
                    providerId: options.provider,
                    modelId: options.model,
                }),
            )
            console.log(`Updated employee "${employee.id}".`)
        })
}
