import type { Command } from "@commander-js/extra-typings"
import { createShellCodeOption } from "../shell/create-shell-code-option.ts"
import { requireShellFunction } from "../shell/require-shell-function.ts"
import { buildCurrentPositionCode } from "./build-current-position-code.ts"

export function registerCurrentPositionClearCommand(
    currentPositionCommand: Command,
): void {
    currentPositionCommand
        .command("clear")
        .description(
            "Let AICo pick the position to write from again in this shell, after current-position set. Needs AICo's shell function: see aico shell init.",
        )
        .addOption(createShellCodeOption())
        .action(({ shellCode: shouldPrintShellCode }) => {
            requireShellFunction(shouldPrintShellCode)
            process.stdout.write(buildCurrentPositionCode(undefined))
        })
}
