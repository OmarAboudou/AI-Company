import { beforeEach, describe, expect, test } from "bun:test"
import { useFakeAnthropicServer } from "../../../llm/anthropic-messages/use-fake-anthropic-server.ts"
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

    test("thread create --as-position writes from one of the positions you work", () => {
        runCli(...interimDirectors, "support")

        const create = createThread({}, "--as-position", "support")
        const threadId = create.stdout.trim()
        const show = runCli("thread", "show", threadId).stdout

        expect(lastPositionId(threadId)).toBe("support")
        expect(show).toContain("Created by Test User, support (@support)")
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
