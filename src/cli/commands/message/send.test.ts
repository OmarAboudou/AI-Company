import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, runCliWithStdin, projectPath, runCliWithEnv, runCliAsync } =
    useTemporaryProject()

describe("llmco message send", () => {
    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        threadId = runCli("thread", "create", "-s", "Budget").stdout.trim()
    })

    function bodies(): string[] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .trimEnd()
            .split("\n")
            .filter((line) => line !== "")
            .map((line) => JSON.parse(line).body)
    }

    test("-b adds a message at the end of the thread", () => {
        runCli("message", "send", threadId, "-b", "First.")

        const send = runCli("message", "send", threadId, "--body", "Second.")

        const sent = /^Sent message "\d{8}-\d{6}-\d{3}-[0-9a-f]{4}" in thread/

        expect(send.stderr).toMatch(sent)
        expect(bodies()).toEqual(["First.", "Second."])
    })

    test("-F reads the body from a file", async () => {
        await Bun.write(projectPath("budget.md"), "# Budget\n\n- API: 50 €\n")

        runCli("message", "send", threadId, "-F", "budget.md")

        expect(bodies()).toEqual(["# Budget\n\n- API: 50 €\n"])
    })

    test("-F - reads the body from stdin", () => {
        runCliWithStdin("From stdin.\n", "message", "send", threadId, "-F", "-")

        expect(bodies()).toEqual(["From stdin.\n"])
    })

    test("requires a body", () => {
        const send = runCli("message", "send", threadId)

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("-b, --body or -F, --body-file")
        expect(bodies()).toEqual([])
    })

    test("refuses a body and a body file at once", () => {
        const send = runCli(
            "message",
            "send",
            threadId,
            "-b",
            "Inline.",
            "-F",
            "budget.md",
        )

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("cannot be used with")
    })

    test("fails for an unknown thread", () => {
        const send = runCli("message", "send", "2026-10-18-nothing", "-b", "Hi")

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain('No thread "2026-10-18-nothing".')
    })
})

describe("mentions", () => {
    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        threadId = runCli("thread", "create", "-s", "Budget").stdout.trim()
    })

    beforeEach(() => {
        runCli("position", "create", "backend-developer", "-t", "Backend")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
    })

    function mentions(): string[][] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .trimEnd()
            .split("\n")
            .map((line) => JSON.parse(line).mentions)
    }

    test("a mention of no position is reported and ignored", () => {
        const body = "@qa-testers, a test plan?"

        const send = runCli("message", "send", threadId, "-b", body)

        expect(send.exitCode).toBe(0)
        expect(send.stderr).toContain('"@qa-testers" names no position')
        expect(mentions()).toEqual([[]])
    })
})

describe("--as-position", () => {
    const interimDirectors = ["position", "interim", "directors"]

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "support", "-t", "support")
    })

    function lastPositionId(threadId: string): string {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return JSON.parse(lines.trimEnd().split("\n").at(-1) ?? "").position.id
    }

    function createThread(env: Record<string, string>, ...options: string[]) {
        const create = ["thread", "create", "-s", "Logo", "-b", "Hello."]
        return runCliWithEnv(env, ...create, ...options)
    }

    test("message send -a overrides the position chosen by default", () => {
        runCli(...interimDirectors, "support")
        const threadId = createThread({}).stdout.trim()
        const send = ["message", "send", threadId, "-b", "Done."]

        runCli(...send, "-a", "support")

        expect(lastPositionId(threadId)).toBe("support")
    })
})

describe("the answers of the positions it mentions", () => {
    const interimDirectors = ["position", "interim", "directors"]

    const fakeServer = useFakeAnthropicServer()

    const key = { TEST_ANTHROPIC_KEY: "sk-test" }

    const question = "@backend-developer Hono or Express?"

    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli(
            "provider",
            "create",
            "anthropic",
            "-n",
            "A",
            "-e",
            "TEST_ANTHROPIC_KEY",
        )
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            "anthropic-messages",
            "-u",
            fakeServer.getUrl(),
        )
        runCli(
            "model",
            "create",
            "anthropic",
            "opus",
            "-n",
            "Opus",
            "-a",
            "claude-opus-5-5",
        )
        runCli(
            "position",
            "create",
            "backend-developer",
            "-t",
            "Backend Developer",
        )
        const hire = [
            "employee",
            "create",
            "llm",
            "claude",
            "-n",
            "Claude Senior",
        ]
        runCli(...hire, "-p", "anthropic", "-m", "opus")
        runCli("position", "assign", "backend-developer", "claude")
        threadId = runCli("thread", "create", "-s", "Framework").stdout.trim()
    })

    function send(body: string, env: Record<string, string> = key) {
        return runCliAsync(env, "message", "send", threadId, "-b", body)
    }

    test("message send prints the answer as it streams", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const sent = await send(question)

        expect(sent.exitCode).toBe(0)
        expect(sent.stdout).toBe("Hono, for Bun.\n")
        expect(sent.stderr).toContain("Claude Senior answers as Backend")
    })

    test("a vacant position leaves the message waiting", async () => {
        runCli("position", "create", "qa-tester", "-t", "QA Tester")

        const sent = await send("@qa-tester a test plan?")

        expect(sent.exitCode).toBe(0)
        expect(sent.stderr).toContain("@qa-tester is vacant")
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("a position worked by a human leaves the message waiting", async () => {
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("position", "assign", "backend-developer", "julie", "-r")

        const sent = await send(question)

        expect(sent.stderr).toContain("worked by Julie, a human")
        expect(fakeServer.requests).toHaveLength(0)
    })

    test("an API error is reported, and the mention stays awaited", async () => {
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const sent = await send(question)
        const list = runCli("thread", "list").stdout

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain("invalid x-api-key")
        expect(list).toContain("awaiting @backend-developer")
    })

    test("a position assigned temporarily to the directors leaves the message waiting", async () => {
        runCli(...interimDirectors, "backend-developer")

        const sent = await send(question)
        const list = runCli("thread", "list").stdout

        expect(sent.exitCode).toBe(0)
        expect(sent.stderr).toContain(
            "@backend-developer is worked by the directors",
        )
        expect(fakeServer.requests).toHaveLength(0)
        expect(list).toContain("awaiting @backend-developer")
    })
})
