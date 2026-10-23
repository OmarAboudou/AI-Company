import { loadExistingLlmModel } from "../../llm/model/load-existing-llm-model.ts"
import type { EmployeeConfig } from "./schema.ts"

export async function requireEmployeeModel(
    projectRoot: string,
    config: EmployeeConfig,
): Promise<void> {
    await loadExistingLlmModel(projectRoot, config.providerId, config.modelId)
}
