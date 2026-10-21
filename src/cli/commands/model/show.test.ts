import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("llmco model", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" })
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
    })

    test("show fails for a model the provider does not have", () => {
        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('has no model "claude-opus-5-5"')
    })
})
