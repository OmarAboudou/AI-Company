import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.testing.ts"
import { createLlmConnection } from "../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../llm/provider/create-llm-provider.ts"
import { createThread } from "../../messaging/thread/create-thread.ts"
import { createCompany } from "../../organization/company/create-company.ts"
import { createEmployee } from "../../organization/employee/create-employee.ts"
import { assignPosition } from "../../organization/position/assign-position.ts"
import { createPosition } from "../../organization/position/create-position.ts"
import { useTemporaryProject } from "../use-temporary-project.testing.ts"

const { runCli, runCliAsync, getProjectPath } = useTemporaryProject()

describe("llmco run", () => {
    const fakeServer = useFakeAnthropicServer()

    const apiKeyEnv = { TEST_ANTHROPIC_KEY: "sk-test" }

    let threadId = ""

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        const [{ thread }] = await Promise.all([
            createThread(projectRoot, {}, { subject: "Stack" }),
            createLlmProvider(projectRoot, "anthropic", {
                name: "A",
                apiKeySource: { kind: "env", variable: "TEST_ANTHROPIC_KEY" },
            }),
            createPosition(projectRoot, "backend-developer", {
                title: "Backend",
                description: "",
            }),
        ])
        threadId = thread.id
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: fakeServer.getUrl() },
        )
        await createLlmModel(projectRoot, "anthropic", "opus", {
            name: "Opus",
            apiId: "claude-opus-5-5",
        })
        await createEmployee(projectRoot, "claude", {
            name: "Claude",
            kind: "llm",
            providerId: "anthropic",
            modelId: "opus",
        })
        await assignPosition(projectRoot, "backend-developer", "claude")
    })

    function ask(body: string) {
        runCli("message", "send", threadId, "-b", body)
    }

    function run() {
        return runCliAsync(apiKeyEnv, "run")
    }

    test("runs the task of a position an LLM works, printing its run", async () => {
        ask("@backend-developer Hono or Express?")
        const answer = { threadId, body: "@director Hono." }
        fakeServer.respondWith({
            text: "The director asks for a framework.",
            toolCalls: [
                { name: "message_send", input: answer },
                { name: "task_mark-as-done", input: { summary: "Answered." } },
            ],
        })

        const running = await run()

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toStartWith("The director asks for a framework.")
        expect(running.stderr).toContain("Claude runs task")
        expect(running.stderr).toContain("→ message_send\n")
        expect(running.stderr).toContain("← Sent as entry #2 of thread")
        expect(running.stderr).toContain("Task done: Answered.")
        expect(running.stderr).toContain("Tokens: 10 in, 100 read from")
    })

    test("then lists the tasks left waiting, and why", async () => {
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
        ask("@qa-tester A test plan?")

        const running = await run()

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toContain("No task is ready. These wait:")
        const waitingRowPattern = /@qa-tester +catch-up-thread +for a vacant/
        expect(running.stdout).toMatch(waitingRowPattern)
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("leaves waiting the task of a position a human works", async () => {
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("position", "assign", "backend-developer", "julie", "-r")
        ask("@backend-developer Hono or Express?")

        const running = await run()

        expect(running.stdout).toContain("for a human employee")
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("stops at an API error, the task staying pending", async () => {
        ask("@backend-developer Hono or Express?")
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const running = await run()

        expect(running.exitCode).toBe(1)
        expect(running.stderr).toContain("invalid x-api-key")
        expect(running.stderr).toContain("stays pending")
    })
})
