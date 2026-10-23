import type { Command } from "@commander-js/extra-typings"
import { createShellCodeOption } from "../shell/create-shell-code-option.ts"
import { requireShellFunction } from "../shell/require-shell-function.ts"
import { buildCurrentHumanCode } from "./build-current-human-code.ts"

export function registerCurrentHumanClearCommand(
    currentHumanCommand: Command,
): void {
    currentHumanCommand
        .command("clear")
        .description(
            "Act as a director again in this shell, after current-human set. Needs AICo's shell function: see aico shell init.",
        )
        .addOption(createShellCodeOption())
        .action(({ shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            process.stdout.write(buildCurrentHumanCode({ kind: "director" }))
        })
}
