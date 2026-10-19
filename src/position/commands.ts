import { type Command, Option } from "@commander-js/extra-typings"
import { z } from "zod"
import { createDescriptionFileOption } from "../cli/create-description-file-option.ts"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { readTextOrFile } from "../cli/read-text-or-file.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { loadExistingEmployee, withoutUndefined } from "../cli-helpers.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadCompany, saveCompany } from "../company/storage.ts"
import { requireDirector } from "../human/current-human.ts"
import { getRenamedEntity } from "../ids/get-renamed-entity.ts"
import { parseId } from "../ids/parse-id.ts"
import { loadExistingPosition } from "../organization/position/load-existing-position.ts"
import {
    type Position,
    PositionConfigSchema,
    type PositionState,
    type Worker,
} from "../organization/position/schema.ts"
import {
    copyPositionFolder,
    deletePositionFolder,
    deletePositionState,
    hasPosition,
    listPositions,
    loadPositionState,
    savePosition,
    savePositionState,
} from "../organization/position/storage.ts"
import { readArchives } from "../thread/archives.ts"
import { awaitedIds } from "../thread/members.ts"
import { UserError } from "../user-error.ts"

function workerName(assignment: Worker): string {
    return assignment.kind === "directors"
        ? "the directors"
        : `"${assignment.employeeId}"`
}

function stillTemporary(worker: Worker | undefined): string {
    return worker === undefined
        ? ""
        : ` It stays assigned temporarily to ${workerName(worker)}.`
}

function currentEmployeeInList(
    { defaultEmployeeId }: Position,
    { temporaryAssignment }: PositionState,
): string {
    if (temporaryAssignment === undefined) {
        return defaultEmployeeId ?? "(vacant)"
    }
    const temporarily =
        defaultEmployeeId === undefined
            ? "temporarily"
            : `temporarily; default: ${defaultEmployeeId}`
    return temporaryAssignment.kind === "directors"
        ? `(git users, ${temporarily})`
        : `${temporaryAssignment.employeeId} (${temporarily})`
}

function currentEmployeeInShow(
    { defaultEmployeeId }: Position,
    temporaryAssignment: Worker | undefined,
): string {
    if (temporaryAssignment === undefined) {
        return defaultEmployeeId ?? "(vacant)"
    }
    return temporaryAssignment.kind === "directors"
        ? "the repository's git users (temporarily)"
        : `${temporaryAssignment.employeeId} (temporarily)`
}

function replaceTemporaryOption() {
    return new Option(
        "-r, --replace",
        "replace the current temporary assignment",
    )
}

type Assignee =
    | { kind: "employee"; rawEmployeeId: string }
    | { kind: "directors" }

async function assignTemporarily(
    rawPositionId: string,
    assignee: Assignee,
    replace: boolean | undefined,
): Promise<void> {
    await requireCompany(projectRoot)
    const [position, employee, company, state] = await Promise.all([
        loadExistingPosition(projectRoot, rawPositionId),
        assignee.kind === "employee"
            ? loadExistingEmployee(assignee.rawEmployeeId)
            : undefined,
        loadCompany(projectRoot),
        loadPositionState(projectRoot, parseId("position", rawPositionId)),
    ])
    if (position.id === company.directorPositionId) {
        throw new UserError(
            `Position "${position.id}" is the director's position: the people working on this repository always hold it.`,
        )
    }
    const current = state.temporaryAssignment
    if (employee !== undefined && employee.id === position.defaultEmployeeId) {
        if (current !== undefined) {
            throw new UserError(
                `"${employee.id}" is the default employee of position "${position.id}": run \`llmco position unassign-temporarily ${position.id}\` to give the position back to it.`,
            )
        }
        console.log(
            `"${employee.id}" already works position "${position.id}", as its default employee.`,
        )
        return
    }
    const assignment: Worker =
        employee === undefined
            ? { kind: "directors" }
            : { kind: "employee", employeeId: employee.id }
    if (current !== undefined && Bun.deepEquals(current, assignment)) {
        console.log(
            `Position "${position.id}" is already assigned temporarily to ${workerName(assignment)}.`,
        )
        return
    }
    if (current !== undefined && !replace) {
        throw new UserError(
            `Position "${position.id}" is already assigned temporarily to ${workerName(current)}. Add --replace to replace it.`,
        )
    }
    await savePositionState(projectRoot, position.id, {
        ...state,
        temporaryAssignment: assignment,
    })
    const assigned = `Position "${position.id}" is now assigned temporarily to ${workerName(assignment)}`
    console.log(
        current === undefined
            ? `${assigned}.`
            : `${assigned} instead of ${workerName(current)}.`,
    )
}

