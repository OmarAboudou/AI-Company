import type { Task } from "../work/task/schema.ts"

export function printCreatedTasks(createdTasks: Task[]): void {
    for (const { id, type, positionId } of createdTasks) {
        console.error(`Created task "${id}" for @${positionId}: ${type}.`)
    }
    if (createdTasks.length > 0) {
        console.error("Run `llmco run` to have LLM employees do their tasks.")
    }
}
