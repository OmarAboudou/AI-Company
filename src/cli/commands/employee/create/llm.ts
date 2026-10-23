import type { Command } from "@commander-js/extra-typings"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
import { runCommandOperation } from "../../../run-command-operation.ts"
import { createModelOption } from "../create-model-option.ts"
import { createProviderOption } from "../create-provider-option.ts"
import { createReuseIdOption } from "../create-reuse-id-option.ts"

export function registerEmployeeCreateLlmCommand(
    employeeCreateCommand: Command,
): void {
    employeeCreateCommand
        .command("llm")
        .description("Create an employee run by an LLM.")
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .requiredOption("-n, --name <name>", "employee name")
        .addOption(createProviderOption().makeOptionMandatory())
        .addOption(createModelOption().makeOptionMandatory())
        .addOption(createReuseIdOption())
        .action(async (rawId, options, command) => {
            const employee = await runCommandOperation(command, () =>
                createEmployee(
                    projectRoot,
                    rawId,
                    {
                        name: options.name,
                        kind: "llm",
                        providerId: options.provider,
                        modelId: options.model,
                    },
                    { shouldReuseId: options.reuseId },
                ),
            )
            console.log(`Created employee "${employee.id}".`)
        })
}
