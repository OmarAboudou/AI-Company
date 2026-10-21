import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, runCliWithStdin, getProjectPath, runCliWithEnv } =
    useTemporaryProject()

describe("llmco message send", () => {
    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        threadId = runCli("thread", "create", "-s", "Budget").stdout.trim()
    })

    function listBodies(): string[] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .trimEnd()
            .split("\n")
            .filter((line) => line !== "")
            .map((line) => JSON.parse(line).body)
    }

    test("-b adds a message at the end of the thread", () => {
        runCli("message", "send", threadId, "-b", "First.")

        const sending = runCli("message", "send", threadId, "--body", "Second.")

        const sentMessagePattern =
            /^Sent message "\d{8}-\d{6}-\d{3}-[0-9a-f]{4}" in thread/

        expect(sending.stderr).toMatch(sentMessagePattern)
        expect(listBodies()).toEqual(["First.", "Second."])
    })

    test("-F reads the body from a file", async () => {
        await Bun.write(
            getProjectPath("budget.md"),
            "# Budget\n\n- API: 50 €\n",
        )

        runCli("message", "send", threadId, "-F", "budget.md")

        expect(listBodies()).toEqual(["# Budget\n\n- API: 50 €\n"])
    })

    test("-F - reads the body from stdin", () => {
        runCliWithStdin("From stdin.\n", "message", "send", threadId, "-F", "-")

        expect(listBodies()).toEqual(["From stdin.\n"])
    })

    test("requires a body", () => {
        const sending = runCli("message", "send", threadId)

        expect(sending.exitCode).toBe(1)
        expect(sending.stderr).toContain("-b, --body or -F, --body-file")
        expect(listBodies()).toEqual([])
    })

    test("refuses a body and a body file at once", () => {
        const sending = runCli(
            "message",
            "send",
            threadId,
            "-b",
            "Inline.",
            "-F",
            "budget.md",
        )

        expect(sending.exitCode).toBe(1)
        expect(sending.stderr).toContain("cannot be used with")
    })

    test("fails for an unknown thread", () => {
        const unknownThreadId = "2026-10-18-nothing"

        const sending = runCli("message", "send", unknownThreadId, "-b", "Hi")

        expect(sending.exitCode).toBe(1)
        expect(sending.stderr).toContain(`No thread "${unknownThreadId}".`)
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

    function listMentions(): string[][] {
        const lines = runCli("thread", "show", threadId, "--json").stdout
        return lines
            .trimEnd()
            .split("\n")
            .map((line) => JSON.parse(line).mentions)
    }

    test("a mention of no position is reported and ignored", () => {
        const body = "@qa-testers, a test plan?"

        const sending = runCli("message", "send", threadId, "-b", body)

        expect(sending.exitCode).toBe(0)
        expect(sending.stderr).toContain('"@qa-testers" names no position')
        expect(listMentions()).toEqual([[]])
    })
})

describe("--as-position", () => {
    const interimDirectors = ["position", "interim", "directors"]

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "support", "-t", "support")
    })

    function loadLastPositionId(threadId: string): string {
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
        const sendArgs = ["message", "send", threadId, "-b", "Done."]

        runCli(...sendArgs, "-a", "support")

        expect(loadLastPositionId(threadId)).toBe("support")
    })
})

describe("the positions it mentions", () => {
    let threadId = ""

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "backend-developer", "-t", "Backend")
        threadId = runCli("thread", "create", "-s", "Stack").stdout.trim()
    })

    test("message send gives each a task, which llmco run runs", () => {
        const body = "@backend-developer Hono or Express?"

        const sending = runCli("message", "send", threadId, "-b", body)

        const createdTaskPattern =
            /Created task "[^"]+" for @backend-developer: catch-up-thread\./
        expect(sending.exitCode).toBe(0)
        expect(sending.stderr).toMatch(createdTaskPattern)
        expect(sending.stderr).toContain("Run `llmco run`")
    })
})
