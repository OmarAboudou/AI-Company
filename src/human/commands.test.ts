import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"
import type { Message } from "../message/message.ts"

const { runCli, runCliWithEnv } = useTemporaryProject()

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

describe("llmco whoami", () => {
    test("without LLMCO_CURRENT_HUMAN_ID, shows a director, named by git", () => {
        const whoami = runCli("whoami")

        expect(whoami.exitCode).toBe(0)
        expect(whoami.stdout).toBe(
            "Test User, a director\n" +
                "positions: director\n" +
                "committer: Test User <test@example.com>\n",
        )
    })

    test("an empty LLMCO_CURRENT_HUMAN_ID means a director too", () => {
        const whoami = runCliWithEnv(switchedTo(""), "whoami")

        expect(whoami.stdout).toStartWith("Test User, a director\n")
    })

    test("a director works the positions assigned temporarily to the directors", () => {
        runCli(...interimDirectors, "support")

        const whoami = runCli("whoami").stdout

        expect(whoami).toContain("positions: director, support (temporarily)\n")
    })

    test("shows the human employee LLMCO_CURRENT_HUMAN_ID names, and the committer", () => {
        const whoami = runCliWithEnv(asJulie, "whoami")

        expect(whoami.exitCode).toBe(0)
        expect(whoami.stdout).toBe(
            "Julie (julie), a human employee\n" +
                "positions: (none)\n" +
                "committer: Test User <test@example.com>\n",
        )
    })

    test("lists the positions the employee works now, by default or temporarily", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli("position", "assign", "design", "julie")
        runCli(...interimEmployee, "design", "bob")
        runCli(...interimEmployee, "support", "julie")

        const whoami = runCliWithEnv(asJulie, "whoami").stdout

        expect(whoami).toContain("positions: graphics, support (temporarily)\n")
    })

    test("refuses an id naming no employee", () => {
        const whoami = runCliWithEnv(switchedTo("eve"), "whoami")

        expect(whoami.exitCode).toBe(1)
        expect(whoami.stderr).toContain('names no employee: "eve"')
    })

    test("refuses an LLM employee", () => {
        hireLlmEmployee("claude")

        const whoami = runCliWithEnv(switchedTo("claude"), "whoami")

        expect(whoami.exitCode).toBe(1)
        expect(whoami.stderr).toContain('"claude", an LLM employee')
    })

    test("refuses a value that isn't an employee id", () => {
        const whoami = runCliWithEnv(switchedTo("../company"), "whoami")

        expect(whoami.exitCode).toBe(1)
        expect(whoami.stderr).toContain("isn't an employee id")
    })
})

describe("the person at the keyboard writes in threads", () => {
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

describe("--as", () => {
    function lastPositionId(threadId: string): string {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return JSON.parse(lines.trimEnd().split("\n").at(-1) ?? "").position.id
    }

    function createThread(env: Record<string, string>, ...options: string[]) {
        const create = ["thread", "create", "-s", "Logo", "-b", "Hello."]
        return runCliWithEnv(env, ...create, ...options)
    }

    test("thread create --as writes from one of the positions you work", () => {
        runCli(...interimDirectors, "support")

        const threadId = createThread({}, "--as", "support").stdout.trim()
        const show = runCli("thread", "show", threadId).stdout

        expect(lastPositionId(threadId)).toBe("support")
        expect(show).toContain("Created by Test User, support (@support)")
    })

    test("message send -a overrides the position chosen by default", () => {
        runCli(...interimDirectors, "support")
        const threadId = createThread({}).stdout.trim()
        const send = ["message", "send", threadId, "-b", "Done."]

        runCli(...send, "-a", "support")

        expect(lastPositionId(threadId)).toBe("support")
    })

    test("lets a human employee working several positions choose one", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimEmployee, "support", "julie")

        const refused = createThread(asJulie)
        const chosen = createThread(asJulie, "--as", "support")

        expect(refused.exitCode).toBe(1)
        expect(refused.stderr).toContain("Choose one with --as.")
        expect(lastPositionId(chosen.stdout.trim())).toBe("support")
    })

    test("refuses a position worked by an LLM employee", () => {
        hireLlmEmployee("claude")
        runCli("position", "assign", "support", "claude")

        const create = createThread({}, "--as", "support")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toBe(
            "You don't work position \"support\": Claude Senior, an LLM employee, works it, and nobody writes on an LLM's behalf. Assign it to the directors temporarily first: `llmco position assign-temporarily directors support`.\n",
        )
        expect(runCli("thread", "list").stdout).toContain("No threads yet.")
    })

    test("refuses a vacant position, giving the command to work it", () => {
        const create = createThread(asJulie, "--as", "support")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain(
            "it is vacant. A director can assign it to julie temporarily: `llmco position assign-temporarily employee support julie`.",
        )
    })

    test("refuses an employee's default position assigned temporarily to another", () => {
        runCli("position", "assign", "graphics", "julie")
        runCli(...interimEmployee, "graphics", "bob")

        const create = createThread(asJulie, "--as", "graphics")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain(
            "Bob, a human employee, works it. A director can give it back to julie: `llmco position unassign-temporarily graphics`.",
        )
    })

    test("refuses the director's position to a human employee", () => {
        runCli("position", "assign", "graphics", "julie")

        const create = createThread(asJulie, "--as", "director")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain("Only directors write from")
    })

    test("refuses an unknown position", () => {
        const create = createThread({}, "--as", "marketing")

        expect(create.exitCode).toBe(1)
        expect(create.stderr).toContain('No position "marketing".')
    })
})
