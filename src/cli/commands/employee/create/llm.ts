import type { Command } from "@commander-js/extra-typings"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { formatIdArgumentDescription } from "../../../id-argument-descriptions.ts"
import { projectRoot } from "../../../project-root.ts"
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
        .requiredOption(
            "-p, --provider <provider-id>",
            "LLM provider id, e.g. anthropic (see llmco provider list)",
        )
        .requiredOption(
            "-m, --model <model-id>",
            "id of one of the provider's models in llmco, e.g. claude-opus-5-5 (see llmco model list), not its api id",
        )
        .addOption(createReuseIdOption())
        .action(async (rawId, options) => {
            const employee = await createEmployee(
                projectRoot,
                rawId,
                {
                    name: options.name,
                    kind: "llm",
                    providerId: options.provider,
                    modelId: options.model,
                },
                { shouldReuseId: options.reuseId },
            )
            console.log(`Created employee "${employee.id}".`)
        })
}
