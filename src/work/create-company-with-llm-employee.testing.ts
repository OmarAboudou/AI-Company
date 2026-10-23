import { createLlmConnection } from "../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../llm/provider/create-llm-provider.ts"
import { createThread } from "../messaging/thread/create-thread.ts"
import { createTemporaryCompany } from "../organization/company/create-temporary-company.testing.ts"
import { createEmployee } from "../organization/employee/create-employee.ts"
import { assignPosition } from "../organization/position/assign-position.ts"
import { createPosition } from "../organization/position/create-position.ts"

export type CompanyWithLlmEmployee = { projectRoot: string; threadId: string }

async function createLlmEmployee(
    projectRoot: string,
    baseUrl: string,
): Promise<void> {
    await createLlmProvider(projectRoot, "anthropic", {
        name: "A",
        apiKeySource: { kind: "env", variable: "TEST_ANTHROPIC_KEY" },
    })
    await createLlmConnection(projectRoot, "anthropic", "anthropic-messages", {
        baseUrl,
    })
    const opus = { name: "Opus", apiId: "claude-opus-5-5" }
    await createLlmModel(projectRoot, "anthropic", "opus", opus)
    await createEmployee(projectRoot, "claude", {
        name: "Claude Senior",
        kind: "llm",
        providerId: "anthropic",
        modelId: "opus",
    })
}

export async function createCompanyWithLlmEmployee(
    baseUrl: string,
): Promise<CompanyWithLlmEmployee> {
    const projectRoot = await createTemporaryCompany()
    await Promise.all([
        createLlmEmployee(projectRoot, baseUrl),
        ...["backend-developer", "qa-tester"].map((id) =>
            createPosition(projectRoot, id, { title: id, description: "" }),
        ),
    ])
    await createEmployee(projectRoot, "julie", {
        name: "Julie",
        kind: "llm",
        providerId: "anthropic",
        modelId: "opus",
    })
    await assignPosition(projectRoot, "backend-developer", "claude")
    const { thread } = await createThread(projectRoot, {}, { subject: "Stack" })
    return { projectRoot, threadId: thread.id }
}
