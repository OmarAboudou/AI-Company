import type { Listener } from "./define-listener.ts"
import { mentionListener } from "./mention-listener.ts"

export const builtInListeners: Listener[] = [mentionListener]
