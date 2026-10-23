import type { Command } from "@commander-js/extra-typings"
import type { TaskEnding } from "../../../work/tool/define-tool.ts"
import { sendTurn } from "../../../work/turn/send-turn.ts"
import { formatOperationName } from "../../format-operation-name.ts"
import { formatTaskEnding } from "../../format-task-ending.ts"
import { formatTurn } from "../../format-turn.ts"
import { projectRoot } from "../../project-root.ts"

function formatNextStep(taskEnding: TaskEnding | undefined): string {
    if (taskEnding === undefined) {
        return "Prepare your next turn with `aico turn add`, then send it."
    }
    return `${formatTaskEnding(taskEnding)} Run \`aico task next\` for your next task.`
}

export function registerTurnSendCommand(turnCommand: Command): void {
    turnCommand
        .command("send")
        .description(
            "Send your next turn: its texts join the discussion of your task's ticket and its tool calls run, as a model's do, and you get their results. An act that passes the hand, or a turn without any tool call, ends your session.",
        )
        .action(async (_options, command) => {
            const { sentTurn, answeringTurn, taskEnding } = await sendTurn(
                projectRoot,
                process.env,
                formatOperationName(command),
            )
            console.log(formatTurn(sentTurn.blocks, answeringTurn))
            console.log(`\n${formatNextStep(taskEnding)}`)
        })
}
