import { beforeEach, describe, expect, test } from "bun:test"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico thread show", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
    })

    function createThread(...args: string[]) {
        return runCli("thread", "create", "-s", "Choice of framework", ...args)
    }

    test("show displays the subject and who created the thread", () => {
        const id = createThread().stdout.trim()

        const show = runCli("thread", "show", id).stdout

        expect(show).toStartWith("# Choice of framework\n\n")
        expect(show).toContain("Created by Test User, Director (@director), ")
    })

    test("--json prints one message per line, with its author", () => {
        const id = createThread("-b", "Hono or Express?").stdout.trim()
        runCli("message", "send", id, "-b", "Hono, then.")

        const lines = runCli("thread", "show", id, "--json").stdout.split("\n")
        const [question, answer] = lines.map((line) => JSON.parse(line || "{}"))

        expect(lines).toHaveLength(3)
        expect(question.body).toBe("Hono or Express?")
        expect(answer.body).toBe("Hono, then.")
        expect(answer.position).toEqual({ id: "director", title: "Director" })
        expect(answer).not.toHaveProperty("employee")
        expect(answer.committer).toEqual({
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

describe("mentions", () => {
    let threadId = ""

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        const { thread } = await createThread(
            projectRoot,
            {},
            {
                subject: "Budget",
            },
        )
        threadId = thread.id
    })

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await Promise.all([
            createPosition(projectRoot, "backend-developer", {
                title: "Backend",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
        ])
    })

    test("thread show lists the members and those with a pending task", () => {
        runCli("message", "send", threadId, "-b", "@qa-tester, a test plan?")

        const show = runCli("thread", "show", threadId).stdout

        expect(show).toContain("Members: @director, @qa-tester.\n")
        expect(show).toContain("Tasks pending for @qa-tester.\n")
    })
})
