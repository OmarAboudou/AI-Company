import type { Command } from "@commander-js/extra-typings"
import { readCurrentPositionId } from "../../../organization/human/read-current-position-id.ts"

export function registerCurrentPositionShowCommand(
    currentPositionCommand: Command,
): void {
    currentPositionCommand
        .command("show", { isDefault: true })
        .description(
            "Show the position selected in this shell, or (none) when llmco picks the one to write from for each message.",
        )
        .action(() => {
            console.log(readCurrentPositionId(process.env) ?? "(none)")
        })
}
