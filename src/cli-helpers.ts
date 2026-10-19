import { projectRoot } from "./cli/project-root.ts"
import { companyExists } from "./company/storage.ts"
import type { Employee } from "./employee/employee.ts"
import { employeeExists, loadEmployee } from "./employee/storage.ts"
import { parseId } from "./ids/parse-id.ts"
import type { LlmModel } from "./llm-model/llm-model.ts"
import { llmModelExists, loadLlmModel } from "./llm-model/storage.ts"
import type { LlmProvider } from "./llm-provider/llm-provider.ts"
import { llmProviderExists, loadLlmProvider } from "./llm-provider/storage.ts"
import type { Position } from "./organization/position/schema.ts"
import { hasPosition, loadPosition } from "./organization/position/storage.ts"
import { loadThread, threadExists } from "./thread/storage.ts"
import type { Thread } from "./thread/thread.ts"
import { UserError } from "./user-error.ts"

export async function requireCompany(): Promise<void> {
    if (!(await companyExists(projectRoot))) {
        throw new UserError(
            "No company in this directory. Run `llmco init` first.",
        )
    }
}

export function withoutUndefined<Values extends object>(
    values: Values,
): Partial<Values> {
    return Object.fromEntries(
        Object.entries(values).filter(([, value]) => value !== undefined),
    ) as Partial<Values>
}

export async function loadExistingPosition(rawId: string): Promise<Position> {
    const id = parseId("position", rawId)
    if (!(await hasPosition(projectRoot, id))) {
        throw new UserError(`No position "${id}". Run \`llmco position list\`.`)
    }
    return loadPosition(projectRoot, id)
}

export async function loadExistingEmployee(rawId: string): Promise<Employee> {
    const id = parseId("employee", rawId)
    if (!(await employeeExists(projectRoot, id))) {
        throw new UserError(`No employee "${id}". Run \`llmco employee list\`.`)
    }
    return loadEmployee(projectRoot, id)
}

export async function loadExistingLlmProvider(
    rawId: string,
): Promise<LlmProvider> {
    const id = parseId("provider", rawId)
    if (!(await llmProviderExists(projectRoot, id))) {
        throw new UserError(`No provider "${id}". Run \`llmco provider list\`.`)
    }
    return loadLlmProvider(projectRoot, id)
}

export async function loadExistingLlmModel(
    rawProviderId: string,
    rawModelId: string,
): Promise<LlmModel> {
    const provider = await loadExistingLlmProvider(rawProviderId)
    const modelId = parseId("model", rawModelId)
    if (!(await llmModelExists(projectRoot, provider.id, modelId))) {
        throw new UserError(
            `Provider "${provider.id}" has no model "${modelId}". Run \`llmco model list\`.`,
        )
    }
    return loadLlmModel(projectRoot, provider.id, modelId)
}

export async function loadExistingThread(rawId: string): Promise<Thread> {
    const id = parseId("thread", rawId)
    if (!(await threadExists(projectRoot, id))) {
        throw new UserError(`No thread "${id}". Run \`llmco thread list\`.`)
    }
    return loadThread(projectRoot, id)
}
