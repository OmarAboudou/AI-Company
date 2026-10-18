import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"
import { useFakeAnthropic } from "./fake-anthropic.ts"

const { runCli, runCliAsync, projectPath, homePath } = useTemporaryProject()
const fake = useFakeAnthropic()

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
        fake.url(),
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
    runCli("position", "create", "backend-developer", "-t", "Backend Developer")
    const hire = ["employee", "create", "llm", "claude", "-n", "Claude Senior"]
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

describe("an LLM employee answers when its position is mentioned", () => {
    test("message send prints the answer as it streams", async () => {
        fake.respondWith({ text: "Hono, for Bun." })

        const sent = await send(question)

        expect(sent.exitCode).toBe(0)
        expect(sent.stdout).toBe("Hono, for Bun.\n")
        expect(sent.stderr).toContain("Claude Senior answers as Backend")
    })

    test("the answer is a message of the thread, by the employee", async () => {
        fake.respondWith({ text: "Hono, for Bun." })

        await send(question)
        const [, answer] = messages()

        expect(messages()).toHaveLength(2)
        expect(answer?.employee?.id).toBe("claude")
        expect(answer?.body).toBe("Hono, for Bun.")
    })

    test("the request carries the model, the prompt and the thread", async () => {
        await send(question)
        const [request] = fake.requests
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
        const headers = fake.requests[0]?.headers

        expect(headers?.["x-api-key"]).toBe("sk-test")
        expect(headers?.authorization).toBeUndefined()
    })

    test("a bearer connection sends the key as a bearer token", async () => {
        const connection = ["provider", "connection", "update", "anthropic"]
        runCli(...connection, "anthropic-messages", "-a", "bearer")

        await send(question)
        const headers = fake.requests[0]?.headers

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
        const headers = fake.requests[0]?.headers

        expect(apiKey).toEqual({ kind: "env", variable: "TEST_ANTHROPIC_KEY" })
        expect(sent.exitCode).toBe(0)
        expect(headers?.["x-api-key"]).toBeUndefined()
        expect(headers?.authorization).toBeUndefined()
    })

    test("the provider's raw response is stored next to the answer", async () => {
        fake.respondWith({ text: "Hono.", signature: "sig-1" })

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
        fake.respondWith({ text: "Hono.", signature: "sig-1" })
        await send(question)

        await send("@backend-developer Why?")
        const turns = fake.requests[1]?.body.messages ?? []
        const types = turns[1]?.content.map(({ type }) => type)

        expect(turns.map(({ role }) => role)).toEqual([
            "user",
            "assistant",
            "user",
        ])
        expect(types).toEqual(["thinking", "text"])
    })

    test("a renamed employee still gets its own answer back", async () => {
        fake.respondWith({ text: "Hono.", signature: "sig-1" })
        await send(question)
        runCli("employee", "update-id", "claude", "claude-lead")

        await send("@backend-developer Why?")
        const turns = fake.requests[1]?.body.messages ?? []
        const types = turns[1]?.content.map(({ type }) => type)

        expect(turns.map(({ role }) => role)).toEqual([
            "user",
            "assistant",
            "user",
        ])
        expect(types).toEqual(["thinking", "text"])
    })

    test("an answer mentioning the director makes it awaited", async () => {
        fake.respondWith({ text: "Hono. @director, do you agree?" })
        const before = runCli("thread", "list").stdout

        await send(question)
        const after = runCli("thread", "list").stdout

        expect(before).not.toContain("awaiting")
        expect(after).toContain("awaiting @director")
    })

    test("thread create -b gets its first message answered too", async () => {
        fake.respondWith({ text: "Budget approved." })

        const create = await runCliAsync(
            key,
            "thread",
            "create",
            "-s",
            "Budget",
            "-b",
            "@backend-developer 50 € for the API?",
        )
        const [id, answer] = create.stdout.split("\n")

        expect(id).toMatch(/-budget$/)
        expect(answer).toBe("Budget approved.")
    })
})

describe("when nobody answers", () => {
    test("a vacant position leaves the message waiting", async () => {
        runCli("position", "create", "qa-tester", "-t", "QA Tester")

        const sent = await send("@qa-tester a test plan?")

        expect(sent.exitCode).toBe(0)
        expect(sent.stderr).toContain("@qa-tester is vacant")
        expect(fake.requests).toHaveLength(0)
    })

    test("a position worked by a human leaves the message waiting", async () => {
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("position", "assign", "backend-developer", "julie", "-r")

        const sent = await send(question)

        expect(sent.stderr).toContain("worked by Julie, a human")
        expect(fake.requests).toHaveLength(0)
    })

    test("a missing key is an error, and the mention stays awaited", async () => {
        const sent = await send(question, {})
        const list = runCli("thread", "list").stdout

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain("TEST_ANTHROPIC_KEY, which isn't set")
        expect(fake.requests).toHaveLength(0)
        expect(list).toContain("awaiting @backend-developer")
    })

    test("an API error is reported, and the mention stays awaited", async () => {
        fake.respondWith({ status: 401, error: "invalid x-api-key" })

        const sent = await send(question)
        const list = runCli("thread", "list").stdout

        expect(sent.exitCode).toBe(1)
        expect(sent.stderr).toContain("invalid x-api-key")
        expect(list).toContain("awaiting @backend-developer")
    })

    test("a model called through another protocol isn't called yet", async () => {
        const url = `${fake.url()}/v1`
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
        expect(fake.requests).toHaveLength(0)
    })
})

describe("a key read from a file", () => {
    function useKeyFile(path: string) {
        runCli("provider", "update", "anthropic", "-k", path)
    }

    test("outside the repository, is read, ~ being the home", async () => {
        await Bun.write(homePath("keys", "anthropic"), "sk-from-file\n")
        useKeyFile("~/keys/anthropic")

        await send(question, {})

        expect(fake.requests[0]?.headers["x-api-key"]).toBe("sk-from-file")
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
        expect(fake.requests[0]?.headers["x-api-key"]).toBe("sk-in-repo")
    })
})
