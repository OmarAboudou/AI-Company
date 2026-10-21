import type { Command } from "@commander-js/extra-typings"
import { clearTurn } from "../../../work/turn/clear-turn.ts"
import { projectRoot } from "../../project-root.ts"

export function registerTurnClearCommand(turnCommand: Command): void {
    turnCommand
        .command("clear")
        .description("Empty your next turn, to prepare it again.")
        .action(async () => {
            await clearTurn(projectRoot, process.env)
            console.error("Emptied your turn.")
        })
}
