import type { Worker } from "../position/schema.ts"

export function isHeldByUser(worker: Worker | undefined): boolean {
    return worker?.kind === "user"
}
