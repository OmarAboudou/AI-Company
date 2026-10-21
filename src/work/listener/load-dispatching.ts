import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Journal } from "../../journal/schema.ts"
import { defaultMaxTaskDepth } from "../../organization/company/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { getTaskStates, type TaskState } from "../task/get-task-states.ts"
import type { ChainStoppedEvent, Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"

export type Dispatching = {
    journal: Journal
    tasks: Task[]
    taskStates: Map<string, TaskState>
    positions: IdHistory[]
    maxTaskDepth: number
    createdTasks: Task[]
    doneTasks: Task[]
    chainStoppedEvents: ChainStoppedEvent[]
}

export async function loadDispatching(journal: Journal): Promise<Dispatching> {
    const { projectRoot, events } = journal
    const [tasks, positions, company] = await Promise.all([
        listTasks(projectRoot),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    return {
        journal,
        tasks,
        taskStates: getTaskStates(tasks, events),
        positions,
        maxTaskDepth: company.maxTaskDepth ?? defaultMaxTaskDepth,
        createdTasks: [],
        doneTasks: [],
        chainStoppedEvents: [],
    }
}
