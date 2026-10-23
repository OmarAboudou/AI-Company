import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico model update-id", () => {
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
        await Promise.all([
            createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
                name: "Opus",
                apiId: "opus",
            }),
            createLlmModel(projectRoot, "anthropic", "haiku", {
                name: "H",
                apiId: "h",
            }),
        ])
    })

    test("update-id moves the model to its new id", () => {
        const update = runCli("model", "update-id", ...opus, "opus")
        const show = runCli("model", "show", "anthropic", "opus").stdout

        expect(update.stdout).toContain('is now "opus".\n')
        expect(show).toStartWith("# Opus\n")
        expect(runCli("model", "show", ...opus).exitCode).toBe(1)
    })

    test("update-id rewrites the employees running on it", () => {
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "claude-opus-5-5")

        const update = runCli("model", "update-id", ...opus, "opus")
        const list = runCli("employee", "list").stdout

        expect(update.stdout).toContain("updated employees: claude.")
        expect(list).toContain("anthropic/opus")
    })

    test("update-id refuses an id the provider already has", () => {
        const update = runCli("model", "update-id", ...opus, "haiku")

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain('already has a model "haiku".')
        expect(runCli("model", "show", ...opus).exitCode).toBe(0)
    })
})
