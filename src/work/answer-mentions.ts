import { loadCompany } from "../organization/company/storage.ts"
import type { Employee } from "../organization/employee/schema.ts"
import { loadEmployee } from "../organization/employee/storage.ts"
import { getCurrentWorker } from "../organization/position/get-current-worker.ts"
import type { Position } from "../organization/position/schema.ts"
import {
    loadPosition,
    loadPositionState,
} from "../organization/position/storage.ts"
import { UserError } from "../user-error.ts"
import {
    answerAsLlmEmployee,
    type LlmAnswerEvent,
} from "./answer-as-llm-employee.ts"

export type AnswerEvent =
    | { kind: "vacant"; position: Position }
    | { kind: "worked-by-directors"; position: Position }
    | {
          kind: "worked-by-human"
          position: Position
          employee: Extract<Employee, { kind: "human" }>
      }
    | LlmAnswerEvent

export async function answerMentions(
    projectRoot: string,
    threadId: string,
    positionIds: string[],
    onEvent: (event: AnswerEvent) => void,
): Promise<void> {
    const failureMessages: string[] = []
    const { directorPositionId } = await loadCompany(projectRoot)
    for (const positionId of positionIds) {
        const [position, positionState] = await Promise.all([
            loadPosition(projectRoot, positionId),
            loadPositionState(projectRoot, positionId),
        ])
        const worker = getCurrentWorker(
            position,
            positionState,
            directorPositionId,
        )
        if (worker === undefined) {
            onEvent({ kind: "vacant", position })
            continue
        }
        if (worker.kind === "directors") {
            onEvent({ kind: "worked-by-directors", position })
            continue
        }
        const employee = await loadEmployee(projectRoot, worker.employeeId)
        if (employee.kind === "human") {
            onEvent({ kind: "worked-by-human", position, employee })
            continue
        }
        try {
            await answerAsLlmEmployee(
                projectRoot,
                threadId,
                position,
                employee,
                onEvent,
            )
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            failureMessages.push(
                `@${position.id} didn't answer: ${error.message}`,
            )
        }
    }
    if (failureMessages.length > 0) {
        throw new UserError(
            `${failureMessages.join("\n")}\nThe message was sent, and stays awaited by these positions.`,
        )
    }
}
