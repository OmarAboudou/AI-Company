import { type Command, Option } from "@commander-js/extra-typings"
import { buildSwitchHumanCode } from "./build-switch-human-code.ts"
import { requireShellFunction } from "./require-shell-function.ts"

export function registerSwitchToDirectorCommand(program: Command): void {
    program
        .command("switch-to-director")
        .description(
            "Act as a director again in this shell, after switch-to-human. Needs llmco's shell function: see llmco shell init.",
        )
        .addOption(
            new Option(
                "--shell-code",
                "print the shell code that switches, which llmco's shell function evaluates",
            ).hideHelp(),
        )
        .action(({ shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            process.stdout.write(buildSwitchHumanCode({ kind: "director" }))
        })
}
