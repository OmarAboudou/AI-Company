import type { Command } from "@commander-js/extra-typings"
import { setCurrentHuman } from "../../../organization/human/set-current-human.ts"
import { formatIdArgumentDescription } from "../../id-argument-descriptions.ts"
import { projectRoot } from "../../project-root.ts"
import { createShellCodeOption } from "../shell/create-shell-code-option.ts"
import { requireShellFunction } from "../shell/require-shell-function.ts"
import { buildCurrentHumanCode } from "./build-current-human-code.ts"

export function registerCurrentHumanSetCommand(
    currentHumanCommand: Command,
): void {
    currentHumanCommand
        .command("set")
        .description(
            "Act as a fictitious human employee in this shell, shown in the prompt, until current-human clear. Needs llmco's shell function: see llmco shell init.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "julie"),
        )
        .addOption(createShellCodeOption())
        .action(async (rawEmployeeId, { shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            const currentHuman = await setCurrentHuman(
                projectRoot,
                rawEmployeeId,
            )
            process.stdout.write(buildCurrentHumanCode(currentHuman))
        })
}
