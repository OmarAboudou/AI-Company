import type { AssignPositionTemporarilyResult } from "../../../../organization/position/assign-position-temporarily.ts"
import { formatWorkerName } from "../../../../organization/position/format-worker-name.ts"

export function formatTemporarilyAssignedMessage(
    outcome: AssignPositionTemporarilyResult,
): string {
    if (outcome.kind === "worked-by-default-employee") {
        return `"${outcome.employeeId}" already works position "${outcome.positionId}", as its default employee.`
    }
    const workerName = formatWorkerName(outcome.temporaryAssignment)
    if (outcome.kind === "already-assigned") {
        return `Position "${outcome.positionId}" is already assigned temporarily to ${workerName}.`
    }
    const assignedMessage = `Position "${outcome.positionId}" is now assigned temporarily to ${workerName}`
    return outcome.replacedTemporaryAssignment === undefined
        ? `${assignedMessage}.`
        : `${assignedMessage} instead of ${formatWorkerName(outcome.replacedTemporaryAssignment)}.`
}
