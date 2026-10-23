import { afterEach, beforeEach, describe, expect, test } from "bun:test"
import { rm } from "node:fs/promises"
import type { OpenedTask } from "../task/open-next-task.ts"
import { addTurnTool } from "./add-turn-tool.ts"
import { createCompanyWithTaskInProgress } from "./create-company-with-task-in-progress.testing.ts"
import { loadStagedTurn } from "./storage.ts"

let projectRoot: string
let openedTask: OpenedTask

beforeEach(async () => {
    const company = await createCompanyWithTaskInProgress()
    projectRoot = company.projectRoot
    openedTask = company.openedTask
})

afterEach(async () => {
    await rm(projectRoot, { recursive: true, force: true })
})

async function addToolCall(toolName: string, rawInput: string) {
    return addTurnTool(projectRoot, {}, { toolName, rawInput })
}

describe("addTurnTool", () => {
    test("adds a call with an id of its own, its input as given", async () => {
        const stagedTurn = await addToolCall("message_send", '{"body": "Yes."}')

        expect(stagedTurn).toEqual({
            blocks: [
                {
                    type: "tool-call",
                    id: expect.stringMatching(/^call_[0-9a-f]{12}$/),
                    name: "message_send",
                    input: { body: "Yes." },
                },
            ],
        })
        const runId = openedTask.run.id
        expect(await loadStagedTurn(projectRoot, runId)).toEqual(stagedTurn)
    })

    test("refuses an input that isn't JSON", async () => {
        const adding = addToolCall("message_send", "{body: Yes}")

        await expect(adding).rejects.toThrow("The input isn't JSON (")
    })

    test("refuses an input that isn't an object", async () => {
        const adding = addToolCall("message_send", '"Yes."')

        await expect(adding).rejects.toThrow(
            `The input is "Yes.": give an object, e.g. '{"body": "Hello."}'.`,
        )
    })

    test("refuses a tool the run doesn't give", async () => {
        const adding = addToolCall("ticket_create", "{}")

        await expect(adding).rejects.toThrow(
            "There is no tool named ticket_create. The tools you can call are: message_send, ticket_show, task_mark-as-done, task_mark-as-failed.",
        )
    })

    test("refuses an input its tool rejects", async () => {
        const adding = addToolCall("message_send", '{"text": "Yes."}')

        await expect(adding).rejects.toThrow("Invalid input for message_send:")
    })

    test("refuses an input the task's type fixes", async () => {
        const rawInput = '{"ticketNumber": 2, "body": "Yes."}'

        const adding = addToolCall("message_send", rawInput)

        await expect(adding).rejects.toThrow('Unrecognized key: "ticketNumber"')
    })
})
