import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico model", () => {
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

    function createOpus(providerId = "anthropic") {
        return runCli(
            "model",
            "create",
            providerId,
            "claude-opus-5-5",
            "--name",
            "Claude Opus 5.5",
            "--api-id",
            "claude-opus-5-5",
        )
    }

    test("create then show displays the provider, api id and protocol", () => {
        expect(createOpus().exitCode).toBe(0)

        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")
        expect(show.exitCode).toBe(0)
        expect(show.stdout).toBe(
            "# Claude Opus 5.5\n\nprovider: anthropic\napi id: claude-opus-5-5\nprotocol: anthropic-messages\n",
        )
    })

    test("create refuses an id the provider already has", () => {
        createOpus()

        const duplicate = createOpus()

        expect(duplicate.exitCode).toBe(1)
        expect(duplicate.stderr).toContain("already has a model")
    })

    test("create requires an api id", () => {
        const create = ["model", "create", "anthropic", "claude-opus-5-5"]

        const creationWithoutApiId = runCli(...create, "-n", "Claude Opus 5.5")

        expect(creationWithoutApiId.exitCode).toBe(1)
        expect(creationWithoutApiId.stderr).toContain("--api-id")
    })
})

describe("aico model protocol", () => {
    const opus = ["anthropic", "claude-opus-5-5", "-n", "Opus", "-a", "opus"]
    const openRouterUrl = "https://openrouter.ai/api"

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
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

    test.each(["--protocol", "-p"])("create %s picks the protocol", (flag) => {
        connect("anthropic-messages")
        connect("openai-chat-completions", `${openRouterUrl}/v1`)

        runCli("model", "create", ...opus, flag, "openai-chat-completions")
        const show = runCli("model", "show", "anthropic", "claude-opus-5-5")

        expect(show.stdout).toContain("protocol: openai-chat-completions\n")
    })
})
