import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import { listPositionAssignments } from "../position/list-position-assignments.ts"
import type { PositionAssignment } from "../position/schema.ts"
import { savePosition, savePositionState } from "../position/storage.ts"
import { getPositionsFilledBy } from "./get-positions-filled-by.ts"
import { getPositionsWorkedTemporarilyBy } from "./get-positions-worked-temporarily-by.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"

export type ReplaceEmployeeResult = {
    employeeId: string
    replacementId: string
    filledPositionIds: string[]
    handedOverPositionIds: string[]
    endedTemporaryPositionIds: string[]
    keptTemporaryPositionIds: string[]
}

function getPositionIds(temporaryPositions: PositionAssignment[]): string[] {
    return temporaryPositions.map(({ position }) => position.id)
}

export async function replaceEmployee(
    projectRoot: string,
    rawId: string,
    rawReplacementId: string,
    {
        shouldHandOverTemporaryAssignments = false,
    }: { shouldHandOverTemporaryAssignments?: boolean } = {},
): Promise<ReplaceEmployeeResult> {
    await requireCompany(projectRoot)
    const [employee, replacement, assignments] = await Promise.all([
        loadExistingEmployee(projectRoot, rawId),
        loadExistingEmployee(projectRoot, rawReplacementId),
        listPositionAssignments(projectRoot),
    ])
    if (replacement.id === employee.id) {
        throw new UserError(`"${employee.id}" can't replace itself.`)
    }
    const filledPositions = getPositionsFilledBy(
        assignments.map(({ position }) => position),
        employee.id,
    )
    const employeeTemporaryPositions = getPositionsWorkedTemporarilyBy(
        assignments,
        employee.id,
    )
    const replacementTemporaryPositions = getPositionsWorkedTemporarilyBy(
        assignments,
        replacement.id,
    ).filter(({ position }) => position.defaultEmployeeId === employee.id)
    const handedOverTemporaryPositions = shouldHandOverTemporaryAssignments
        ? employeeTemporaryPositions
        : []
    const isFilledByReplacement = ({ position }: PositionAssignment) =>
        position.defaultEmployeeId === replacement.id
    const endingTemporaryPositions = [
        ...replacementTemporaryPositions,
        ...handedOverTemporaryPositions.filter(isFilledByReplacement),
    ]
    const movingTemporaryPositions = handedOverTemporaryPositions.filter(
        (handedOverPosition) => !isFilledByReplacement(handedOverPosition),
    )
    await Promise.all([
        ...filledPositions.map((position) =>
            savePosition(projectRoot, {
                ...position,
                defaultEmployeeId: replacement.id,
            }),
        ),
        ...endingTemporaryPositions.map(
            ({ position, state: { temporaryAssignment, ...state } }) =>
                savePositionState(projectRoot, position.id, state),
        ),
        ...movingTemporaryPositions.map(({ position, state }) =>
            savePositionState(projectRoot, position.id, {
                ...state,
                temporaryAssignment: {
                    kind: "employee",
                    employeeId: replacement.id,
                },
            }),
        ),
    ])
    return {
        employeeId: employee.id,
        replacementId: replacement.id,
        filledPositionIds: filledPositions.map(({ id }) => id),
        handedOverPositionIds: getPositionIds(movingTemporaryPositions),
        endedTemporaryPositionIds: getPositionIds(endingTemporaryPositions),
        keptTemporaryPositionIds: shouldHandOverTemporaryAssignments
            ? []
            : getPositionIds(employeeTemporaryPositions),
    }
}
