import { beforeEach, describe, expect, test } from "bun:test"
import { spawnGit } from "../../../git/spawn-git.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, runCliWithEnv, getProjectPath } = useTemporaryProject()

describe("aico thread create", () => {
    const today = new Date().toISOString().slice(0, 10)

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("prints the id of the thread, from its date and subject", () => {
        const creation = createThread()

        expect(creation.exitCode).toBe(0)
        expect(creation.stdout).toBe(`${today}-choice-of-framework\n`)
    })

    test("-b sends the first message", () => {
        const id = createThread("-b", "Hono or Express?").stdout.trim()

        const show = runCli("thread", "show", id).stdout

        const lastMessagePattern =
            /## Test User, Director \(@director\) · .* UTC\n\n(.*)\n$/

        expect(show).toMatch(lastMessagePattern)
        expect(show.match(lastMessagePattern)?.[1]).toBe("Hono or Express?")
    })

    test("requires a subject", () => {
        const creation = runCli("thread", "create")

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("--subject")
    })

    test("refuses to write without git's user.name and user.email", () => {
        const envWithoutGitIdentity = {
            GIT_CONFIG_GLOBAL: "/dev/null",
            GIT_CONFIG_NOSYSTEM: "1",
        }
        spawnGit(getProjectPath(), ["config", "--unset", "user.name"])
        const create = ["thread", "create", "-s", "Budget"]

        const creation = runCliWithEnv(envWithoutGitIdentity, ...create)

        expect(creation.exitCode).toBe(1)
        expect(creation.stderr).toContain("set `git config user.name`")
        expect(runCli("thread", "list").stdout).toContain("No threads yet.")
    })
})

describe("--as-position", () => {
    const interimDirectors = ["position", "interim", "directors"]

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await createPosition(projectRoot, "support", {
            title: "support",
            description: "",
        })
    })

    function loadLastPositionId(threadId: string): string {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return JSON.parse(lines.trimEnd().split("\n").at(-1) ?? "").position.id
    }

    function createThread(env: Record<string, string>, ...options: string[]) {
        const create = ["thread", "create", "-s", "Logo", "-b", "Hello."]
        return runCliWithEnv(env, ...create, ...options)
    }

    test("thread create --as-position writes from one of the positions you work", () => {
        runCli(...interimDirectors, "support")

        const creation = createThread({}, "--as-position", "support")
        const threadId = creation.stdout.trim()
        const show = runCli("thread", "show", threadId).stdout

        expect(loadLastPositionId(threadId)).toBe("support")
        expect(show).toContain("Created by Test User, support (@support)")
    })
})
