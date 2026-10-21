import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { useTemporaryProject } from "../use-temporary-project.ts"

const { runCli, runCliAsync } = useTemporaryProject()

describe("llmco run", () => {
    const fakeServer = useFakeAnthropicServer()

    const apiKeyEnv = { TEST_ANTHROPIC_KEY: "sk-test" }

    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        const provider = ["provider", "create", "anthropic", "-n", "A"]
        runCli(...provider, "-e", "TEST_ANTHROPIC_KEY")
        const connection = ["provider", "connection", "create", "anthropic"]
        runCli(...connection, "anthropic-messages", "-u", fakeServer.getUrl())
        const model = ["model", "create", "anthropic", "opus", "-n", "Opus"]
        runCli(...model, "-a", "claude-opus-5-5")
        runCli("position", "create", "backend-developer", "-t", "Backend")
        const hire = ["employee", "create", "llm", "claude", "-n", "Claude"]
        runCli(...hire, "-p", "anthropic", "-m", "opus")
        runCli("position", "assign", "backend-developer", "claude")
        threadId = runCli("thread", "create", "-s", "Stack").stdout.trim()
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
                { name: "task_complete", input: { summary: "Answered." } },
            ],
        })

        const running = await run()

        expect(running.exitCode).toBe(0)
        expect(running.stdout).toStartWith("The director asks for a framework.")
        expect(running.stderr).toContain("Claude runs task")
        expect(running.stderr).toContain("→ message_send\n")
        expect(running.stderr).toContain("← Sent as entry #2 of thread")
        expect(running.stderr).toContain("Task completed: Answered.")
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
