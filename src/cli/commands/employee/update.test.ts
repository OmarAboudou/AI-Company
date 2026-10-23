import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico employee update", () => {
    async function createProvider(providerId: string, baseUrl: string) {
        const projectRoot = getProjectPath()
        await createLlmProvider(projectRoot, providerId, { name: providerId })
        await createLlmConnection(
            projectRoot,
            providerId,
            "anthropic-messages",
            { baseUrl },
        )
    }

    function createModel(providerId: string, modelId: string) {
        const model = { name: modelId, apiId: modelId }
        return createLlmModel(getProjectPath(), providerId, modelId, model)
    }

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await Promise.all([
            createProvider("anthropic", "https://api.anthropic.com"),
            createProvider("ollama", "http://localhost:11434"),
        ])
        await Promise.all([
            createModel("anthropic", "claude-opus-5-5"),
            createModel("anthropic", "claude-haiku-4-5"),
            createModel("ollama", "llama-3-1-8b"),
        ])
        await createEmployee(projectRoot, "claude", {
            name: "Claude",
            kind: "llm",
            providerId: "anthropic",
            modelId: "claude-opus-5-5",
        })
    })

    test("update -n renames an LLM employee and keeps its model", () => {
        const update = runCli("employee", "update", "claude", "-n", "Claude 2")
        const show = runCli("employee", "show", "claude").stdout

        expect(update.stdout).toBe('Updated employee "claude".\n')
        expect(show).toStartWith("# Claude 2\n")
        expect(show).toContain("model: claude-opus-5-5\n")
    })

    test("update -p and -m move it to another provider", () => {
        const update = ["employee", "update", "claude"]

        runCli(...update, "-p", "ollama", "-m", "llama-3-1-8b")

        const list = runCli("employee", "list").stdout
        expect(list).toContain("ollama/llama-3-1-8b")
    })

    test("update requires at least one option", () => {
        const update = runCli("employee", "update", "claude")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
