import type { Command } from "@commander-js/extra-typings"
import { updateEmployee } from "../../../organization/employee/update-employee.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireAtLeastOneOption } from "../../require-at-least-one-option.ts"
import { requireDirector } from "../../require-director.ts"

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
        .option(
            "-p, --provider <provider-id>",
            "LLM provider id, e.g. anthropic (see llmco provider list), for an LLM employee",
        )
        .option(
            "-m, --model <model-id>",
            "id of one of the provider's models in llmco, e.g. claude-opus-5-5 (see llmco model list), for an LLM employee",
        )
        .hook("preAction", requireDirector)
        .action(async (rawId, options) => {
            requireAtLeastOneOption(options)
            const employee = await updateEmployee(projectRoot, rawId, {
                name: options.name,
                providerId: options.provider,
                modelId: options.model,
            })
            console.log(`Updated employee "${employee.id}".`)
        })
}
