import type { Listener } from "../define-listener.ts"
import { sessionEndListener } from "./session-end-listener.ts"
import { ticketClosingListeners } from "./ticket-closing-listeners.ts"
import { ticketTaskListeners } from "./ticket-task-listeners.ts"

export const builtInListeners: Listener[] = [
    ...ticketTaskListeners,
    ...ticketClosingListeners,
    sessionEndListener,
]
