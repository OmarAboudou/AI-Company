import { UserError } from "../../user-error.ts"
import { requireCompany } from "../company/require-company.ts"
import {
    listPositions,
    savePosition,
    savePositionState,
} from "../position/storage.ts"
import { getPositionsFilledBy } from "./get-positions-filled-by.ts"
import {
    listPositionsWorkedTemporarilyBy,
    type TemporaryPosition,
} from "./list-positions-worked-temporarily-by.ts"
import { loadExistingEmployee } from "./load-existing-employee.ts"

export type ReplaceEmployeeResult = {
    employeeId: string
    replacementId: string
    filledPositionIds: string[]
    handedOverPositionIds: string[]
    endedTemporaryPositionIds: string[]
    keptTemporaryPositionIds: string[]
}

function getPositionIds(temporaryPositions: TemporaryPosition[]): string[] {
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
    const [employee, replacement, positions] = await Promise.all([
        loadExistingEmployee(projectRoot, rawId),
        loadExistingEmployee(projectRoot, rawReplacementId),
        listPositions(projectRoot),
    ])
    if (replacement.id === employee.id) {
        throw new UserError(`"${employee.id}" can't replace itself.`)
    }
    const filledPositions = getPositionsFilledBy(positions, employee.id)
    const [employeeTemporaryPositions, replacementTemporaryPositions] =
        await Promise.all([
            listPositionsWorkedTemporarilyBy(
                projectRoot,
                positions,
                employee.id,
            ),
            listPositionsWorkedTemporarilyBy(
                projectRoot,
                filledPositions,
                replacement.id,
            ),
        ])
    const handedOverTemporaryPositions = shouldHandOverTemporaryAssignments
        ? employeeTemporaryPositions
        : []
    const isFilledByReplacement = ({ position }: TemporaryPosition) =>
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
