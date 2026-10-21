import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { createTemporaryCompany } from "../../organization/company/create-temporary-company.testing.ts"
import { UserError } from "../../user-error.ts"
import { createLlmConnection } from "../connection/create-llm-connection.ts"
import { createLlmModel } from "../model/create-llm-model.ts"
import { updateLlmModel } from "../model/update-llm-model.ts"
import { createLlmProvider } from "../provider/create-llm-provider.ts"
import { loadAnthropicMessagesModel } from "./load-anthropic-messages-model.ts"

const variableName = "TEST_ANTHROPIC_KEY"
const environment = { [variableName]: "sk-test" }
const baseUrl = "http://localhost:4000"
let projectRoot: string

beforeEach(async () => {
    projectRoot = await createTemporaryCompany()
    await createLlmProvider(projectRoot, "anthropic", {
        name: "Anthropic",
        apiKeySource: { kind: "env", variable: variableName },
    })
    await createLlmConnection(projectRoot, "anthropic", "anthropic-messages", {
        baseUrl,
    })
    await createLlmModel(projectRoot, "anthropic", "opus", {
        name: "Opus",
        apiId: "claude-opus-5-5",
    })
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

const opusIds = { providerId: "anthropic", modelId: "opus" }

describe("loadAnthropicMessagesModel", () => {
    test("gives the model, its provider, its connection and API key", async () => {
        const anthropicMessagesModel = await loadAnthropicMessagesModel(
            projectRoot,
            environment,
            opusIds,
        )

        expect(anthropicMessagesModel).toMatchObject({
            provider: { id: "anthropic" },
            model: { id: "opus", apiId: "claude-opus-5-5" },
            connection: { baseUrl },
            apiKey: "sk-test",
        })
    })

    test("refuses a model called through another protocol", async () => {
        const protocol = "openai-chat-completions"
        await createLlmConnection(projectRoot, "anthropic", protocol, {
            baseUrl: `${baseUrl}/v1`,
        })
        await updateLlmModel(projectRoot, "anthropic", "opus", { protocol })

        const loading = loadAnthropicMessagesModel(
            projectRoot,
            environment,
            opusIds,
        )

        await expect(loading).rejects.toThrow(UserError)
        await expect(loading).rejects.toThrow("which llmco can't call yet")
    })

    test("refuses without the provider's key", async () => {
        const loading = loadAnthropicMessagesModel(projectRoot, {}, opusIds)

        await expect(loading).rejects.toThrow("which isn't set")
    })
})
