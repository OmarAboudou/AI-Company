import { beforeEach, describe, expect, test } from "bun:test"
import { chmod } from "node:fs/promises"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { listMessages } from "../../../messaging/message/storage.ts"
import { createThread } from "../../../messaging/thread/create-thread.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { assignPosition } from "../../../organization/position/assign-position.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { startCliWithEnv, getProjectPath } = useTemporaryProject()

const enterKey = "\r"
const downKey = "\x1b[B"
const ctrlDKey = "\x04"

const sessionTimeoutMs = 30_000

let threadId = ""

beforeEach(async () => {
    const projectRoot = getProjectPath()
    await createCompany(projectRoot, { name: "Acme", description: "" })
    await createEmployee(projectRoot, "julie", { name: "Julie", kind: "human" })
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
    const editorPath = getProjectPath("fake-editor.sh")
    await Bun.write(
        editorPath,
        '#!/bin/sh\nprintf "%s\\n" "$FAKE_EDITOR_TEXT" > "$1"\n',
    )
    await chmod(editorPath, 0o755)
})

async function askTester() {
    const body = "@qa-tester Can we ship on Friday?"
    await sendMessage(getProjectPath(), {}, threadId, { body })
}

function startJulieSession(editorText = "@director Yes.") {
    const editorPath = getProjectPath("fake-editor.sh")
    const env = {
        LLMCO_CURRENT_HUMAN_ID: "julie",
        VISUAL: editorPath,
        EDITOR: editorPath,
        FAKE_EDITOR_TEXT: editorText,
    }
    return startCliWithEnv(env, "task", "work")
}

describe("llmco task work", () => {
    test(
        "works a task as the person answers, then waits until Ctrl+D",
        async () => {
            await askTester()
            const session = startJulieSession("@director Yes, the tests pass.")

            await session.waitForOutput("Turn 1: what now?")
            session.write(enterKey)
            await session.waitForOutput("Which tool?")
            session.write(enterKey)
            await session.waitForOutput("body: The message, in Markdown.")
            session.write(enterKey)
            await session.waitForOutput(
                "Added to turn 1: a call to message_send.",
            )
            await session.waitForOutput("Turn 1: what now?")
            session.write(enterKey)
            await session.waitForOutput("Which tool?")
            session.write(`${downKey}${enterKey}`)
            await session.waitForOutput("summary:")
            session.write(`Answered.${enterKey}`)
            await session.waitForOutput("a call to task_mark-as-done.")
            await session.waitForOutput("Turn 1: what now?")
            session.write(`${downKey.repeat(4)}${enterKey}`)
            await session.waitForOutput("\nTask done: Answered.\n")
            await session.waitForOutput("Waiting for your next task.")
            session.write(ctrlDKey)
            const { exitCode, stdout } = await session.exited()

            const [, answer] = await listMessages(getProjectPath(), threadId)
            expect(exitCode).toBe(0)
            expect(stdout).toEndWith("\nSession ended.\n")
            expect(answer?.body).toBe("@director Yes, the tests pass.")
        },
        sessionTimeoutMs,
    )

    test(
        "asks before adding a message that mentions nobody",
        async () => {
            await askTester()
            const session = startJulieSession("Yes.")

            await session.waitForOutput("Turn 1: what now?")
            session.write(enterKey)
            await session.waitForOutput("Which tool?")
            session.write(enterKey)
            await session.waitForOutput("body: The message, in Markdown.")
            session.write(enterKey)
            await session.waitForOutput(
                "This message mentions nobody, so it asks nobody to act. Add it anyway?",
            )
            session.write(enterKey)
            await session.waitForOutput("Turn 1: what now?")
            session.write(`${downKey.repeat(2)}${enterKey}`)
            await session.waitForOutput(
                "Your turn is empty: call a tool or write a text.",
            )
            session.write(ctrlDKey)
            const { exitCode } = await session.exited()

            expect(exitCode).toBe(0)
        },
        sessionTimeoutMs,
    )

    test(
        "opens the person's next task once it comes",
        async () => {
            const session = startJulieSession()
            await session.waitForOutput("Waiting for your next task.")

            await askTester()

            await session.waitForOutput('Task "')
            await session.waitForOutput("Turn 1: what now?")
            session.write(ctrlDKey)
            const { exitCode, stdout } = await session.exited()
            expect(exitCode).toBe(0)
            expect(stdout).toEndWith("\nSession ended.\n")
        },
        sessionTimeoutMs,
    )
})
