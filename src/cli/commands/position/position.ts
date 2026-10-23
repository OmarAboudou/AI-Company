import type { Command } from "@commander-js/extra-typings"
import { registerPositionAssignCommand } from "./assign.ts"
import { registerPositionCreateCommand } from "./create.ts"
import { registerPositionDeleteCommand } from "./delete.ts"
import { registerPositionListCommand } from "./list.ts"
import { registerPositionShowCommand } from "./show.ts"
import { registerPositionUnassignCommand } from "./unassign.ts"
import { registerPositionUpdateCommand } from "./update.ts"
import { registerPositionUpdateIdCommand } from "./update-id.ts"

export function registerPositionCommands(program: Command): void {
    const positionCommand = program
        .command("position")
        .description("Manage the positions of the company.")
    registerPositionCreateCommand(positionCommand)
    registerPositionListCommand(positionCommand)
    registerPositionShowCommand(positionCommand)
    registerPositionUpdateCommand(positionCommand)
    registerPositionUpdateIdCommand(positionCommand)
    registerPositionAssignCommand(positionCommand)
    registerPositionUnassignCommand(positionCommand)
    registerPositionDeleteCommand(positionCommand)
}
