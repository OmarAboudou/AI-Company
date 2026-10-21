import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmProvider } from "../../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const anthropicUrl = "https://api.anthropic.com"

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await Promise.all([
        createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" }),
        createLlmProvider(projectRoot, "openrouter", { name: "OpenRouter" }),
    ])
})

function createConnection(...args: string[]) {
    return runCli("provider", "connection", "create", ...args)
}

describe("llmco provider connection create", () => {
    test("list sorts by provider, then by protocol", () => {
        const url = "https://openrouter.ai/api/v1"
        createConnection("openrouter", "openai-responses", "-u", url)
        createConnection("openrouter", "openai-chat-completions", "-u", url)
        createConnection("anthropic", "anthropic-messages", "-u", anthropicUrl)

        const list = runCli("provider", "connection", "list").stdout
        const connectionNames = list
            .trimEnd()
            .split("\n")
            .map((row) => row.split(" ")[0])

        expect(connectionNames).toEqual([
            "anthropic/anthropic-messages",
            "openrouter/openai-chat-completions",
            "openrouter/openai-responses",
        ])
    })

    test("list says so when there is no connection", () => {
        const list = runCli("provider", "connection", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No connections yet.")
    })
})
