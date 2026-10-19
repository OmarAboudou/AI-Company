import { type Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireDirector } from "../cli/require-director.ts"
import { withoutUndefined } from "../cli-helpers.ts"
import { requireCompany } from "../company/require-company.ts"
import { getRenamedEntity } from "../ids/get-renamed-entity.ts"
import { isAuthorOf } from "../ids/is-author-of.ts"
import { parseId } from "../ids/parse-id.ts"
import { loadExistingLlmModel } from "../llm-model/load-existing-llm-model.ts"
import { loadExistingEmployee } from "../organization/employee/load-existing-employee.ts"
import {
    type Employee,
    type EmployeeConfig,
    EmployeeConfigSchema,
} from "../organization/employee/schema.ts"
import {
    copyEmployeeFolder,
    deleteEmployeeFolder,
    hasEmployee,
    listEmployees,
    saveEmployee,
} from "../organization/employee/storage.ts"
import type {
    Position,
    PositionState,
} from "../organization/position/schema.ts"
import {
    listPositions,
    loadPositionState,
    savePosition,
    savePositionState,
} from "../organization/position/storage.ts"
import { readArchives } from "../thread/archives.ts"
import { UserError } from "../user-error.ts"

function filledPositions(
    positions: Position[],
    employeeId: string,
): Position[] {
    return positions.filter(
        ({ defaultEmployeeId }) => defaultEmployeeId === employeeId,
    )
}

type TemporaryPosition = { position: Position; state: PositionState }

async function positionsWorkedTemporarily(
    positions: Position[],
    employeeId: string,
): Promise<TemporaryPosition[]> {
    const states = await Promise.all(
        positions.map(async (position) => ({
            position,
            state: await loadPositionState(projectRoot, position.id),
        })),
    )
    return states.filter(
        ({ state: { temporaryAssignment: worker } }) =>
            worker?.kind === "employee" && worker.employeeId === employeeId,
    )
}

function positionsFilledBy(positions: Position[], employeeId: string): string {
    const ids = filledPositions(positions, employeeId).map(({ id }) => id)
    return ids.length > 0 ? ids.join(", ") : "(none)"
}

async function requireLlmModel(config: EmployeeConfig): Promise<void> {
    if (config.kind === "llm") {
        await loadExistingLlmModel(
            projectRoot,
            config.providerId,
            config.modelId,
        )
    }
}

async function earlierUses(id: string, renamed?: Employee): Promise<string[]> {
    const [employees, archives] = await Promise.all([
        listEmployees(projectRoot),
        readArchives(projectRoot),
    ])
    const formerIdOf = employees
        .filter(
            (employee) =>
                employee.id !== renamed?.id &&
                employee.formerIds?.some((former) => former.id === id),
        )
        .map((employee) => `as a former id of employee "${employee.id}"`)
    const threads = archives
        .filter(({ thread, messages }) => {
            const creator = {
                employee: thread.createdBy.employee,
                sentAt: thread.createdAt,
            }
            return [creator, ...messages].some(
                (author) =>
                    author.employee?.id === id &&
                    !(renamed !== undefined && isAuthorOf(renamed, author)),
            )
        })
        .map(({ thread }) => `in thread "${thread.id}"`)
    return [...formerIdOf, ...threads]
}

async function requireUnusedId(
    id: string,
    reuseId: boolean | undefined,
    renamed?: Employee,
): Promise<void> {
    const uses = reuseId ? [] : await earlierUses(id, renamed)
    if (uses.length > 0) {
        throw new UserError(
            `Employee id "${id}" was used before: ${uses.join(", ")}. An employee is a person, and the archives would name two people the same way: add --reuse-id to reuse it anyway.`,
        )
    }
}

function reuseIdOption() {
    return new Option(
        "-r, --reuse-id",
        "give the id even if an earlier employee had it, in threads or as a former id",
    )
}

