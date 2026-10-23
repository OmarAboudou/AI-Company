import { beforeEach, describe, expect, test } from "bun:test"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { sendTurn } from "../../../work/turn/send-turn.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCliWithEnv, getProjectPath } = useTemporaryProject()

const julieEnv = { AICO_CURRENT_HUMAN_ID: "julie" }

describe("aico task next", () => {
    let threadId = ""

    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await createEmployee(projectRoot, "julie", {
            name: "Julie",
            kind: "human",
        })
        await createPosition(projectRoot, "qa-tester", {
            title: "QA",
            description: "",
        })
        await assignPosition(projectRoot, "qa-tester", "julie")
        const { thread } = await createThread(
            projectRoot,
            {},
            { subject: "Release" },
        )
        threadId = thread.id
    })

    async function askTester() {
        const body = "@qa-tester Can we ship on Friday?"
        await sendMessage(getProjectPath(), {}, threadId, { body })
    }

    test("shows the task as a model would get it", async () => {
        await askTester()

        const next = runCliWithEnv(julieEnv, "task", "next")

        expect(next.exitCode).toBe(0)
        expect(next.stdout).toMatch(
            /^Task "[^"]+", catch-up-thread, as QA \(@qa-tester\)\.\n\n── System prompt ──\nYou are Julie, QA \(@qa-tester\) at Acme\./,
        )
        expect(next.stdout).toContain("── Message ──\n# Thread")
        expect(next.stdout).toContain("@qa-tester Can we ship on Friday?")
        expect(next.stdout).toContain(
            "── Tools ──\nmessage_send: Send a message in this thread,",
        )
        expect(next.stdout).toContain(
            "  body (string): The message, in Markdown.",
        )
    })

    test("ends with how to answer", async () => {
        await askTester()

        const next = runCliWithEnv(julieEnv, "task", "next")

        expect(next.stdout).toEndWith(
            "\n\nPrepare your turn with `aico turn add text` or `aico turn add tool`, then send it with `aico turn send`.\n",
        )
    })

    test("resumes the same task the next time", async () => {
        await askTester()
        runCliWithEnv(julieEnv, "task", "next")

        const next = runCliWithEnv(julieEnv, "task", "next")

        expect(next.stdout).toStartWith('Resumed task "')
    })

    test("shows a resumed task's turns, then the one being prepared", async () => {
        const projectRoot = getProjectPath()
        await askTester()
        runCliWithEnv(julieEnv, "task", "next")
        await addTurnTool(projectRoot, julieEnv, {
            toolName: "message_send",
            rawInput: '{"body": "@director Friday."}',
        })
        await sendTurn(projectRoot, julieEnv)
        await addTurnText(projectRoot, julieEnv, "Checking the notes.")

        const next = runCliWithEnv(julieEnv, "task", "next")

        expect(next.stdout).toContain(
            `\n\n── Your turns so far ──\n→ message_send\n  body: "@director Friday."\n← Sent as entry #2 of thread ${threadId}.\n\n`,
        )
        expect(next.stdout).toContain(
            "\n\n── Your next turn, not sent yet ──\nChecking the notes.\n\n",
        )
    })

    test("says when no task waits", () => {
        const next = runCliWithEnv(julieEnv, "task", "next")

        expect(next.exitCode).toBe(0)
        expect(next.stdout).toBe("No task waits for you.\n")
    })
})
