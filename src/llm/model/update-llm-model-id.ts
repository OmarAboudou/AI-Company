import { parseId } from "../../ids/parse-id.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import {
    listEmployees,
    saveEmployee,
} from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmModel } from "./load-existing-llm-model.ts"
import type { LlmModel } from "./schema.ts"
import {
    copyLlmModelFolder,
    deleteLlmModelFolder,
    hasLlmModel,
} from "./storage.ts"

export type UpdateLlmModelIdResult = {
    model: LlmModel
    renamedModel: LlmModel
    updatedEmployeeIds: string[]
}

export async function updateLlmModelId(
    projectRoot: string,
    rawProviderId: string,
    rawModelId: string,
    rawNewId: string,
): Promise<UpdateLlmModelIdResult> {
    await requireCompany(projectRoot)
    const [model, employees] = await Promise.all([
        loadExistingLlmModel(projectRoot, rawProviderId, rawModelId),
        listEmployees(projectRoot),
    ])
    const newId = parseId("model", rawNewId)
    if (await hasLlmModel(projectRoot, model.providerId, newId)) {
        throw new UserError(
            `Provider "${model.providerId}" already has a model "${newId}".`,
        )
    }
    const modelEmployees = employees
        .filter((employee) => employee.kind === "llm")
        .filter(
            (employee) =>
                employee.providerId === model.providerId &&
                employee.modelId === model.id,
        )
    // Copy, repoint, then delete rather than move, as for employees:
    // an employee must never run on a missing model.
    await copyLlmModelFolder(projectRoot, model.providerId, model.id, newId)
    await Promise.all(
        modelEmployees.map((employee) =>
            saveEmployee(projectRoot, { ...employee, modelId: newId }),
        ),
    )
    await deleteLlmModelFolder(projectRoot, model.providerId, model.id)
    return {
        model,
        renamedModel: { ...model, id: newId },
        updatedEmployeeIds: modelEmployees.map(({ id }) => id),
    }
}
