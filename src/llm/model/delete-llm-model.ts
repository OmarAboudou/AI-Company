import { requireCompany } from "../../organization/company/require-company.ts"
import { listEmployees } from "../../organization/employee/storage.ts"
import { UserError } from "../../user-error.ts"
import { loadExistingLlmModel } from "./load-existing-llm-model.ts"
import type { LlmModel } from "./schema.ts"
import { deleteLlmModelFolder } from "./storage.ts"

export async function deleteLlmModel(
    projectRoot: string,
    rawProviderId: string,
    rawModelId: string,
): Promise<LlmModel> {
    await requireCompany(projectRoot)
    const [model, employees] = await Promise.all([
        loadExistingLlmModel(projectRoot, rawProviderId, rawModelId),
        listEmployees(projectRoot),
    ])
    const modelEmployeeIds = employees
        .filter(
            (employee) =>
                employee.kind === "llm" &&
                employee.providerId === model.providerId &&
                employee.modelId === model.id,
        )
        .map(({ id }) => id)
    if (modelEmployeeIds.length > 0) {
        throw new UserError(
            `Model "${model.id}" of provider "${model.providerId}" is used by ${modelEmployeeIds.join(", ")}. Give these employees another model with \`llmco employee update\`, or delete them, first.`,
        )
    }
    await deleteLlmModelFolder(projectRoot, model.providerId, model.id)
    return model
}
