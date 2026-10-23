import type { Command } from "@commander-js/extra-typings"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import { formatPositionLabel } from "../../messaging/message/format-position-label.ts"
import {
    type RunReadyTasksProgress,
    runReadyTasks,
    type WaitingTask,
} from "../../work/run/run-ready-tasks.ts"
import type { RunTaskResult } from "../../work/run/run-task.ts"
import { formatOperationName } from "../format-operation-name.ts"
import { formatTaskEnding } from "../format-task-ending.ts"
import { formatToolInput } from "../format-tool-input.ts"
import { printColumns } from "../print-columns.ts"
import { projectRoot } from "../project-root.ts"

const waitingReasonTexts: Record<WaitingTask["reason"], string> = {
    "unknown-type": "of a type this version of AICo doesn't know",
    "deleted-position": "for a deleted position",
    "vacant-position": "for a vacant position",
    "worked-by-directors": "for the directors",
}

function formatUsage(usage: TokenUsage): string {
    const format = (count: number) => count.toLocaleString("en-US")
    return `Tokens: ${format(usage.inputTokens)} in, ${format(usage.cacheReadInputTokens)} read from the cache, ${format(usage.cacheCreationInputTokens)} written to it, ${format(usage.outputTokens)} out.`
}

function formatTaskEnd({ taskEnding, run }: RunTaskResult): string[] {
    const endLine = formatTaskEnding(taskEnding)
    return run === undefined
        ? [`${endLine} No model was called.`]
        : [endLine, formatUsage(run.usage)]
}

function formatToolResult(text: string): string {
    const [firstLine = "", ...otherLines] = text.split("\n")
    return otherLines.length === 0 ? firstLine : `${firstLine} […]`
}

function formatProgress(
    progress: Exclude<RunReadyTasksProgress, { kind: "text" }>,
): string[] {
    switch (progress.kind) {
        case "task-started": {
            const { task, position, employee } = progress
            return [
                `${employee.name} runs task "${task.id}", ${task.type}, as ${formatPositionLabel(position)}.`,
            ]
        }
        case "tool-call":
            return [`→ ${progress.name}`, ...formatToolInput(progress.input)]
        case "tool-result":
            return progress.isError
                ? [`✗ ${progress.text}`]
                : [`← ${formatToolResult(progress.text)}`]
        case "reminder":
            return [`Reminder: ${progress.text}`]
        case "task-ended":
            return formatTaskEnd(progress.result)
    }
}

function createProgressPrinter(): (progress: RunReadyTasksProgress) => void {
    let isTextLineOpen = false
    return (progress) => {
        if (progress.kind === "text") {
            process.stdout.write(progress.text)
            isTextLineOpen = !progress.text.endsWith("\n")
            return
        }
        if (isTextLineOpen) {
            process.stdout.write("\n")
            isTextLineOpen = false
        }
        for (const line of formatProgress(progress)) {
            console.error(line)
        }
    }
}

function printWaitingTasks(waitingTasks: WaitingTask[]): void {
    if (waitingTasks.length === 0) {
        console.log("No task is ready, nor waiting.")
        return
    }
    console.log("No task is ready. These wait:")
    printColumns(
        waitingTasks.map(({ task, positionId, reason }) => [
            task.id,
            `@${positionId}`,
            task.type,
            waitingReasonTexts[reason],
        ]),
    )
}

export function registerRunCommand(program: Command): void {
    program
        .command("run")
        .description(
            "Run the pending tasks of the positions LLM employees work, one at a time and oldest first, until none is ready; then list the tasks left waiting.",
        )
        .action(async (_options, command) => {
            const { waitingTasks } = await runReadyTasks(
                projectRoot,
                process.env,
                formatOperationName(command),
                createProgressPrinter(),
            )
            printWaitingTasks(waitingTasks)
        })
}
