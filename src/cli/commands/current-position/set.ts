import type { Command } from "@commander-js/extra-typings"
import { setCurrentPosition } from "../../../organization/human/set-current-position.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { createShellCodeOption } from "../shell/create-shell-code-option.ts"
import { requireShellFunction } from "../shell/require-shell-function.ts"
import { buildCurrentPositionCode } from "./build-current-position-code.ts"

export function registerCurrentPositionSetCommand(
    currentPositionCommand: Command,
): void {
    currentPositionCommand
        .command("set")
        .description(
            "Write from this position in this shell, among those you work, until current-position clear; --as-position still chooses another for one message. Needs llmco's shell function: see llmco shell init.",
        )
        .argument(
            "<position-id>",
            formatIdArgumentDescription("position", "backend-developer"),
        )
        .addOption(createShellCodeOption())
        .action(async (rawPositionId, { shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            const position = await setCurrentPosition(
                projectRoot,
                rawPositionId,
            )
            process.stdout.write(buildCurrentPositionCode(position.id))
        })
}
