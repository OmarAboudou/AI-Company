import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Journal } from "../../journal/schema.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { getTaskStates, type TaskState } from "../task/get-task-states.ts"
import type { Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"

export type Dispatching = {
    journal: Journal
    tasks: Task[]
    taskStates: Map<string, TaskState>
    positions: IdHistory[]
    createdTasks: Task[]
    doneTasks: Task[]
}

export async function loadDispatching(journal: Journal): Promise<Dispatching> {
    const { projectRoot, events } = journal
    const [tasks, positions] = await Promise.all([
        listTasks(projectRoot),
        listPositions(projectRoot),
    ])
    return {
        journal,
        tasks,
        taskStates: getTaskStates(tasks, events),
        positions,
        createdTasks: [],
        doneTasks: [],
    }
}
