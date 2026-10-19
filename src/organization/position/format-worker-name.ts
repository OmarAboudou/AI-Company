import type { Worker } from "./schema.ts"

export function formatWorkerName(worker: Worker): string {
    return worker.kind === "directors"
        ? "the directors"
        : `"${worker.employeeId}"`
}
