import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../../llm/anthropic-messages/use-fake-anthropic-server.ts"
import type { Message } from "../../../messaging/message/schema.ts"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, runCliWithEnv, projectPath, runCliAsync } =
    useTemporaryProject()

describe("llmco thread create", () => {
    function runGit(...args: string[]) {
        Bun.spawnSync(["git", ...args], { cwd: projectPath() })
    }

    const today = new Date().toISOString().slice(0, 10)

    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("prints the id of the thread, from its date and subject", () => {
        const create = createThread()

        expect(create.exitCode).toBe(0)
        expect(create.stdout).toBe(`${today}-choice-of-framework\n`)
    })

    test("gives the same subject on the same day a numbered id", () => {
        createThread()

        const second = createThread()

        expect(second.stdout).toBe(`${today}-choice-of-framework-2\n`)
    })

    test("-b sends the first message", () => {
        const id = createThread("-b", "Hono or Express?").stdout.trim()

        const show = runCli("thread", "show", id).stdout

        const lastMessage =
            /## Test User, Director \(@director\) · .* UTC\n\n(.*)\n$/

        expect(show).toMatch(lastMessage)
        expect(show.match(lastMessage)?.[1]).toBe("Hono or Express?")
    })

    test("requires a subject", () => {
        const create = runCli("thread", "create")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("--subject")
    })

    test("refuses to write without git's user.name and user.email", () => {
        const withoutGitIdentity = {
            GIT_CONFIG_GLOBAL: "/dev/null",
            GIT_CONFIG_NOSYSTEM: "1",
        }
        runGit("config", "--unset", "user.name")
        const create = ["thread", "create", "-s", "Budget"]

        const creation = runCliWithEnv(withoutGitIdentity, ...create)

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("set `git config user.name`")
        expect(runCli("thread", "list").stdout).toContain("No threads yet.")
    })
})

describe("mentions", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("thread", "create", "-s", "Budget")
    })

    beforeEach(() => {
        runCli("position", "create", "backend-developer", "-t", "Backend")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
    })

    test("thread create refuses it before creating the thread", () => {
        const create = runCli(
            "thread",
            "create",
            "-s",
            "Review",
            "-b",
            "@backend-developer:claude-senior?",
        )
        const list = runCli("thread", "list").stdout

        expect(create.exitCode).toBe(1)
        expect(list).not.toContain("Review")
    })
})

describe("the person at the keyboard writes in threads", () => {
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

    test("a human employee writes from their only position", () => {
        runCli("position", "assign", "graphics", "julie")

        const threadId = createThread(asJulie, "A new logo.")
        const show = runCli("thread", "show", threadId).stdout

        expect(lastMessage(threadId)).toEqual({
            position: { id: "graphics", title: "graphics" },
            employee: { id: "julie", name: "Julie" },
            committer: { name: "Test User", email: "test@example.com" },
            mentions: [],
            sentAt: expect.any(String),
            id: expect.any(String),
            body: "A new logo.",
        })
        expect(show).toContain("Created by Julie, graphics (@graphics)")
    })

    test("a human employee working no position can't write", () => {
        const create = ["thread", "create", "-s", "Logo"]

        const creation = runCliWithEnv(asJulie, ...create)

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain(
            "`llmco position assign-temporarily employee <position-id> julie`",
        )
        expect(runCli("thread", "list").stdout).toContain("No threads yet.")
    })
})

describe("--as-position", () => {
    const interimEmployee = ["position", "interim", "employee"]

    const interimDirectors = ["position", "interim", "directors"]

    function switchedTo(employeeId: string) {
        return { LLMCO_CURRENT_HUMAN_ID: employeeId }
    }

    const asJulie = switchedTo("julie")

    function hireLlmEmployee(id: string) {
        const connection = ["provider", "connection", "create", "anthropic"]
        const hire = ["employee", "create", "llm", id, "-n", "Claude Senior"]
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        runCli(...connection, "anthropic-messages", "-u", "https://x.test")
        runCli("model", "create", "anthropic", "opus", "-n", "O", "-a", "o")
        runCli(...hire, "-p", "anthropic", "-m", "opus")
    }

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

    test("thread create --as-position writes from one of the positions you work", () => {
        runCli(...interimDirectors, "support")

        const create = createThread({}, "--as-position", "support")
        const threadId = create.stdout.trim()
        const show = runCli("thread", "show", threadId).stdout

        expect(lastPositionId(threadId)).toBe("support")
        expect(show).toContain("Created by Test User, support (@support)")
    })

    test("lets a human employee working several positions choose one", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimEmployee, "support", "julie")

        const refused = createThread(asJulie)
        const chosen = createThread(asJulie, "--as-position", "support")

        expect(refused.exitCode).toBe(1)
        expect(refused.stderr).toContain("Choose one with --as-position.")
        expect(lastPositionId(chosen.stdout.trim())).toBe("support")
    })

    test("refuses a position worked by an LLM employee", () => {
        hireLlmEmployee("claude")
        runCli("position", "assign", "support", "claude")

        const create = createThread({}, "--as-position", "support")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toBe(
            "You don't work position \"support\": Claude Senior, an LLM employee, works it, and nobody writes on an LLM's behalf. Assign it to the directors temporarily first: `llmco position assign-temporarily directors support`.\n",
        )
        expect(runCli("thread", "list").stdout).toContain("No threads yet.")
    })

    test("refuses a vacant position, giving the command to work it", () => {
        const create = createThread(asJulie, "--as-position", "support")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain(
            "it is vacant. A director can assign it to julie temporarily: `llmco position assign-temporarily employee support julie`.",
        )
    })

    test("refuses an employee's default position assigned temporarily to another", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimEmployee, "graphics", "bob")

        const create = createThread(asJulie, "--as-position", "graphics")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain(
            "Bob, a human employee, works it. A director can give it back to julie: `llmco position unassign-temporarily graphics`.",
        )
    })

    test("refuses the director's position to a human employee", () => {
        runCli("position", "assign", "graphics", "julie")

        const create = createThread(asJulie, "--as-position", "director")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("Only directors write from")
    })

    test("refuses an unknown position", () => {
        const create = createThread({}, "--as-position", "marketing")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain('No position "marketing".')
    })
})

describe("an LLM employee answers when its position is mentioned", () => {
    const fakeServer = useFakeAnthropicServer()

    const key = { TEST_ANTHROPIC_KEY: "sk-test" }

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
        runCli("thread", "create", "-s", "Framework")
    })

    test("thread create -b gets its first message answered too", async () => {
        fakeServer.respondWith({ text: "Budget approved." })

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
