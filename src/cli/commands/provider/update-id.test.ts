import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico provider update-id", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" }),
            createLlmProvider(projectRoot, "ollama", { name: "Ollama" }),
        ])
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
        await createLlmModel(projectRoot, "anthropic", "opus", {
            name: "Opus",
            apiId: "o",
        })
    })

    test("update-id moves the provider with its models", () => {
        const update = runCli("provider", "update-id", "anthropic", "claude")
        const models = runCli("model", "list").stdout

        expect(update.stdout).toBe('Provider "anthropic" is now "claude".\n')
        expect(models).toBe("claude/opus  Opus\n")
        expect(runCli("provider", "show", "anthropic").exitCode).toBe(1)
    })

    test("update-id rewrites the employees running on it", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "opus")

        const update = runCli("provider", "update-id", "anthropic", "claude")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.stdout).toContain("updated employees: claude.")
        expect(show).toContain("provider: claude\nmodel: opus\n")
    })

    test("update-id refuses an id another provider has", () => {
        const update = runCli("provider", "update-id", "anthropic", "ollama")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('Provider "ollama" already exists.')
        expect(runCli("model", "list").stdout).toContain("anthropic/opus")
    })
})
