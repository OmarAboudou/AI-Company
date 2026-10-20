import { type Command, Option } from "@commander-js/extra-typings"
import { requireShellFunction } from "../shell/require-shell-function.ts"
import { buildCurrentPositionCode } from "./build-current-position-code.ts"

export function registerCurrentPositionClearCommand(
    currentPositionCommand: Command,
): void {
    currentPositionCommand
        .command("clear")
        .description(
            "Let llmco pick the position to write from again in this shell, after current-position set. Needs llmco's shell function: see llmco shell init.",
        )
        .addOption(
            new Option(
                "--shell-code",
                "print the shell code that clears it, which llmco's shell function evaluates",
            ).hideHelp(),
        )
        .action(({ shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            process.stdout.write(buildCurrentPositionCode(undefined))
        })
}
