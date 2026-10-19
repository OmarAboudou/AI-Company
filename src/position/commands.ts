import { type Command, Option } from "@commander-js/extra-typings"
import { createDescriptionFileOption } from "../cli/create-description-file-option.ts"
import { formatIdArgumentDescription } from "../cli/format-id-argument-description.ts"
import { formatNewIdArgumentDescription } from "../cli/format-new-id-argument-description.ts"
import { printColumns } from "../cli/print-columns.ts"
import { projectRoot } from "../cli/project-root.ts"
import { readTextOrFile } from "../cli/read-text-or-file.ts"
import { requireAtLeastOneOption } from "../cli/require-at-least-one-option.ts"
import { requireCompany } from "../company/require-company.ts"
import { loadCompany } from "../company/storage.ts"
import { requireDirector } from "../human/current-human.ts"
import { parseId } from "../ids/parse-id.ts"
import {
    assignPosition,
    type PositionAssignment,
} from "../organization/position/assign-position.ts"
import {
    assignPositionTemporarily,
    type TemporaryAssignmentOutcome,
} from "../organization/position/assign-position-temporarily.ts"
import { createPosition } from "../organization/position/create-position.ts"
import { deletePosition } from "../organization/position/delete-position.ts"
import { formatWorkerName } from "../organization/position/format-worker-name.ts"
import { loadExistingPosition } from "../organization/position/load-existing-position.ts"
import type {
    Position,
    PositionState,
    Worker,
} from "../organization/position/schema.ts"
import {
    listPositions,
    loadPositionState,
} from "../organization/position/storage.ts"
import {
    type PositionUnassignment,
    unassignPosition,
} from "../organization/position/unassign-position.ts"
import { unassignPositionTemporarily } from "../organization/position/unassign-position-temporarily.ts"
import { updatePosition } from "../organization/position/update-position.ts"
import { updatePositionId } from "../organization/position/update-position-id.ts"

function stillTemporary(worker: Worker | undefined): string {
    return worker === undefined
        ? ""
        : ` It stays assigned temporarily to ${formatWorkerName(worker)}.`
}

function formatAssignedMessage({
    positionId,
    employeeId,
    previousEmployeeId,
    hasEndedTemporaryAssignment,
    temporaryAssignment,
}: PositionAssignment): string {
    if (previousEmployeeId === employeeId) {
        return `"${employeeId}" is already the default employee of position "${positionId}".`
    }
    const assignedMessage =
        previousEmployeeId === undefined
            ? `"${employeeId}" is now the default employee of position "${positionId}"`
            : `"${employeeId}" replaces "${previousEmployeeId}" as the default employee of position "${positionId}"`
    return hasEndedTemporaryAssignment
        ? `${assignedMessage}, which ends its temporary assignment.`
        : `${assignedMessage}.${stillTemporary(temporaryAssignment)}`
}

function formatUnassignedMessage({
    positionId,
    previousEmployeeId,
    temporaryAssignment,
}: PositionUnassignment): string {
    if (previousEmployeeId === undefined) {
        return `Position "${positionId}" is already vacant.`
    }
    return `Position "${positionId}" is now vacant: "${previousEmployeeId}" is no longer its default employee.${stillTemporary(temporaryAssignment)}`
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

function formatTemporarilyAssignedMessage(
    outcome: TemporaryAssignmentOutcome,
): string {
    if (outcome.kind === "worked-by-default-employee") {
        return `"${outcome.employeeId}" already works position "${outcome.positionId}", as its default employee.`
    }
    const workerName = formatWorkerName(outcome.temporaryAssignment)
    if (outcome.kind === "already-assigned") {
        return `Position "${outcome.positionId}" is already assigned temporarily to ${workerName}.`
    }
    const assignedMessage = `Position "${outcome.positionId}" is now assigned temporarily to ${workerName}`
    return outcome.replacedTemporaryAssignment === undefined
        ? `${assignedMessage}.`
        : `${assignedMessage} instead of ${formatWorkerName(outcome.replacedTemporaryAssignment)}.`
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
        .action(async (rawId, options) => {
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const position = await createPosition(projectRoot, rawId, {
                title: options.title,
                description,
            })
            console.log(`Created position "${position.id}".`)
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
            const description = await readTextOrFile(
                options.description,
                options.descriptionFile,
            )
            const position = await updatePosition(projectRoot, rawId, {
                title: options.title,
                description,
            })
            console.log(`Updated position "${position.id}".`)
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
            const { position, renamedPosition } = await updatePositionId(
                projectRoot,
                rawId,
                rawNewId,
            )
            console.log(
                `Position "${position.id}" is now "${renamedPosition.id}".`,
            )
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
        .action(async (rawPositionId, rawEmployeeId, options) => {
            const assignment = await assignPosition(
                projectRoot,
                rawPositionId,
                rawEmployeeId,
                { shouldReplace: options.replace },
            )
            console.log(formatAssignedMessage(assignment))
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
            const unassignment = await unassignPosition(projectRoot, rawId)
            console.log(formatUnassignedMessage(unassignment))
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
        .action(async (rawPositionId, rawEmployeeId, options) => {
            const outcome = await assignPositionTemporarily(
                projectRoot,
                rawPositionId,
                { kind: "employee", rawEmployeeId },
                { shouldReplace: options.replace },
            )
            console.log(formatTemporarilyAssignedMessage(outcome))
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
        .action(async (rawPositionId, options) => {
            const outcome = await assignPositionTemporarily(
                projectRoot,
                rawPositionId,
                { kind: "directors" },
                { shouldReplace: options.replace },
            )
            console.log(formatTemporarilyAssignedMessage(outcome))
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
            const { position, endedTemporaryAssignment } =
                await unassignPositionTemporarily(projectRoot, rawId)
            if (endedTemporaryAssignment === undefined) {
                console.log(
                    `Position "${position.id}" isn't assigned temporarily.`,
                )
                return
            }
            const nowWorkedByMessage =
                position.defaultEmployeeId === undefined
                    ? "it is vacant again"
                    : `its default employee "${position.defaultEmployeeId}" works it again`
            console.log(
                `Position "${position.id}" is no longer assigned temporarily to ${formatWorkerName(endedTemporaryAssignment)}: ${nowWorkedByMessage}.`,
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
        .action(async (rawId, { force: shouldForce }) => {
            const { position, awaitingThreadIds } = await deletePosition(
                projectRoot,
                rawId,
                { shouldForce },
            )
            const deletedMessage =
                position.defaultEmployeeId === undefined
                    ? `Deleted position "${position.id}"`
                    : `Deleted position "${position.id}"; its default employee "${position.defaultEmployeeId}" stays hired`
            console.log(
                awaitingThreadIds.length === 0
                    ? `${deletedMessage}.`
                    : `${deletedMessage}. Still awaited in: ${awaitingThreadIds.join(", ")}.`,
            )
        })
}
