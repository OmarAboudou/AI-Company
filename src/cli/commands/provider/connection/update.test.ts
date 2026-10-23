import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmProvider } from "../../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme" })
    await Promise.all([
        createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" }),
        createLlmProvider(projectRoot, "openrouter", { name: "OpenRouter" }),
    ])
})

function createConnection(...args: string[]) {
    return runCli("provider", "connection", "create", ...args)
}

describe("aico provider connection update", () => {
    beforeEach(() => {
        createConnection(
            "openrouter",
            "anthropic-messages",
            "-u",
            "https://openrouter.ai/api",
            "-a",
            "bearer",
        )
    })

    test("update -u changes the URL and keeps the auth", () => {
        const url = "https://eu.openrouter.ai/api"
        const update = runCli(
            "provider",
            "connection",
            "update",
            "openrouter",
            "anthropic-messages",
            "-u",
            url,
        )
        const list = runCli("provider", "connection", "list").stdout

        expect(update.stdout).toBe(
            'Updated the anthropic-messages connection of provider "openrouter".\n',
        )
        expect(list).toBe(`openrouter/anthropic-messages  ${url}  bearer\n`)
    })

    test("update requires at least one option", () => {
        const update = runCli(
            "provider",
            "connection",
            "update",
            "openrouter",
            "anthropic-messages",
        )

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
