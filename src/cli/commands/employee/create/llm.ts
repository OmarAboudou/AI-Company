import type { Command } from "@commander-js/extra-typings"
import { createEmployee } from "../../../../organization/employee/create-employee.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { reuseIdOption } from "../reuse-id-option.ts"

export function registerEmployeeCreateLlmCommand(
    createEmployeeCommand: Command,
): void {
    createEmployeeCommand
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
        .addOption(reuseIdOption())
        .action(async (rawId, { name, provider, model, reuseId }) => {
            const employee = await createEmployee(
                projectRoot,
                rawId,
                { name, kind: "llm", providerId: provider, modelId: model },
                { shouldReuseId: reuseId },
            )
            console.log(`Created employee "${employee.id}".`)
        })
}
