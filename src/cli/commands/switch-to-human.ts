import { type Command, Option } from "@commander-js/extra-typings"
import { setCurrentHuman } from "../../organization/human/set-current-human.ts"
import { formatIdArgumentDescription } from "../id-argument-descriptions.ts"
import { projectRoot } from "../project-root.ts"
import { buildSwitchHumanCode } from "./build-switch-human-code.ts"
import { requireShellFunction } from "./require-shell-function.ts"

export function registerSwitchToHumanCommand(program: Command): void {
    program
        .command("switch-to-human")
        .description(
            "Act as a fictitious human employee in this shell, shown in the prompt, until switch-to-director. Needs llmco's shell function: see llmco shell init.",
        )
        .argument(
            "<employee-id>",
            formatIdArgumentDescription("employee", "julie"),
        )
        .addOption(
            new Option(
                "--shell-code",
                "print the shell code that switches, which llmco's shell function evaluates",
            ).hideHelp(),
        )
        .action(async (rawEmployeeId, { shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            const currentHuman = await setCurrentHuman(
                projectRoot,
                rawEmployeeId,
            )
            process.stdout.write(buildSwitchHumanCode(currentHuman))
        })
}
