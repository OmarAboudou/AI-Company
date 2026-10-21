import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("llmco employee", () => {
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
        await createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
        })
    })

    test("hire is an alias of create", () => {
        const hiring = runCli("employee", "hire", "human", "omar", "-n", "Omar")
        expect(hiring.exitCode).toBe(0)

        expect(runCli("employee", "show", "omar").stdout).toBe(
            "# Omar\n\nkind: human\npositions: (none)\n",
        )
    })

    test("create requires the kind before the id", () => {
        const creation = runCli("employee", "create", "omar", "-n", "Omar")

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("unknown command 'omar'")
    })
})
