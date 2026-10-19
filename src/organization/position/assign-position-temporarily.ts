import { requireCompany } from "../../company/require-company.ts"
import { loadCompany } from "../../company/storage.ts"
import { parseId } from "../../ids/parse-id.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingEmployee } from "../employee/load-existing-employee.ts"
import { formatWorkerName } from "./format-worker-name.ts"
import { loadExistingPosition } from "./load-existing-position.ts"
import type { Worker } from "./schema.ts"
import { loadPositionState, savePositionState } from "./storage.ts"

export type TemporaryAssignee =
    | { kind: "employee"; rawEmployeeId: string }
    | { kind: "directors" }

export type TemporaryAssignmentOutcome =
    | {
          kind: "worked-by-default-employee"
          positionId: string
          employeeId: string
      }
    | {
          kind: "already-assigned"
          positionId: string
          temporaryAssignment: Worker
      }
    | {
          kind: "assigned"
          positionId: string
          temporaryAssignment: Worker
          replacedTemporaryAssignment: Worker | undefined
      }

export async function assignPositionTemporarily(
    projectRoot: string,
    rawPositionId: string,
    assignee: TemporaryAssignee,
    { shouldReplace = false }: { shouldReplace?: boolean } = {},
): Promise<TemporaryAssignmentOutcome> {
    await requireCompany(projectRoot)
    const [position, employee, company, state] = await Promise.all([
        loadExistingPosition(projectRoot, rawPositionId),
        assignee.kind === "employee"
            ? loadExistingEmployee(projectRoot, assignee.rawEmployeeId)
            : undefined,
        loadCompany(projectRoot),
        loadPositionState(projectRoot, parseId("position", rawPositionId)),
    ])
    if (position.id === company.directorPositionId) {
        throw new UserError(
            `Position "${position.id}" is the director's position: the people working on this repository always hold it.`,
        )
    }
    const currentAssignment = state.temporaryAssignment
    if (employee !== undefined && employee.id === position.defaultEmployeeId) {
        if (currentAssignment !== undefined) {
            throw new UserError(
                `"${employee.id}" is the default employee of position "${position.id}": run \`llmco position unassign-temporarily ${position.id}\` to give the position back to it.`,
            )
        }
        return {
            kind: "worked-by-default-employee",
            positionId: position.id,
            employeeId: employee.id,
        }
    }
    const temporaryAssignment: Worker =
        employee === undefined
            ? { kind: "directors" }
            : { kind: "employee", employeeId: employee.id }
    if (Bun.deepEquals(currentAssignment, temporaryAssignment)) {
        return {
            kind: "already-assigned",
            positionId: position.id,
            temporaryAssignment,
        }
    }
    if (currentAssignment !== undefined && !shouldReplace) {
        throw new UserError(
            `Position "${position.id}" is already assigned temporarily to ${formatWorkerName(currentAssignment)}. Add --replace to replace it.`,
        )
    }
    await savePositionState(projectRoot, position.id, {
        ...state,
        temporaryAssignment,
    })
    return {
        kind: "assigned",
        positionId: position.id,
        temporaryAssignment,
        replacedTemporaryAssignment: currentAssignment,
    }
}
