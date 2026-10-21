import { catchUpListener } from "./catch-up-listener.ts"
import type { Listener } from "./define-listener.ts"

export const builtInListeners: Listener[] = [catchUpListener]
