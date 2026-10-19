import { listLlmModels } from "../../llm-model/storage.ts"
import { requireCompany } from "../../organization/company/require-company.ts"
import { listEmployees } from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmProvider } from "./load-existing-llm-provider.ts"
import type { LlmProvider } from "./schema.ts"
import { deleteLlmProviderFolder } from "./storage.ts"

export type DeleteLlmProviderResult = {
    provider: LlmProvider
    deletedModelIds: string[]
}

export async function deleteLlmProvider(
    projectRoot: string,
    rawId: string,
    { shouldForce = false }: { shouldForce?: boolean } = {},
): Promise<DeleteLlmProviderResult> {
    await requireCompany(projectRoot)
    const provider = await loadExistingLlmProvider(projectRoot, rawId)
    const [models, employees] = await Promise.all([
        listLlmModels(projectRoot, provider.id),
        listEmployees(projectRoot),
    ])
    const providerEmployeeIds = employees
        .filter(
            (employee) =>
                employee.kind === "llm" && employee.providerId === provider.id,
        )
        .map(({ id }) => id)
    if (providerEmployeeIds.length > 0) {
        throw new UserError(
            `Provider "${provider.id}" is used by ${providerEmployeeIds.join(", ")}. Give these employees another model with \`llmco employee update\`, or delete them, first; --force doesn't change that.`,
        )
    }
    const modelIds = models.map(({ id }) => id)
    if (modelIds.length > 0 && !shouldForce) {
        throw new UserError(
            `Provider "${provider.id}" has models ${modelIds.join(", ")}. Add --force to delete them with it.`,
        )
    }
    await deleteLlmProviderFolder(projectRoot, provider.id)
    return { provider, deletedModelIds: modelIds }
}
