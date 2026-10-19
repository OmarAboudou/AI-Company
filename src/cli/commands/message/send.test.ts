import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import type { Message } from "../../../messaging/message/schema.ts"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const {
    runCli,
    runCliWithStdin,
    projectPath,
    runCliWithEnv,
    runCliAsync,
    homePath,
} = useTemporaryProject()

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

    test("refuses an empty body", () => {
        const send = runCli("message", "send", threadId, "-b", "  \n")

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("body is empty")
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

    function bodies(): string[] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .trimEnd()
            .split("\n")
            .filter((line) => line !== "")
            .map((line) => JSON.parse(line).body)
    }

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

    test("a message records the positions it mentions", () => {
        const body = "@backend-developer and @qa-tester, thoughts?"

        runCli("message", "send", threadId, "-b", body)

        expect(mentions()).toEqual([["backend-developer", "qa-tester"]])
    })

    test("a mention of no position is reported and ignored", () => {
        const body = "@qa-testers, a test plan?"

        const send = runCli("message", "send", threadId, "-b", body)

        expect(send.exitCode).toBe(0)
        expect(send.stderr).toContain('"@qa-testers" names no position')
        expect(mentions()).toEqual([[]])
    })

    test("the author's own position isn't mentioned", () => {
        runCli("message", "send", threadId, "-b", "Note to @director: done.")

        expect(mentions()).toEqual([[]])
    })

    test("a mention of a specific employee is refused for now", () => {
        const body = "@backend-developer:claude-senior, a review?"

        const send = runCli("message", "send", threadId, "-b", body)

        expect(send.exitCode).toBe(1)
        expect(send.stderr).toContain("Mentioning a specific employee")
        expect(bodies()).toEqual([])
    })
})

describe("the person at the keyboard writes in threads", () => {
    const interimEmployee = ["position", "interim", "employee"]

    const interimDirectors = ["position", "interim", "directors"]

    function switchedTo(employeeId: string) {
        return { LLMCO_CURRENT_HUMAN_ID: employeeId }
    }

    const asJulie = switchedTo("julie")

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("employee", "create", "human", "bob", "-n", "Bob")
        for (const id of ["graphics", "support", "design", "sales"]) {
            runCli("position", "create", id, "-t", id)
        }
    })

    function lastMessage(threadId: string): Omit<Message, "threadId"> {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return JSON.parse(lines.trimEnd().split("\n").at(-1) ?? "")
    }

    function createThread(env: Record<string, string>, body: string) {
        const create = ["thread", "create", "-s", "Logo", "-b", body]
        return runCliWithEnv(env, ...create).stdout.trim()
    }

    function send(env: Record<string, string>, threadId: string) {
        return runCliWithEnv(env, "message", "send", threadId, "-b", "Done.")
    }

    test("a director writes from the only one of their positions in the thread", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimDirectors, "support")
        const threadId = createThread(asJulie, "@support The logo is broken.")

        const sent = send({}, threadId)

        expect(sent.exitCode).toBe(0)
        expect(lastMessage(threadId).position.id).toBe("support")
        expect(lastMessage(threadId).employee).toBeUndefined()
    })

    test("a director writes from the director's position when several of theirs are in the thread", () => {
        runCli(...interimDirectors, "support")
        const threadId = createThread({}, "@support Can you check?")

        send({}, threadId)

        expect(lastMessage(threadId).position.id).toBe("director")
    })

    test("a human employee writes from the only one of their positions in the thread", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimEmployee, "support", "julie")
        const threadId = createThread({}, "@support Can you check?")

        send(asJulie, threadId)

        expect(lastMessage(threadId).position.id).toBe("support")
    })

    test("a human employee with several positions, none in the thread, can't write", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimEmployee, "support", "julie")
        const threadId = createThread({}, "Hello.")

        const sent = send(asJulie, threadId)

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain(
            "Julie (julie) works several positions, graphics, support:",
        )
        expect(lastMessage(threadId).position.id).toBe("director")
    })
})

