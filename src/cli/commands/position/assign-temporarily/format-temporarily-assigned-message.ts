import type { AssignPositionTemporarilyResult } from "../../../../organization/position/assign-position-temporarily.ts"
import { formatWorkerName } from "../../../../organization/position/format-worker-name.ts"

export function formatTemporarilyAssignedMessage(
    assignment: AssignPositionTemporarilyResult,
): string {
    if (assignment.kind === "worked-by-default-employee") {
        return `"${assignment.employeeId}" already works position "${assignment.positionId}", as its default employee.`
    }
    const workerName = formatWorkerName(assignment.temporaryAssignment)
    if (assignment.kind === "already-assigned") {
        return `Position "${assignment.positionId}" is already assigned temporarily to ${workerName}.`
    }
    const assignedMessage = `Position "${assignment.positionId}" is now assigned temporarily to ${workerName}`
    return assignment.replacedTemporaryAssignment === undefined
        ? `${assignedMessage}.`
        : `${assignedMessage} instead of ${formatWorkerName(assignment.replacedTemporaryAssignment)}.`
}
