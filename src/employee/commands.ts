import { type Command, Option } from "@commander-js/extra-typings"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { requireCompany } from "../company/require-company.ts"
import { createEmployee } from "../organization/employee/create-employee.ts"
import {
    deleteEmployee,
    type EmployeeDeletion,
} from "../organization/employee/delete-employee.ts"
import { getPositionsFilledBy } from "../organization/employee/get-positions-filled-by.ts"
import { loadExistingEmployee } from "../organization/employee/load-existing-employee.ts"
import {
    type EmployeeReplacement,
    replaceEmployee,
} from "../organization/employee/replace-employee.ts"
import { listEmployees } from "../organization/employee/storage.ts"
import { updateEmployee } from "../organization/employee/update-employee.ts"
import {
    type EmployeeRenaming,
    updateEmployeeId,
} from "../organization/employee/update-employee-id.ts"
import type { Position } from "../organization/position/schema.ts"
import { listPositions } from "../organization/position/storage.ts"

function positionsFilledBy(positions: Position[], employeeId: string): string {
    const ids = getPositionsFilledBy(positions, employeeId).map(({ id }) => id)
    return ids.length > 0 ? ids.join(", ") : "(none)"
}

function formatRenamedMessage({
    employee,
    renamedEmployee,
    filledPositionIds,
    temporarilyWorkedPositionIds,
}: EmployeeRenaming): string {
    const updatedPositionIds = [
        ...filledPositionIds,
        ...temporarilyWorkedPositionIds.map((id) => `${id} (temporarily)`),
    ]
    const renamedMessage = `Employee "${employee.id}" is now "${renamedEmployee.id}"`
    return updatedPositionIds.length === 0
        ? `${renamedMessage}.`
        : `${renamedMessage}; updated positions: ${updatedPositionIds.join(", ")}.`
}

function formatReplacedMessage({
    employeeId,
    replacementId,
    filledPositionIds,
    handedOverPositionIds,
    endedTemporaryPositionIds,
    keptTemporaryPositionIds,
}: EmployeeReplacement): string {
    const keptMessage =
        keptTemporaryPositionIds.length === 0
            ? ""
            : ` "${employeeId}" stays assigned temporarily to ${keptTemporaryPositionIds.join(", ")}.`
    const changedPositionIds = [
        ...filledPositionIds,
        ...handedOverPositionIds,
        ...endedTemporaryPositionIds,
    ]
    if (changedPositionIds.length === 0) {
        return `"${employeeId}" fills no position: nothing to replace.${keptMessage}`
    }
    const roleMessages: string[] = []
    if (filledPositionIds.length > 0) {
        roleMessages.push(
            `as default employee of ${filledPositionIds.join(", ")}`,
        )
    }
    if (handedOverPositionIds.length > 0) {
        roleMessages.push(
            `as temporary assignee of ${handedOverPositionIds.join(", ")}`,
        )
    }
    const replacedMessage =
        roleMessages.length === 0
            ? `"${replacementId}" already works by default what "${employeeId}" covered`
            : `"${replacementId}" replaces "${employeeId}" ${roleMessages.join(" and ")}`
    const endedMessage =
        endedTemporaryPositionIds.length === 0
            ? ""
            : ` Temporary assignments ended: ${endedTemporaryPositionIds.join(", ")}.`
    return `${replacedMessage}; "${employeeId}" stays hired.${endedMessage}${keptMessage}`
}

function formatDeletedMessage({
    employee,
    vacatedPositionIds,
    endedTemporaryPositionIds,
}: EmployeeDeletion): string {
    const changeMessages: string[] = []
    if (vacatedPositionIds.length > 0) {
        changeMessages.push(`now vacant: ${vacatedPositionIds.join(", ")}`)
    }
    if (endedTemporaryPositionIds.length > 0) {
        changeMessages.push(
            `temporary assignments ended: ${endedTemporaryPositionIds.join(", ")}`,
        )
    }
    return changeMessages.length === 0
        ? `Deleted employee "${employee.id}".`
        : `Deleted employee "${employee.id}"; ${changeMessages.join("; ")}.`
}

function reuseIdOption() {
    return new Option(
        "-r, --reuse-id",
        "give the id even if an earlier employee had it, in threads or as a former id",
    )
}

export function registerEmployeeCommands(program: Command): void {
    const employeeCommand = program
        .command("employee")
        .description("Manage the employees of the company.")

    const createEmployeeCommand = employeeCommand
        .command("create")
        .alias("hire")
        .description("Create (hire) an employee: an LLM or a human.")
        .hook("preAction", requireDirector)

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

    employeeCommand
        .command("list")
        .description("List the employees.")
        .option(
            "-p, --positions",
            "also list the positions each employee fills",
        )
        .action(async ({ positions: withPositions }) => {
            await requireCompany(projectRoot)
            const [employees, positions] = await Promise.all([
                listEmployees(projectRoot),
                withPositions ? listPositions(projectRoot) : [],
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
                    return withPositions
                        ? [...row, positionsFilledBy(positions, employee.id)]
                        : row
                }),
            )
        })

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
                `positions: ${positionsFilledBy(positions, employee.id)}`,
            )
            console.log(lines.join("\n"))
        })

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

    employeeCommand
        .command("update-id")
        .description(
            "Change the id of an employee and of the positions it fills.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .argument(
            "<new-employee-id>",
            formatNewIdArgumentDescription("employee", "claude-lead"),
        )
        .addOption(reuseIdOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, rawNewId, { reuseId }) => {
            const renaming = await updateEmployeeId(
                projectRoot,
                rawId,
                rawNewId,
                { shouldReuseId: reuseId },
            )
            console.log(formatRenamedMessage(renaming))
        })

    employeeCommand
        .command("replace")
        .alias("hand-over")
        .description(
            "Replace (hand over) an employee by another in every position it fills by default. It stays hired, and keeps its temporary assignments unless --temporary.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .argument(
            "<replacement-id>",
            "id of the employee taking its positions over (e.g. omar)",
        )
        .option("-t, --temporary", "also hand over its temporary assignments")
        .hook("preAction", requireDirector)
        .action(async (rawId, rawReplacementId, options) => {
            const replacement = await replaceEmployee(
                projectRoot,
                rawId,
                rawReplacementId,
                { shouldHandOverTemporaryAssignments: options.temporary },
            )
            console.log(formatReplacedMessage(replacement))
        })

    employeeCommand
        .command("delete")
        .alias("fire")
        .description("Delete (fire) an employee.")
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .option(
            "-f, --force",
            "delete it even if it fills positions, leaving them vacant, or works them temporarily, ending these assignments",
        )
        .hook("preAction", requireDirector)
        .action(async (rawId, { force: shouldForce }) => {
            const deletion = await deleteEmployee(projectRoot, rawId, {
                shouldForce,
            })
            console.log(formatDeletedMessage(deletion))
        })
}