describe("--as-position", () => {
    const interimDirectors = ["position", "interim", "directors"]

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("employee", "create", "human", "bob", "-n", "Bob")
        for (const id of ["graphics", "support", "design", "sales"]) {
            runCli("position", "create", id, "-t", id)
        }
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

describe("an LLM employee answers when its position is mentioned", () => {
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

    function messages(): { employee?: { id: string }; body: string }[] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .split("\n")
            .filter((line) => line !== "")
            .map((line) => JSON.parse(line))
    }

    test("message send prints the answer as it streams", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const sent = await send(question)

        expect(sent.exitCode).toBe(0)
        expect(sent.stdout).toBe("Hono, for Bun.\n")
        expect(sent.stderr).toContain("Claude Senior answers as Backend")
    })

    test("the answer is a message of the thread, by the employee", async () => {
        fakeServer.respondWith({ text: "Hono, for Bun." })

        await send(question)
        const [, answer] = messages()

        expect(messages()).toHaveLength(2)
        expect(answer?.employee?.id).toBe("claude")
        expect(answer?.body).toBe("Hono, for Bun.")
    })

    test("the request carries the model, the prompt and the thread", async () => {
        await send(question)
        const [request] = fakeServer.requests
        const lastTurn = request?.body.messages.at(-1)?.content.at(-1)?.text

        expect(request?.path).toBe("/v1/messages")
        expect(request?.body.model).toBe("claude-opus-5-5")
        expect(request?.body.max_tokens).toBe(64_000)
        expect(request?.body.stream).toBe(true)
        expect(request?.body.system).toStartWith("You are Claude Senior,")
        expect(lastTurn).toEndWith(`">\n${question}\n</message>`)
    })

    test("the key is sent as x-api-key, from its variable", async () => {
        await send(question)
        const headers = fakeServer.requests[0]?.headers

        expect(headers?.["x-api-key"]).toBe("sk-test")
        expect(headers?.authorization).toBeUndefined()
    })

    test("a bearer connection sends the key as a bearer token", async () => {
        const connection = ["provider", "connection", "update", "anthropic"]
        runCli(...connection, "anthropic-messages", "-a", "bearer")

        await send(question)
        const headers = fakeServer.requests[0]?.headers

        expect(headers?.authorization).toBe("Bearer sk-test")
        expect(headers?.["x-api-key"]).toBeUndefined()
    })

    test("a provider without a key sends no key", async () => {
        const configPath = projectPath(
            ".llmco",
            "llm-providers",
            "anthropic",
            "config.json",
        )
        const { apiKey, ...config } = await Bun.file(configPath).json()
        await Bun.write(configPath, JSON.stringify(config))

        const sent = await send(question, {})
        const headers = fakeServer.requests[0]?.headers

        expect(apiKey).toEqual({ kind: "env", variable: "TEST_ANTHROPIC_KEY" })
        expect(sent.exitCode).toBe(0)
        expect(headers?.["x-api-key"]).toBeUndefined()
        expect(headers?.authorization).toBeUndefined()
    })

    test("the provider's raw response is stored next to the answer", async () => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })

        await send(question)
        const answerId = runCli("thread", "show", threadId, "--json")
            .stdout.trimEnd()
            .split("\n")
            .map((line) => JSON.parse(line).id)
            .at(-1)
        const response = await Bun.file(
            projectPath(
                ".llmco",
                "threads",
                threadId,
                "messages",
                answerId,
                "response.json",
            ),
        ).json()

        expect(response.protocol).toBe("anthropic-messages")
        expect(response.apiId).toBe("claude-opus-5-5")
        expect(response.response.content[0]).toEqual({
            type: "thinking",
            thinking: "",
            signature: "sig-1",
        })
    })

    test("the employee's own answer comes back exactly, thinking included", async () => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })
        await send(question)

        await send("@backend-developer Why?")
        const turns = fakeServer.requests[1]?.body.messages ?? []
        const types = turns[1]?.content.map(({ type }) => type)

        expect(turns.map(({ role }) => role)).toEqual([
            "user",
            "assistant",
            "user",
        ])
        expect(types).toEqual(["thinking", "text"])
    })

    test("a renamed employee still gets its own answer back", async () => {
        fakeServer.respondWith({ text: "Hono.", signature: "sig-1" })
        await send(question)
        runCli("employee", "update-id", "claude", "claude-lead")

        await send("@backend-developer Why?")
        const turns = fakeServer.requests[1]?.body.messages ?? []
        const types = turns[1]?.content.map(({ type }) => type)

        expect(turns.map(({ role }) => role)).toEqual([
            "user",
            "assistant",
            "user",
        ])
        expect(types).toEqual(["thinking", "text"])
    })

    test("an answer mentioning the director makes it awaited", async () => {
        fakeServer.respondWith({ text: "Hono. @director, do you agree?" })
        const before = runCli("thread", "list").stdout

        await send(question)
        const after = runCli("thread", "list").stdout

        expect(before).not.toContain("awaiting")
        expect(after).toContain("awaiting @director")
    })
})

