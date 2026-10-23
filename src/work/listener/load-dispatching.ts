import type { IdHistory } from "../../ids/id-history-schema.ts"
import type { Journal } from "../../journal/schema.ts"
import {
    getTicketStates,
    type TicketState,
} from "../../messaging/ticket/get-ticket-states.ts"
import { listTickets } from "../../messaging/ticket/storage.ts"
import { listPositions } from "../../organization/position/storage.ts"
import { getTaskStates, type TaskState } from "../task/get-task-states.ts"
import type { Task } from "../task/schema.ts"
import { listTasks } from "../task/storage.ts"
import type { TaskType } from "../task-type/define-task-type.ts"

export type Dispatching = {
    journal: Journal
    taskTypes: Record<string, TaskType>
    tasks: Task[]
    taskStates: Map<string, TaskState>
    positions: IdHistory[]
    ticketStates: Map<number, TicketState>
    createdTasks: Task[]
    cancelledTasks: Task[]
}

export async function loadDispatching(
    journal: Journal,
    taskTypes: Record<string, TaskType>,
): Promise<Dispatching> {
    const { projectRoot, events } = journal
    const [tasks, positions, tickets] = await Promise.all([
        listTasks(projectRoot),
        listPositions(projectRoot),
        listTickets(projectRoot),
    ])
    return {
        journal,
        taskTypes,
        tasks,
        taskStates: getTaskStates(tasks, events),
        positions,
        ticketStates: getTicketStates(tickets, events, positions),
        createdTasks: [],
        cancelledTasks: [],
    }
}
