import type { Command } from "@commander-js/extra-typings"
import { assignPositionTemporarily } from "../../../../organization/position/assign-position-temporarily.ts"
import { formatIdArgumentDescription } from "../../../format-id-argument-description.ts"
import { projectRoot } from "../../../project-root.ts"
import { createReplaceTemporaryAssignmentOption } from "./create-replace-temporary-assignment-option.ts"
import { formatTemporarilyAssignedMessage } from "./format-temporarily-assigned-message.ts"

export function registerPositionAssignTemporarilyDirectorsCommand(
    assignTemporarilyCommand: Command,
): void {
    assignTemporarilyCommand
        .command("directors")
        .description(
            "Assign a position temporarily to the directors: the people working on the repository cover it themselves, without an employee.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .addOption(createReplaceTemporaryAssignmentOption())
        .action(async (rawPositionId, options) => {
            const outcome = await assignPositionTemporarily(
                projectRoot,
                rawPositionId,
                { kind: "directors" },
                { shouldReplace: options.replace },
            )
            console.log(formatTemporarilyAssignedMessage(outcome))
        })
}