async function createEmployee(
    rawId: string,
    config: unknown,
    reuseId: boolean | undefined,
): Promise<void> {
    await requireCompany(projectRoot)
    const id = parseId("employee", rawId)
    const result = EmployeeConfigSchema.safeParse(config)
    if (!result.success) {
        throw new UserError(z.prettifyError(result.error))
    }
    const [exists] = await Promise.all([
        hasEmployee(projectRoot, id),
        requireLlmModel(result.data),
    ])
    if (exists) {
        throw new UserError(`Employee "${id}" already exists.`)
    }
    await requireUnusedId(id, reuseId)
    await saveEmployee(projectRoot, {
        id,
        ...result.data,
        createdAt: new Date().toISOString(),
    })
    console.log(`Created employee "${id}".`)
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
            await createEmployee(
                rawId,
                { name, kind: "llm", providerId: provider, modelId: model },
                reuseId,
            )
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
            await createEmployee(rawId, { name, kind: "human" }, reuseId)
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
            await requireCompany(projectRoot)
            const { id, createdAt, formerIds, ...current } =
                await loadExistingEmployee(projectRoot, rawId)
            const llmOptions = [options.provider, options.model]
            if (
                current.kind === "human" &&
                llmOptions.some((option) => option !== undefined)
            ) {
                throw new UserError(
                    `Employee "${id}" is a human: it has no provider or model.`,
                )
            }
            const result = EmployeeConfigSchema.safeParse({
                ...current,
                ...withoutUndefined({
                    name: options.name,
                    providerId: options.provider,
                    modelId: options.model,
                }),
            })
            if (!result.success) {
                throw new UserError(z.prettifyError(result.error))
            }
            await requireLlmModel(result.data)
            await saveEmployee(projectRoot, {
                id,
                ...result.data,
                createdAt,
                formerIds,
            })
            console.log(`Updated employee "${id}".`)
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
            await requireCompany(projectRoot)
            const newId = parseId("employee", rawNewId)
            const [employee, taken, positions] = await Promise.all([
                loadExistingEmployee(projectRoot, rawId),
                hasEmployee(projectRoot, newId),
                listPositions(projectRoot),
            ])
            if (taken) {
                throw new UserError(`Employee "${newId}" already exists.`)
            }
            const [, temporary] = await Promise.all([
                requireUnusedId(newId, reuseId, employee),
                positionsWorkedTemporarily(positions, employee.id),
            ])
            const filled = filledPositions(positions, employee.id)
            // Copy, repoint, then delete rather than move, so that an
            // interrupted command never leaves a position naming a missing
            // employee: at worst, the employee exists twice.
            await copyEmployeeFolder(projectRoot, employee.id, newId)
            await saveEmployee(
                projectRoot,
                getRenamedEntity(employee, newId, new Date().toISOString()),
            )
            await Promise.all([
                ...filled.map((position) =>
                    savePosition(projectRoot, {
                        ...position,
                        defaultEmployeeId: newId,
                    }),
                ),
                ...temporary.map(({ position, state }) =>
                    savePositionState(projectRoot, position.id, {
                        ...state,
                        temporaryAssignment: {
                            kind: "employee",
                            employeeId: newId,
                        },
                    }),
                ),
            ])
            await deleteEmployeeFolder(projectRoot, employee.id)
            const updated = [
                ...filled.map(({ id }) => id),
                ...temporary.map(
                    ({ position }) => `${position.id} (temporarily)`,
                ),
            ]
            const renamed = `Employee "${employee.id}" is now "${newId}"`
            console.log(
                updated.length === 0
                    ? `${renamed}.`
                    : `${renamed}; updated positions: ${updated.join(", ")}.`,
            )
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
        .action(async (rawId, rawReplacementId, { temporary }) => {
            await requireCompany(projectRoot)
            const [employee, replacement, positions] = await Promise.all([
                loadExistingEmployee(projectRoot, rawId),
                loadExistingEmployee(projectRoot, rawReplacementId),
                listPositions(projectRoot),
            ])
            if (replacement.id === employee.id) {
                throw new UserError(`"${employee.id}" can't replace itself.`)
            }
            const filled = filledPositions(positions, employee.id)
            const [kept, confirmed] = await Promise.all([
                positionsWorkedTemporarily(positions, employee.id),
                positionsWorkedTemporarily(filled, replacement.id),
            ])
            const handedOver = temporary ? kept : []
            const isDefault = ({ position }: TemporaryPosition) =>
                position.defaultEmployeeId === replacement.id
            const ending = [...confirmed, ...handedOver.filter(isDefault)]
            const moving = handedOver.filter((handed) => !isDefault(handed))
            const ids = (temporaries: TemporaryPosition[]) =>
                temporaries.map(({ position }) => position.id).join(", ")
            const stillTemporary =
                kept.length === 0 || temporary
                    ? ""
                    : ` "${employee.id}" stays assigned temporarily to ${ids(kept)}.`
            if (filled.length === 0 && handedOver.length === 0) {
                console.log(
                    `"${employee.id}" fills no position: nothing to replace.${stillTemporary}`,
                )
                return
            }
            await Promise.all([
                ...filled.map((position) =>
                    savePosition(projectRoot, {
                        ...position,
                        defaultEmployeeId: replacement.id,
                    }),
                ),
                ...ending.map(
                    ({ position, state: { temporaryAssignment, ...state } }) =>
                        savePositionState(projectRoot, position.id, state),
                ),
                ...moving.map(({ position, state }) =>
                    savePositionState(projectRoot, position.id, {
                        ...state,
                        temporaryAssignment: {
                            kind: "employee",
                            employeeId: replacement.id,
                        },
                    }),
                ),
            ])
            const roles: string[] = []
            if (filled.length > 0) {
                roles.push(
                    `as default employee of ${filled.map(({ id }) => id).join(", ")}`,
                )
            }
            if (moving.length > 0) {
                roles.push(`as temporary assignee of ${ids(moving)}`)
            }
            const replaced =
                roles.length === 0
                    ? `"${replacement.id}" already works by default what "${employee.id}" covered`
                    : `"${replacement.id}" replaces "${employee.id}" ${roles.join(" and ")}`
            const ended =
                ending.length === 0
                    ? ""
                    : ` Temporary assignments ended: ${ids(ending)}.`
            console.log(
                `${replaced}; "${employee.id}" stays hired.${ended}${stillTemporary}`,
            )
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
        .action(async (rawId, { force }) => {
            await requireCompany(projectRoot)
            const [employee, positions] = await Promise.all([
                loadExistingEmployee(projectRoot, rawId),
                listPositions(projectRoot),
            ])
            const filled = filledPositions(positions, employee.id)
            const temporary = await positionsWorkedTemporarily(
                positions,
                employee.id,
            )
            const filledIds = filled.map(({ id }) => id).join(", ")
            const temporaryIds = temporary
                .map(({ position }) => position.id)
                .join(", ")
            const facts: string[] = []
            const effects: string[] = []
            const done: string[] = []
            if (filled.length > 0) {
                facts.push(`is the default employee of ${filledIds}`)
                effects.push(`leave ${filledIds} vacant`)
                done.push(`now vacant: ${filledIds}`)
            }
            if (temporary.length > 0) {
                facts.push(`is assigned temporarily to ${temporaryIds}`)
                effects.push(`end these temporary assignments`)
                done.push(`temporary assignments ended: ${temporaryIds}`)
            }
            if (facts.length > 0 && !force) {
                const actions = ["delete it anyway", ...effects]
                throw new UserError(
                    `Employee "${employee.id}" ${facts.join(" and ")}. Add --force to ${actions.slice(0, -1).join(", ")} and ${actions.at(-1)}.`,
                )
            }
            await Promise.all([
                ...filled.map(({ defaultEmployeeId, ...position }) =>
                    savePosition(projectRoot, position),
                ),
                ...temporary.map(
                    ({ position, state: { temporaryAssignment, ...state } }) =>
                        savePositionState(projectRoot, position.id, state),
                ),
            ])
            await deleteEmployeeFolder(projectRoot, employee.id)
            console.log(
                done.length === 0
                    ? `Deleted employee "${employee.id}".`
                    : `Deleted employee "${employee.id}"; ${done.join("; ")}.`,
            )
        })
}
