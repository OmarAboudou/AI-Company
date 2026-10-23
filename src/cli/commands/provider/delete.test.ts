import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico provider delete", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" })
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
    })

    function createModel(id: string) {
        return runCli("model", "create", "anthropic", id, "-n", id, "-a", id)
    }

    test("delete removes a provider without models", () => {
        const deletion = runCli("provider", "delete", "anthropic")

        expect(deletion.exitCode).toBe(0)
        expect(deletion.stdout).toBe('Deleted provider "anthropic".\n')
        expect(runCli("provider", "list").stdout).toContain("No providers")
    })

    test("delete refuses a provider with models", () => {
        createModel("claude-opus-5-5")
        createModel("claude-haiku-4-5")

        const deletion = runCli("provider", "delete", "anthropic")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("claude-haiku-4-5, claude-opus-5-5")
        expect(deletion.stderr).toContain("--force")
        expect(runCli("model", "list").stdout).toContain("claude-opus-5-5")
    })

    test.each(["--force", "-f"])(
        "delete %s deletes the provider with its models",
        (flag) => {
            createModel("claude-opus-5-5")

            const deletion = runCli("provider", "delete", "anthropic", flag)

            expect(deletion.exitCode).toBe(0)
            expect(deletion.stdout).toContain("its models claude-opus-5-5")
            expect(runCli("model", "list").stdout).toContain("No models")
        },
    )
})
