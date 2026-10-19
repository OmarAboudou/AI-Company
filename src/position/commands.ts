import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    descriptionFileOption,
    idDescription,
    loadExistingEmployee,
    loadExistingPosition,
    newIdDescription,
    parseId,
    printColumns,
    projectRoot,
    readTextOrFile,
    requireAnOption,
    requireCompany,
    withoutUndefined,
} from "../cli-helpers.ts"
import { loadCompany, saveCompany } from "../company/storage.ts"
import { UserError } from "../errors.ts"
import { withNewId } from "../id-history.ts"
import { readArchives } from "../thread/archives.ts"
import { awaitedIds } from "../thread/members.ts"
import { PositionConfigSchema, type Worker } from "./position.ts"
import {
    copyPosition,
    deletePosition,
    listPositions,
    loadPositionState,
    positionExists,
    savePosition,
    savePositionState,
} from "./storage.ts"

function workerName(assignment: Worker): string {
    return assignment.kind === "directors"
        ? "the directors"
        : `"${assignment.employeeId}"`
}

function temporaryHolder(assignment: Worker, directors: string): string {
    return assignment.kind === "directors" ? directors : assignment.employeeId
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
            idDescription("position", "backend-developer"),
        )
        .requiredOption("-t, --title <title>", "position title")
        .option(
            "-d, --description <text>",
            "what the position is responsible for",
            "",
        )
        .addOption(descriptionFileOption())
        .action(async (rawId, { title, description, descriptionFile }) => {
            await requireCompany()
            const id = parseId("position", rawId)
            if (await positionExists(projectRoot, id)) {
                throw new UserError(`Position "${id}" already exists.`)
            }
            const config = PositionConfigSchema.safeParse({ title })
            if (!config.success) {
                throw new UserError(z.prettifyError(config.error))
            }
            await savePosition(projectRoot, {
                id,
                ...config.data,
                createdAt: new Date().toISOString(),
                description: await readTextOrFile(description, descriptionFile),
            })
            console.log(`Created position "${id}".`)
        })

    positionCommand
        .command("list")
        .description(
            "List the positions, their default employees and their temporary assignments.",
        )
        .action(async () => {
            await requireCompany()
            const [positions, company] = await Promise.all([
                listPositions(projectRoot),
                loadCompany(projectRoot),
            ])
            const rows = await Promise.all(
                positions.map(async ({ id, title, defaultEmployeeId }) => {
                    const row = [
                        id,
                        title,
                        id === company.directorPositionId
                            ? "(git users)"
                            : (defaultEmployeeId ?? "(vacant)"),
                    ]
                    const { temporaryAssignment } = await loadPositionState(
                        projectRoot,
                        id,
                    )
                    return temporaryAssignment === undefined
                        ? row
                        : [
                              ...row,
                              `temporarily: ${temporaryHolder(temporaryAssignment, "(git users)")}`,
                          ]
                }),
            )
            printColumns(rows)
        })

    positionCommand
        .command("show")
        .description(
            "Display a position: title, default employee, temporary assignment and description.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany()
            const [position, company, { temporaryAssignment }] =
                await Promise.all([
                    loadExistingPosition(rawId),
                    loadCompany(projectRoot),
                    loadPositionState(projectRoot, parseId("position", rawId)),
                ])
            const holders = [
                position.id === company.directorPositionId
                    ? "held by: the repository's git users"
                    : `default employee: ${position.defaultEmployeeId ?? "(vacant)"}`,
            ]
            if (temporaryAssignment !== undefined) {
                holders.push(
                    `temporarily worked by: ${temporaryHolder(temporaryAssignment, "the repository's git users")}`,
                )
            }
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
            idDescription("position", "backend-developer"),
        )
        .option("-t, --title <title>", "position title")
        .option(
            "-d, --description <text>",
            "what the position is responsible for",
        )
        .addOption(descriptionFileOption())
        .action(async (rawId, options) => {
            requireAnOption(options)
            await requireCompany()
            const { id, description, createdAt, formerIds, ...current } =
                await loadExistingPosition(rawId)
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
            idDescription("position", "backend-developer"),
        )
        .argument(
            "<new-position-id>",
            newIdDescription("position", "api-developer"),
        )
        .action(async (rawId, rawNewId) => {
            await requireCompany()
            const newId = parseId("position", rawNewId)
            const [position, taken, company] = await Promise.all([
                loadExistingPosition(rawId),
                positionExists(projectRoot, newId),
                loadCompany(projectRoot),
            ])
            if (taken) {
                throw new UserError(`Position "${newId}" already exists.`)
            }
            // Copy, repoint, then delete rather than move, as for employees:
            // the company must never name a missing director's position.
            await copyPosition(projectRoot, position.id, newId)
            await savePosition(
                projectRoot,
                withNewId(position, newId, new Date().toISOString()),
            )
            if (company.directorPositionId === position.id) {
                await saveCompany(projectRoot, {
                    ...company,
                    directorPositionId: newId,
                })
            }
            await deletePosition(projectRoot, position.id)
            console.log(`Position "${position.id}" is now "${newId}".`)
        })

    positionCommand
        .command("assign")
        .description(
            "Set the default employee of a position, except the director's.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .argument("<employee-id>", idDescription("employee", "claude-senior"))
        .option("-r, --replace", "replace the current default employee")
        .action(async (rawPositionId, rawEmployeeId, { replace }) => {
            await requireCompany()
            const [position, employee, company] = await Promise.all([
                loadExistingPosition(rawPositionId),
                loadExistingEmployee(rawEmployeeId),
                loadCompany(projectRoot),
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
            await savePosition(projectRoot, {
                ...position,
                defaultEmployeeId: employee.id,
            })
            console.log(
                previous === undefined
                    ? `"${employee.id}" is now the default employee of position "${position.id}".`
                    : `"${employee.id}" replaces "${previous}" as the default employee of position "${position.id}".`,
            )
        })

    positionCommand
        .command("unassign")
        .description(
            "Remove the default employee of a position, leaving it vacant.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany()
            const { defaultEmployeeId, ...position } =
                await loadExistingPosition(rawId)
            if (defaultEmployeeId === undefined) {
                console.log(`Position "${position.id}" is already vacant.`)
                return
            }
            await savePosition(projectRoot, position)
            console.log(
                `Position "${position.id}" is now vacant: "${defaultEmployeeId}" is no longer its default employee.`,
            )
        })

    positionCommand
        .command("assign-temporarily")
        .alias("interim")
        .description(
            "Assign a position temporarily to an employee, or without one to the directors, until unassign-temporarily. Its default employee doesn't change.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .argument(
            "[employee-id]",
            "id of the employee working the position meanwhile (e.g. julie); without it, the directors work it themselves",
        )
        .option("-r, --replace", "replace the current temporary assignment")
        .action(async (rawPositionId, rawEmployeeId, { replace }) => {
            await requireCompany()
            const [position, employee, company, state] = await Promise.all([
                loadExistingPosition(rawPositionId),
                rawEmployeeId === undefined
                    ? undefined
                    : loadExistingEmployee(rawEmployeeId),
                loadCompany(projectRoot),
                loadPositionState(
                    projectRoot,
                    parseId("position", rawPositionId),
                ),
            ])
            if (position.id === company.directorPositionId) {
                throw new UserError(
                    `Position "${position.id}" is the director's position: the people working on this repository always hold it.`,
                )
            }
            const current = state.temporaryAssignment
            if (
                employee !== undefined &&
                employee.id === position.defaultEmployeeId
            ) {
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
        })

    positionCommand
        .command("unassign-temporarily")
        .alias("end-interim")
        .description(
            "End the temporary assignment of a position: its default employee works it again, or nobody if it is vacant.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany()
            const [position, { temporaryAssignment, ...state }] =
                await Promise.all([
                    loadExistingPosition(rawId),
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
            idDescription("position", "backend-developer"),
        )
        .option("-f, --force", "delete it even if threads await it")
        .action(async (rawId, { force }) => {
            await requireCompany()
            const [position, company, positions, archives] = await Promise.all([
                loadExistingPosition(rawId),
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
            await deletePosition(projectRoot, position.id)
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
