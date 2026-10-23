import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico model delete", () => {
    const opus = ["anthropic", "claude-opus-5-5"]

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
            name: "Opus",
            apiId: "opus",
        })
    })

    test("delete removes a model no employee runs on", () => {
        const deletion = runCli("model", "delete", ...opus)

        expect(deletion.exitCode).toBe(0)
        expect(runCli("model", "list").stdout).toContain("No models yet.")
    })

    test("delete refuses a model an employee runs on", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")

        const deletion = runCli("model", "delete", ...opus)

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("is used by claude.")
        expect(deletion.stderr).toContain("aico employee update")
        expect(runCli("model", "show", ...opus).exitCode).toBe(0)
    })

    test("delete has no --force: it would leave employees without a model", () => {
        const deletion = runCli("model", "delete", ...opus, "--force")

        expect(deletion.exitCode).toBe(1)
        expect(deletion.stderr).toContain("unknown option '--force'")
    })
})