describe("when nobody answers", () => {
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

    test("a missing key is an error, and the mention stays awaited", async () => {
        const sent = await send(question, {})
        const list = runCli("thread", "list").stdout

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain("TEST_ANTHROPIC_KEY, which isn't set")
        expect(fakeServer.requests).toHaveLength(0)
        expect(list).toContain("awaiting @backend-developer")
    })

    test("an API error is reported, and the mention stays awaited", async () => {
        fakeServer.respondWith({ status: 401, error: "invalid x-api-key" })

        const sent = await send(question)
        const list = runCli("thread", "list").stdout

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain("invalid x-api-key")
        expect(list).toContain("awaiting @backend-developer")
    })

    test("a model called through another protocol isn't called yet", async () => {
        const url = `${fakeServer.getUrl()}/v1`
        const connection = ["provider", "connection", "create", "anthropic"]
        runCli(...connection, "openai-chat-completions", "-u", url)
        runCli(
            "model",
            "update",
            "anthropic",
            "opus",
            "-p",
            "openai-chat-completions",
        )

        const sent = await send(question)

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain("which llmco can't call yet")
        expect(fakeServer.requests).toHaveLength(0)
    })
})

describe("whoever works the position now answers", () => {
    const interimEmployee = ["position", "interim", "employee"]

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

    function messages(): { employee?: { id: string }; body: string }[] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .split("\n")
            .filter((line) => line !== "")
            .map((line) => JSON.parse(line))
    }

    beforeEach(() => {
        runCli("employee", "create", "human", "julie", "-n", "Julie")
    })

    test("an LLM employee assigned temporarily answers instead of the default employee", async () => {
        runCli("position", "assign", "backend-developer", "julie", "-r")
        runCli(...interimEmployee, "backend-developer", "claude")
        fakeServer.respondWith({ text: "Hono, for Bun." })

        const sent = await send(question)
        const [, answer] = messages()

        expect(sent.exitCode).toBe(0)
        expect(sent.stderr).toContain("Claude Senior answers as Backend")
        expect(answer?.employee?.id).toBe("claude")
    })

    test("a human employee assigned temporarily leaves the message waiting", async () => {
        runCli(...interimEmployee, "backend-developer", "julie")

        const sent = await send(question)

        expect(sent.exitCode).toBe(0)
        expect(sent.stderr).toContain("worked by Julie, a human")
        expect(fakeServer.requests).toHaveLength(0)
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

    test("the default employee answers again once the temporary assignment ends", async () => {
        runCli(...interimDirectors, "backend-developer")
        runCli("position", "end-interim", "backend-developer")

        const sent = await send(question)

        expect(sent.stderr).toContain("Claude Senior answers as Backend")
        expect(fakeServer.requests).toHaveLength(1)
    })
})

describe("a key read from a file", () => {
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

    function useKeyFile(path: string) {
        runCli("provider", "update", "anthropic", "-k", path)
    }

    test("outside the repository, is read, ~ being the home", async () => {
        await Bun.write(homePath("keys", "anthropic"), "sk-from-file\n")
        useKeyFile("~/keys/anthropic")

        await send(question, {})

        expect(fakeServer.requests[0]?.headers["x-api-key"]).toBe(
            "sk-from-file",
        )
    })

    test("inside the repository, must be ignored by git", async () => {
        await Bun.write(projectPath("secrets", "anthropic"), "sk-in-repo")
        useKeyFile("secrets/anthropic")

        const refused = await send(question, {})
        await Bun.write(projectPath(".gitignore"), "secrets/\n")
        const accepted = await send("@backend-developer Again?", {})

        expect(refused.exitCode).toBe(1)
        expect(refused.stderr).toContain("not ignored by git")
        expect(accepted.exitCode).toBe(0)
        expect(fakeServer.requests[0]?.headers["x-api-key"]).toBe("sk-in-repo")
    })
})
