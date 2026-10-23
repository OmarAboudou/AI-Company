import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import { sendMessage } from "../../../messaging/message/send-message.ts"
import { createCompanyWorkedByDirectors } from "../../../work/create-company-worked-by-directors.testing.ts"
import { createExampleWorkCatalog } from "../../../work/create-example-work-catalog.testing.ts"
import { openNextTask } from "../../../work/task/open-next-task.ts"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { sendTurn } from "../../../work/turn/send-turn.ts"
import { formatOpenedTask } from "./format-opened-task.ts"

const exampleCatalog = createExampleWorkCatalog()
let projectRoot: string
let threadId: string

beforeEach(async () => {
    ;({ projectRoot, threadId } = await createCompanyWorkedByDirectors())
    await sendMessage(
        projectRoot,
        {},
        threadId,
        { body: "Can we ship on Friday?" },
        createExampleWorkCatalog(["qa-tester"]),
    )
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function formatDirectorsTask(): Promise<string> {
    const { openedTask } = await openNextTask(projectRoot, {}, exampleCatalog)
    if (openedTask === undefined) {
        throw new Error("The directors have no task to open")
    }
    return formatOpenedTask(openedTask)
}

describe("formatOpenedTask", () => {
    test("shows the task as a model would get it", async () => {
        const text = await formatDirectorsTask()

        expect(text).toMatch(
            /^Task "[^"]+", example, as QA \(@qa-tester\)\.\n\n── System prompt ──\nYou are Omar Aboudou, QA \(@qa-tester\) at Acme\./,
        )
        expect(text).toContain(
            `── Message ──\nAnswer the last message of thread ${threadId}.`,
        )
        expect(text).toContain(
            "── Tools ──\nmessage_send: Send a message in this thread,",
        )
        expect(text).toContain("  body (string): The message, in Markdown.")
    })

    test("shows a resumed task's turns, then the one being prepared", async () => {
        await formatDirectorsTask()
        await addTurnTool(
            projectRoot,
            {},
            {
                toolName: "message_send",
                rawInput: '{"body": "Friday."}',
            },
        )
        await sendTurn(projectRoot, {}, "aico turn send", exampleCatalog)
        await addTurnText(projectRoot, {}, "Checking the notes.")

        const text = await formatDirectorsTask()

        expect(text).toStartWith('Resumed task "')
        expect(text).toContain(
            `\n\n── Your turns so far ──\n→ message_send\n  body: "Friday."\n← Sent as entry #2 of thread ${threadId}.\n\n`,
        )
        expect(text).toContain(
            "\n\n── Your next turn, not sent yet ──\nChecking the notes.",
        )
    })
})
