import { Argument, type Command } from "@commander-js/extra-typings"
import { buildShellFunction } from "./build-shell-function.ts"
import { shells } from "./shells.ts"

export function registerShellInitCommand(shellCommand: Command): void {
    shellCommand
        .command("init")
        .description(
            "Print llmco's shell function, which switch-to-human and switch-to-director need, for your shell's startup file to evaluate.",
        )
        .addArgument(
            new Argument(
                "<shell>",
                `your shell: ${shells.join(" or ")}`,
            ).choices(shells),
        )
        .action((shell) => {
            process.stdout.write(buildShellFunction(shell))
        })
}