export function registerPositionCommands(program: Command): void {
    const positionCommand = program
        .command("position")
        .description("Manage the positions of the company.")

    positionCommand
        .command("create")
        .alias("open")
        .description("Create (open) a position.")
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .requiredOption("-t, --title <title>", "position title")
        .option(
            "-d, --description <text>",
            "what the position is responsible for",
            "",
        )
        .addOption(createDescriptionFileOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, { title, description, descriptionFile }) => {
            await requireCompany(projectRoot)
            const id = parseId("position", rawId)
            if (await hasPosition(projectRoot, id)) {
                throw new UserError(`Position "${id}" already exists.`)
            }
            const config = PositionConfigSchema.safeParse({ title })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            const text = await readTextOrFile(description, descriptionFile)
            await Promise.all([
                savePosition(projectRoot, {
                    id,
                    ...config.data,
                    createdAt: new Date().toISOString(),
                    description: text,
                }),
                deletePositionState(projectRoot, id),
            ])
            console.log(`Created position "${id}".`)
        })

    positionCommand
        .command("list")
        .description(
            "List the positions and who works each now: its default employee, or whoever it is assigned to temporarily.",
        )
        .action(async () => {
            await requireCompany(projectRoot)
            const [positions, company] = await Promise.all([
                listPositions(projectRoot),
                loadCompany(projectRoot),
            ])
            const rows = await Promise.all(
                positions.map(async (position) => {
                    const state = await loadPositionState(
                        projectRoot,
                        position.id,
                    )
                    const current =
                        position.id === company.directorPositionId
                            ? "(git users)"
                            : currentEmployeeInList(position, state)
                    return [position.id, position.title, current]
                }),
            )
            printColumns(rows)
        })

    positionCommand
        .command("show")
        .description(
            "Display a position: title, current and default employees, and description.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany(projectRoot)
            const [position, company, { temporaryAssignment }] =
                await Promise.all([
                    loadExistingPosition(projectRoot, rawId),
                    loadCompany(projectRoot),
                    loadPositionState(projectRoot, parseId("position", rawId)),
                ])
            const holders =
                position.id === company.directorPositionId
                    ? ["held by: the repository's git users"]
                    : [
                          `current employee: ${currentEmployeeInShow(position, temporaryAssignment)}`,
                          `default employee: ${position.defaultEmployeeId ?? "(none)"}`,
                      ]
            console.log(
                `# ${position.title}\n\n${holders.join("\n")}\n\n${position.description}`,
            )
        })

    positionCommand
        .command("update")
        .description(
            "Update a position: only the options given change. Its default employee changes with assign and unassign.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .option("-t, --title <title>", "position title")
        .option(
            "-d, --description <text>",
            "what the position is responsible for",
        )
        .addOption(createDescriptionFileOption())
        .hook("preAction", requireDirector)
        .action(async (rawId, options) => {
            requireAtLeastOneOption(options)
            await requireCompany(projectRoot)
            const { id, description, createdAt, formerIds, ...current } =
                await loadExistingPosition(projectRoot, rawId)
            const newDescription = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const config = PositionConfigSchema.safeParse({
                ...current,
                ...withoutUndefined({ title: options.title }),
            })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await savePosition(projectRoot, {
                id,
                ...config.data,
                createdAt,
                formerIds,
                description: newDescription ?? description,
            })
            console.log(`Updated position "${id}".`)
        })

    positionCommand
        .command("update-id")
        .description(
            "Change the id of a position, which renames its folder. For the director's position, the company follows.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<new-position-id>",
            formatNewIdArgumentDescription("position", "api-developer"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawId, rawNewId) => {
            await requireCompany(projectRoot)
            const newId = parseId("position", rawNewId)
            const [position, taken, company, state] = await Promise.all([
                loadExistingPosition(projectRoot, rawId),
                hasPosition(projectRoot, newId),
                loadCompany(projectRoot),
                loadPositionState(projectRoot, parseId("position", rawId)),
            ])
            if (taken) {
                throw new UserError(`Position "${newId}" already exists.`)
            }
            // Copy, repoint, then delete rather than move, as for employees:
            // the company must never name a missing director's position.
            await copyPositionFolder(projectRoot, position.id, newId)
            await Promise.all([
                savePosition(
                    projectRoot,
                    getRenamedEntity(position, newId, new Date().toISOString()),
                ),
                savePositionState(projectRoot, newId, state),
            ])
            if (company.directorPositionId === position.id) {
                await saveCompany(projectRoot, {
                    ...company,
                    directorPositionId: newId,
                })
            }
            await Promise.all([
                deletePositionFolder(projectRoot, position.id),
                deletePositionState(projectRoot, position.id),
            ])
            console.log(`Position "${position.id}" is now "${newId}".`)
        })

    positionCommand
        .command("assign")
        .description(
            "Set the default employee of a position, except the director's. Assigning its temporary assignee ends the temporary assignment.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "claude-senior"),
        )
        .option("-r, --replace", "replace the current default employee")
        .hook("preAction", requireDirector)
        .action(async (rawPositionId, rawEmployeeId, { replace }) => {
            await requireCompany(projectRoot)
            const [position, employee, company, state] = await Promise.all([
                loadExistingPosition(projectRoot, rawPositionId),
                loadExistingEmployee(rawEmployeeId),
                loadCompany(projectRoot),
                loadPositionState(
                    projectRoot,
                    parseId("position", rawPositionId),
                ),
            ])
            if (position.id === company.directorPositionId) {
                throw new UserError(
                    `Position "${position.id}" is the director's position: the people working on this repository hold it, identified by git, not an employee.`,
                )
            }
            const previous = position.defaultEmployeeId
            if (previous === employee.id) {
                console.log(
                    `"${employee.id}" is already the default employee of position "${position.id}".`,
                )
                return
            }
            if (previous !== undefined && !replace) {
                throw new UserError(
                    `Position "${position.id}" already has "${previous}" as default employee. Add --replace to replace it.`,
                )
            }
            const { temporaryAssignment, ...otherState } = state
            const confirmed =
                temporaryAssignment?.kind === "employee" &&
                temporaryAssignment.employeeId === employee.id
            await Promise.all([
                savePosition(projectRoot, {
                    ...position,
                    defaultEmployeeId: employee.id,
                }),
                confirmed
                    ? savePositionState(projectRoot, position.id, otherState)
                    : undefined,
            ])
            const assigned =
                previous === undefined
                    ? `"${employee.id}" is now the default employee of position "${position.id}"`
                    : `"${employee.id}" replaces "${previous}" as the default employee of position "${position.id}"`
            console.log(
                confirmed
                    ? `${assigned}, which ends its temporary assignment.`
                    : `${assigned}.${stillTemporary(temporaryAssignment)}`,
            )
        })

    positionCommand
        .command("unassign")
        .description(
            "Remove the default employee of a position, leaving it vacant.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawId) => {
            await requireCompany(projectRoot)
            const [
                { defaultEmployeeId, ...position },
                { temporaryAssignment },
            ] = await Promise.all([
                loadExistingPosition(projectRoot, rawId),
                loadPositionState(projectRoot, parseId("position", rawId)),
            ])
            if (defaultEmployeeId === undefined) {
                console.log(`Position "${position.id}" is already vacant.`)
                return
            }
            await savePosition(projectRoot, position)
            console.log(
                `Position "${position.id}" is now vacant: "${defaultEmployeeId}" is no longer its default employee.${stillTemporary(temporaryAssignment)}`,
            )
        })

    const assignTemporarilyCommand = positionCommand
        .command("assign-temporarily")
        .alias("interim")
        .description(
            "Assign a position temporarily, until unassign-temporarily: to an employee, or to the directors themselves. Its default employee doesn't change.",
        )
        .hook("preAction", requireDirector)

    assignTemporarilyCommand
        .command("employee")
        .description("Assign a position temporarily to an employee.")
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "julie"),
        )
        .addOption(replaceTemporaryOption())
        .action(async (rawPositionId, rawEmployeeId, { replace }) => {
            await assignTemporarily(
                rawPositionId,
                { kind: "employee", rawEmployeeId },
                replace,
            )
        })

    assignTemporarilyCommand
        .command("directors")
        .description(
            "Assign a position temporarily to the directors: the people working on the repository cover it themselves, without an employee.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .addOption(replaceTemporaryOption())
        .action(async (rawPositionId, { replace }) => {
            await assignTemporarily(
                rawPositionId,
                { kind: "directors" },
                replace,
            )
        })

    positionCommand
        .command("unassign-temporarily")
        .alias("end-interim")
        .description(
            "End the temporary assignment of a position: its default employee works it again, or nobody if it is vacant.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .hook("preAction", requireDirector)
        .action(async (rawId) => {
            await requireCompany(projectRoot)
            const [position, { temporaryAssignment, ...state }] =
                await Promise.all([
                    loadExistingPosition(projectRoot, rawId),
                    loadPositionState(projectRoot, parseId("position", rawId)),
                ])
            if (temporaryAssignment === undefined) {
                console.log(
                    `Position "${position.id}" isn't assigned temporarily.`,
                )
                return
            }
            await savePositionState(projectRoot, position.id, state)
            const back =
                position.defaultEmployeeId === undefined
                    ? "it is vacant again"
                    : `its default employee "${position.defaultEmployeeId}" works it again`
            console.log(
                `Position "${position.id}" is no longer assigned temporarily to ${workerName(temporaryAssignment)}: ${back}.`,
            )
        })

    positionCommand
        .command("delete")
        .alias("close")
        .description(
            "Delete (close) a position, except the director's. Its default employee stays hired. Refused while threads await it, unless --force.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .option("-f, --force", "delete it even if threads await it")
        .hook("preAction", requireDirector)
        .action(async (rawId, { force }) => {
            await requireCompany(projectRoot)
            const [position, company, positions, archives] = await Promise.all([
                loadExistingPosition(projectRoot, rawId),
                loadCompany(projectRoot),
                listPositions(projectRoot),
                readArchives(projectRoot),
            ])
            if (company.directorPositionId === position.id) {
                throw new UserError(
                    `Position "${position.id}" is the director's position: it can't be deleted.`,
                )
            }
            const awaiting = archives
                .filter(({ thread, messages }) =>
                    awaitedIds(thread, messages, positions).includes(
                        position.id,
                    ),
                )
                .map(({ thread }) => thread.id)
                .join(", ")
            if (awaiting !== "" && !force) {
                throw new UserError(
                    `Position "${position.id}" is awaited in these threads: ${awaiting}. Add --force to delete it anyway; they will keep awaiting it.`,
                )
            }
            await Promise.all([
                deletePositionFolder(projectRoot, position.id),
                deletePositionState(projectRoot, position.id),
            ])
            const deleted =
                position.defaultEmployeeId === undefined
                    ? `Deleted position "${position.id}"`
                    : `Deleted position "${position.id}"; its default employee "${position.defaultEmployeeId}" stays hired`
            console.log(
                awaiting === ""
                    ? `${deleted}.`
                    : `${deleted}. Still awaited in: ${awaiting}.`,
            )
        })
}
