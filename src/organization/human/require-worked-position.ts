import { UserError } from "../../user-error.ts"
import { loadEmployee } from "../employee/storage.ts"
import { loadExistingPositionAssignment } from "../position/load-existing-position-assignment.ts"
import type { Position } from "../position/schema.ts"

export async function requireWorkedPosition(
    projectRoot: string,
    rawId: string,
): Promise<Position> {
    const { position, holder } = await loadExistingPositionAssignment(
        projectRoot,
        rawId,
    )
    if (holder.kind === "user") {
        return position
    }
    const employee = await loadEmployee(projectRoot, holder.employeeId)
    throw new UserError(
        `You don't hold position "${position.id}": ${employee.name}, an LLM employee, holds it, and nobody writes on an LLM's behalf. Take it back first: \`aico position unassign ${position.id}\`.`,
    )
}
