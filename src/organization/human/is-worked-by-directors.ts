import type { Worker } from "../position/schema.ts"

export function isWorkedByDirectors(worker: Worker | undefined): boolean {
    return worker?.kind === "directors"
}
