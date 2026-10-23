import type { Listener } from "../define-listener.ts"
import { failureListener } from "./failure-listener.ts"
import { relaunchListener } from "./relaunch-listener.ts"
import { sessionEndListener } from "./session-end-listener.ts"
import { ticketClosingListeners } from "./ticket-closing-listeners.ts"
import { ticketTaskListeners } from "./ticket-task-listeners.ts"
import { whatNowListeners } from "./what-now-listeners.ts"

export const builtInListeners: Listener[] = [
    ...ticketTaskListeners,
    ...ticketClosingListeners,
    sessionEndListener,
    failureListener,
    relaunchListener,
    ...whatNowListeners,
]
