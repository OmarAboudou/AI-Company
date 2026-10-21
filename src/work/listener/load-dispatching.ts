import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { JournalEvent } from "../../journal/schema.ts"
import { listEvents } from "../../journal/storage.ts"
import { defaultMaxTaskDepth } from "../../organization/company/schema.ts"
import { loadCompany } from "../../organization/company/storage.ts"
import { listPositions } from "../../organization/position/storage.ts"
import type { ChainStoppedEvent, Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"

export type Dispatching = {
    projectRoot: string
    events: JournalEvent[]
    tasks: Task[]
    positions: IdHistory[]
    maxTaskDepth: number
    createdTasks: Task[]
    chainStoppedEvents: ChainStoppedEvent[]
}

export async function loadDispatching(
    projectRoot: string,
): Promise<Dispatching> {
    const [events, tasks, positions, company] = await Promise.all([
        listEvents(projectRoot),
        listTasks(projectRoot),
        listPositions(projectRoot),
        loadCompany(projectRoot),
    ])
    return {
        projectRoot,
        events,
        tasks,
        positions,
        maxTaskDepth: company.maxTaskDepth ?? defaultMaxTaskDepth,
        createdTasks: [],
        chainStoppedEvents: [],
    }
}
