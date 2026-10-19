import { formatWorkerName } from "../../../organization/position/format-worker-name.ts"
import type { Worker } from "../../../organization/position/schema.ts"

export function formatStillTemporaryMessage(
    worker: Worker | undefined,
): string {
    return worker === undefined
        ? ""
        : ` It stays assigned temporarily to ${formatWorkerName(worker)}.`
}
