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
    test("create then list shows the URL and how the key is sent", () => {
        const creation = createConnection(
            "anthropic",
            "anthropic-messages",
            "-u",
            anthropicUrl,
        )
        const list = runCli("provider", "connection", "list").stdout

        expect(creation.stdout).toBe(
            'Created the anthropic-messages connection of provider "anthropic".\n',
        )
        expect(list).toBe(
            `anthropic/anthropic-messages  ${anthropicUrl}  x-api-key\n`,
        )
    })

    test("--auth bearer sends the key as a bearer token", () => {
        const url = "https://openrouter.ai/api"
        createConnection(
            "openrouter",
            "anthropic-messages",
            "-u",
            url,
            "--auth",
            "bearer",
        )

        const list = runCli("provider", "connection", "list").stdout

        expect(list).toBe(`openrouter/anthropic-messages  ${url}  bearer\n`)
    })

    test("create refuses a protocol the provider already has", () => {
        createConnection("anthropic", "anthropic-messages", "-u", anthropicUrl)

        const duplicate = createConnection(
            "anthropic",
            "anthropic-messages",
            "-u",
            "https://example.com",
        )
        const list = runCli("provider", "connection", "list").stdout

        expect(duplicate.exitCode).toBe(1)
        expect(duplicate.stderr).toContain(
            "already has a connection through anthropic",
        )
        expect(list).toContain(anthropicUrl)
    })

    test("create refuses an unknown protocol", () => {
        const creation = createConnection(
            "anthropic",
            "gemini",
            "-u",
            anthropicUrl,
        )

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("anthropic-messages")
    })
})
