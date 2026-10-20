import { type Command, Option } from "@commander-js/extra-typings"
import { requireShellFunction } from "../shell/require-shell-function.ts"
import { buildCurrentHumanCode } from "./build-current-human-code.ts"

export function registerCurrentHumanClearCommand(
    currentHumanCommand: Command,
): void {
    currentHumanCommand
        .command("clear")
        .description(
            "Act as a director again in this shell, after current-human set. Needs llmco's shell function: see llmco shell init.",
        )
        .addOption(
            new Option(
                "--shell-code",
                "print the shell code that clears it, which llmco's shell function evaluates",
            ).hideHelp(),
        )
        .action(({ shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            process.stdout.write(buildCurrentHumanCode({ kind: "director" }))
        })
}
