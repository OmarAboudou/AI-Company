import type { Command } from "@commander-js/extra-typings"
import { formatWorkerName } from "../../../organization/position/format-worker-name.ts"
import { unassignPositionTemporarily } from "../../../organization/position/unassign-position-temporarily.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { requireDirector } from "../../require-director.ts"

export function registerPositionUnassignTemporarilyCommand(
    positionCommand: Command,
): void {
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
}
