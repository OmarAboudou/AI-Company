import type { Command } from "@commander-js/extra-typings"
import {
    type RunReadyTasksProgress,
    runReadyTasks,
    type WaitingTask,
} from "../../work/run/run-ready-tasks.ts"
import type { RunTaskResult } from "../../work/run/run-task.ts"
import type { TokenUsage } from "../../work/run/schema.ts"
import { printColumns } from "../print-columns.ts"
import { projectRoot } from "../project-root.ts"

const waitingReasonTexts: Record<WaitingTask["reason"], string> = {
    "unknown-type": "of a type this version of llmco doesn't know",
    "deleted-position": "for a deleted position",
    "vacant-position": "for a vacant position",
    "worked-by-directors": "for the directors",
    "worked-by-human": "for a human employee",
}

function formatUsage(usage: TokenUsage): string {
    const format = (count: number) => count.toLocaleString("en-US")
    return `Tokens: ${format(usage.inputTokens)} in, ${format(usage.cacheReadInputTokens)} read from the cache, ${format(usage.cacheCreationInputTokens)} written to it, ${format(usage.outputTokens)} out.`
}

function formatTaskEnd({ taskEnding, run }: RunTaskResult): string[] {
    const endLine =
        taskEnding.state === "succeeded"
            ? `Task completed: ${taskEnding.summary}`
            : `Task failed: ${taskEnding.reason}`
    return run === undefined
        ? [`${endLine} No model was called.`]
        : [endLine, formatUsage(run.usage)]
}

function formatToolInput(input: unknown): string[] {
    if (typeof input !== "object" || input === null) {
        return [`  ${JSON.stringify(input)}`]
    }
    return Object.entries(input).flatMap(([name, value]) =>
        typeof value === "string" && value.includes("\n")
            ? [`  ${name}:`, ...value.split("\n").map((line) => `    ${line}`)]
            : [`  ${name}: ${JSON.stringify(value)}`],
    )
}

function formatToolResult(text: string): string {
    const [firstLine = "", ...otherLines] = text.split("\n")
    return otherLines.length === 0 ? firstLine : `${firstLine} […]`
}

function formatProgress(
    progress: Exclude<RunReadyTasksProgress, { kind: "text" }>,
): string[] {
    switch (progress.kind) {
        case "chain-stopped": {
            const { type, positionId } = progress.chainStoppedEvent.stoppedTask
            return [
                `Chain stopped: no ${type} task for @${positionId}, which would go beyond the company's maxTaskDepth.`,
            ]
        }
        case "task-started": {
            const { task, position, employee } = progress
            return [
                `${employee.name} runs task "${task.id}", ${task.type}, as ${position.title} (@${position.id}).`,
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
        .action(async () => {
            const { waitingTasks } = await runReadyTasks(
                projectRoot,
                createProgressPrinter(),
            )
            printWaitingTasks(waitingTasks)
        })
}
