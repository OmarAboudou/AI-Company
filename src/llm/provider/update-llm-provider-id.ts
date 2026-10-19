import { parseId } from "../../ids/parse-id.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import {
    listEmployees,
    saveEmployee,
} from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmProvider } from "./load-existing-llm-provider.ts"
import type { LlmProvider } from "./schema.ts"
import {
    copyLlmProviderFolder,
    deleteLlmProviderFolder,
    hasLlmProvider,
} from "./storage.ts"

export type UpdateLlmProviderIdResult = {
    provider: LlmProvider
    renamedProvider: LlmProvider
    updatedEmployeeIds: string[]
}

export async function updateLlmProviderId(
    projectRoot: string,
    rawId: string,
    rawNewId: string,
): Promise<UpdateLlmProviderIdResult> {
    await requireCompany(projectRoot)
    const newId = parseId("provider", rawNewId)
    const [provider, isTaken, employees] = await Promise.all([
        loadExistingLlmProvider(projectRoot, rawId),
        hasLlmProvider(projectRoot, newId),
        listEmployees(projectRoot),
    ])
    if (isTaken) {
        throw new UserError(`Provider "${newId}" already exists.`)
    }
    const providerEmployees = employees
        .filter((employee) => employee.kind === "llm")
        .filter((employee) => employee.providerId === provider.id)
    // Copy, repoint, then delete rather than move, as for employees:
    // an employee must never run on a missing provider.
    await copyLlmProviderFolder(projectRoot, provider.id, newId)
    await Promise.all(
        providerEmployees.map((employee) =>
            saveEmployee(projectRoot, { ...employee, providerId: newId }),
        ),
    )
    await deleteLlmProviderFolder(projectRoot, provider.id)
    return {
        provider,
        renamedProvider: { ...provider, id: newId },
        updatedEmployeeIds: providerEmployees.map(({ id }) => id),
    }
}
