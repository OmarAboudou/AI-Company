import type { Command } from "@commander-js/extra-typings"
import { loadCurrentStagedTurn } from "../../../work/turn/load-current-staged-turn.ts"
import { formatTurn } from "../../format-turn.ts"
import { projectRoot } from "../../project-root.ts"

export function registerTurnShowCommand(turnCommand: Command): void {
    turnCommand
        .command("show")
        .description(
            "Show your next turn as you prepared it, before sending it.",
        )
        .action(async () => {
            const { blocks } = await loadCurrentStagedTurn(
                projectRoot,
                process.env,
            )
            console.log(
                blocks.length === 0
                    ? "Your turn is empty: add to it with `llmco turn add text` or `llmco turn add tool`."
                    : formatTurn(blocks),
            )
        })
}
