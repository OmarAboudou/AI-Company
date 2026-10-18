import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../cli-test-helpers.ts"

const { runCli, runCliWithEnv, projectPath } = useTemporaryProject()

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

describe("llmco thread create", () => {
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

    test("show displays the subject and who created the thread", () => {
        const id = createThread().stdout.trim()

        const show = runCli("thread", "show", id).stdout

        expect(show).toStartWith("# Choice of framework\n\n")
        expect(show).toContain("Created by Test User, Director (@director), ")
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

describe("llmco thread list", () => {
    test("lists the threads with their subject, oldest first", () => {
        runCli("thread", "create", "-s", "Budget")
        createThread()

        const list = runCli("thread", "list").stdout
        const rows = list.trimEnd().split("\n")

        expect(rows).toHaveLength(2)
        expect(rows[0]).toMatch(/-budget +Budget$/)
        expect(rows[1]).toMatch(/-choice-of-framework +Choice of framework$/)
    })

    test("says so when there is no thread", () => {
        const list = runCli("thread", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No threads yet.")
    })
})

describe("llmco thread show", () => {
    test("--json prints one message per line, with its author", () => {
        const id = createThread("-b", "Hono or Express?").stdout.trim()
        runCli("message", "send", id, "-b", "Hono, then.")

        const lines = runCli("thread", "show", id, "--json").stdout.split("\n")
        const [first, second] = lines.map((line) => JSON.parse(line || "{}"))

        expect(lines).toHaveLength(3)
        expect(first.body).toBe("Hono or Express?")
        expect(second.body).toBe("Hono, then.")
        expect(second.position).toEqual({ id: "director", title: "Director" })
        expect(second).not.toHaveProperty("employee")
        expect(second.committer).toEqual({
            name: "Test User",
            email: "test@example.com",
        })
    })

    test("fails for an unknown thread", () => {
        const show = runCli("thread", "show", "2026-10-18-nothing")

        expect(show.exitCode).toBe(1)
        expect(show.stderr).toContain('No thread "2026-10-18-nothing".')
    })
})
