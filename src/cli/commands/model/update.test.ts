import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico model protocol", () => {
    const opus = ["anthropic", "claude-opus-5-5", "-n", "Opus", "-a", "opus"]
    const openRouterUrl = "https://openrouter.ai/api"

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
        await createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" })
    })

    function connect(protocol: string, url = openRouterUrl) {
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            protocol,
            "-u",
            url,
        )
    }

    test("update -p moves the model to another connection", () => {
        connect("anthropic-messages")
        runCli("model", "create", ...opus)
        connect("openai-responses", `${openRouterUrl}/v1`)
        const model = ["anthropic", "claude-opus-5-5"]
        const before = runCli("model", "show", ...model).stdout

        runCli("model", "update", ...model, "-p", "openai-responses")
        const after = runCli("model", "show", ...model).stdout

        expect(before).toContain("protocol: anthropic-messages\n")
        expect(after).toContain("protocol: openai-responses\n")
    })
})

describe("aico model update", () => {
    const opus = ["anthropic", "claude-opus-5-5"]

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
        await createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
            name: "Opus",
            apiId: "claude-opus",
        })
    })

    test("update -a changes the api id and keeps the name", () => {
        const update = runCli("model", "update", ...opus, "-a", "opus-v2")
        const show = runCli("model", "show", ...opus).stdout

        expect(update.stdout).toContain('Updated model "claude-opus-5-5"')
        expect(show).toContain(
            "# Opus\n\nprovider: anthropic\napi id: opus-v2\n",
        )
    })

    test("update -n changes the name and keeps the api id", () => {
        runCli("model", "update", ...opus, "-n", "Claude Opus 5.5")

        const show = runCli("model", "show", ...opus).stdout

        expect(show).toContain("# Claude Opus 5.5\n")
        expect(show).toContain("api id: claude-opus\n")
    })

    test("update requires at least one option", () => {
        const update = runCli("model", "update", ...opus)

        expect(update.exitCode).toBe(1)
        expect(update.stderr).toContain("Nothing to update")
    })
})
