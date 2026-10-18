import type { Command } from "@commander-js/extra-typings"
import { z } from "zod"
import {
    descriptionFileOption,
    idDescription,
    loadExistingEmployee,
    loadExistingPosition,
    parseId,
    printColumns,
    projectRoot,
    readDescription,
    requireCompany,
} from "../cli-helpers.ts"
import { UserError } from "../errors.ts"
import { PositionConfigSchema } from "./position.ts"
import {
    deletePosition,
    listPositions,
    positionExists,
    savePosition,
} from "./storage.ts"

export function registerPositionCommands(program: Command): void {
    const positionCommand = program
        .command("position")
        .description("Manage the positions of the company.")

    positionCommand
        .command("create")
        .description("Create a position.")
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
                description: await readDescription(
                    description,
                    descriptionFile,
                ),
            })
            console.log(`Created position "${id}".`)
        })

    positionCommand
        .command("list")
        .description("List the positions and the employees filling them.")
        .action(async () => {
            await requireCompany()
            const positions = await listPositions(projectRoot)
            if (positions.length === 0) {
                console.log("No positions yet. Run `llmco position create`.")
                return
            }
            printColumns(
                positions.map(({ id, title, defaultEmployeeId }) => [
                    id,
                    title,
                    defaultEmployeeId ?? "(vacant)",
                ]),
            )
        })

    positionCommand
        .command("show")
        .description(
            "Display a position: title, default employee and description.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany()
            const position = await loadExistingPosition(rawId)
            console.log(
                `# ${position.title}\n\ndefault employee: ${position.defaultEmployeeId ?? "(vacant)"}\n\n${position.description}`,
            )
        })

    positionCommand
        .command("assign")
        .description("Set the default employee of a position.")
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .argument("<employee-id>", idDescription("employee", "claude-senior"))
        .option("-r, --replace", "replace the current default employee")
        .action(async (rawPositionId, rawEmployeeId, { replace }) => {
            await requireCompany()
            const [position, employee] = await Promise.all([
                loadExistingPosition(rawPositionId),
                loadExistingEmployee(rawEmployeeId),
            ])
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
        .command("delete")
        .alias("close")
        .description(
            "Delete (close) a position. Its default employee stays hired.",
        )
        .argument(
            "<position-id>",
            idDescription("position", "backend-developer"),
        )
        .action(async (rawId) => {
            await requireCompany()
            const position = await loadExistingPosition(rawId)
            await deletePosition(projectRoot, position.id)
            console.log(
                position.defaultEmployeeId === undefined
                    ? `Deleted position "${position.id}".`
                    : `Deleted position "${position.id}"; its default employee "${position.defaultEmployeeId}" stays hired.`,
            )
        })
}
