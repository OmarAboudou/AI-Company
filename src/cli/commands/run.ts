import type { Command } from "@commander-js/extra-typings"
import type { TokenUsage } from "../../llm/conversation/schema.ts"
import { formatPositionLabel } from "../../messaging/message/format-position-label.ts"
import type { CompanyPause } from "../../work/pause/get-company-pause.ts"
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
    running: "already running, in another process",
    paused: "until the company is relaunched",
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
        case "task-ended":
            return formatTaskEnd(progress.result)
        case "task-cut-short":
            return [
                `Task "${progress.task.id}" failed: its session was cut short, the process that ran it having stopped before it ended.`,
            ]
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

function formatPause({ cause }: CompanyPause): string {
    switch (cause.kind) {
        case "command":
            return "The company is paused: `aico company relaunch` relaunches it."
        case "failure":
            return `The company is paused since task "${cause.taskId}" failed: the director analyses the failure in \`aico task work\`, then relaunches it with \`aico company relaunch\`.`
        case "renouncement":
            return `The company is paused since ticket #${cause.ticketNumber} was renounced: the director arbitrates it in \`aico task work\`, then relaunches it with \`aico company relaunch\`.`
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

type RunStop = { signal: AbortSignal; dispose(): void }

// The terminal turns Ctrl+C into SIGINT: aico run stops once the task in
// progress has failed, its model's call cut, and a second Ctrl+C quits at
// once, should that hang.
function createRunStop(): RunStop {
    const controller = new AbortController()
    const onInterrupt = () => {
        if (controller.signal.aborted) {
            process.exit(130)
        }
        controller.abort()
        console.error(
            "\nStopping aico run: the task in progress fails. Ctrl+C again to quit at once.",
        )
    }
    process.on("SIGINT", onInterrupt)
    return {
        signal: controller.signal,
        dispose: () => process.off("SIGINT", onInterrupt),
    }
}

export function registerRunCommand(program: Command): void {
    program
        .command("run")
        .description(
            "Run the pending tasks of the positions LLM employees work, one at a time and oldest first, until none is ready; then list the tasks left waiting. A task that fails pauses the company, which starts no other; Ctrl+C stops it, failing the task in progress.",
        )
        .action(async (_options, command) => {
            const stop = createRunStop()
            try {
                const result = await runReadyTasks(
                    projectRoot,
                    process.env,
                    formatOperationName(command),
                    createProgressPrinter(),
                    { signal: stop.signal },
                )
                if (result.kind === "stopped") {
                    process.exitCode = 130
                    return
                }
                printWaitingTasks(result.waitingTasks)
                if (result.pause !== undefined) {
                    console.log(`\n${formatPause(result.pause)}`)
                }
            } finally {
                stop.dispose()
            }
        })
}
