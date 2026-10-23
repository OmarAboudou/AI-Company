import { Argument, type Command } from "@commander-js/extra-typings"
import { buildShellFunction } from "./build-shell-function.ts"
import { saveShellInitLine } from "./save-shell-init-line.ts"
import { shells } from "./shells.ts"

export function registerShellInitCommand(shellCommand: Command): void {
    shellCommand
        .command("init")
        .description(
            "Print AICo's shell function, which current-human and current-position set and clear need, for your shell's startup file to evaluate, or add the line evaluating it to that file with --install.",
        )
        .addArgument(
            new Argument(
                "<shell>",
                `your shell: ${shells.join(" or ")}`,
            ).choices(shells),
        )
        .option(
            "-i, --install",
            "add the line evaluating it to ~/.bashrc or ~/.zshrc",
        )
        .action(async (shell, { install: shouldInstall }) => {
            if (!shouldInstall) {
                process.stdout.write(buildShellFunction(shell))
                return
            }
            const rcFilePath = await saveShellInitLine(shell)
            console.log(
                `Added AICo's shell function to ${rcFilePath}: current-human set works in the terminals opened from now on.`,
            )
        })
}
