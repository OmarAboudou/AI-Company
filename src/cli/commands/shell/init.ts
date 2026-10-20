import { Argument, type Command } from "@commander-js/extra-typings"
import { buildShellFunction } from "./build-shell-function.ts"
import { saveShellInitLine } from "./save-shell-init-line.ts"
import { shells } from "./shells.ts"

export function registerShellInitCommand(shellCommand: Command): void {
    shellCommand
        .command("init")
        .description(
            "Print llmco's shell function, which switch-to-human and switch-to-director need, for your shell's startup file to evaluate, or add the line evaluating it to that file with --install.",
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
                `Added llmco's shell function to ${rcFilePath}: switch-to-human works in the terminals opened from now on.`,
            )
        })
}
