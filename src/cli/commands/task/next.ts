import type { Command } from "@commander-js/extra-typings"
import { openNextTask } from "../../../work/task/open-next-task.ts"
import { formatTaskEnding } from "../../format-task-ending.ts"
import { projectRoot } from "../../project-root.ts"
import { runCommandOperation } from "../../run-command-operation.ts"
import { formatOpenedTask } from "./format-opened-task.ts"

export function registerTaskNextCommand(taskCommand: Command): void {
    taskCommand
        .command("next")
        .description(
            "Open the next task of the positions you hold (see current-position), or resume the one in progress, and show what an LLM employee would be given: the system prompt, the task's message and the tools.",
        )
        .action(async (_options, command) => {
            const { openedTask, endedTasks } = await runCommandOperation(
                command,
                () => openNextTask(projectRoot, process.env),
            )
            for (const { task, taskEnding } of endedTasks) {
                console.error(`"${task.id}": ${formatTaskEnding(taskEnding)}`)
            }
            console.log(
                openedTask === undefined
                    ? "No task waits for you."
                    : `${formatOpenedTask(openedTask)}\n\nPrepare your turn with \`aico turn add text\` or \`aico turn add tool\`, then send it with \`aico turn send\`.`,
            )
        })
}
