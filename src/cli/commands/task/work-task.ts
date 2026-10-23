import { input, select } from "@inquirer/prompts"
import { UserError } from "../../../user-error.ts"
import type { OpenedTask } from "../../../work/task/open-next-task.ts"
import { addTurnText } from "../../../work/turn/add-turn-text.ts"
import { addTurnTool } from "../../../work/turn/add-turn-tool.ts"
import { clearTurn } from "../../../work/turn/clear-turn.ts"
import { loadCurrentStagedTurn } from "../../../work/turn/load-current-staged-turn.ts"
import { sendTurn } from "../../../work/turn/send-turn.ts"
import { formatTaskEnding } from "../../format-task-ending.ts"
import { formatTurn } from "../../format-turn.ts"
import { askToolInput } from "./ask-tool-input.ts"
import {
    createInquirerPrompts,
    type PromptContext,
} from "./create-inquirer-prompts.ts"
import { formatOpenedTask } from "./format-opened-task.ts"

export type TaskSession = {
    projectRoot: string
    environment: NodeJS.ProcessEnv
    operationName: string
    context: PromptContext
}

type TurnAction = "tool" | "text" | "show" | "clear" | "send" | "end"

const turnActionChoices: {
    name: string
    value: TurnAction
    description?: string
}[] = [
    { name: "Call a tool", value: "tool" },
    {
        name: "Write a text",
        value: "text",
        description: "A text joins the discussion of your task's ticket.",
    },
    { name: "Show the turn", value: "show" },
    { name: "Clear the turn", value: "clear" },
    { name: "Send the turn", value: "send" },
    {
        name: "End the session",
        value: "end",
        description:
            "Send your texts, if any, as your last turn, passing the hand to no one.",
    },
]

const emptyTurnMessage = "Your turn is empty: call a tool or write a text."

async function addToolCall(
    { run }: OpenedTask,
    { projectRoot, environment, context }: TaskSession,
): Promise<string> {
    const { tools } = run.conversation
    const toolName = await select(
        {
            message: "Which tool?",
            choices: tools.map(({ name, description }) => ({
                name,
                value: name,
                description,
            })),
        },
        context,
    )
    const tool = tools.find(({ name }) => name === toolName)
    if (tool === undefined) {
        throw new Error(`The run gives no tool named ${toolName}`)
    }
    const toolInput = await askToolInput(tool, createInquirerPrompts(context))
    const rawInput = JSON.stringify(toolInput)
    await addTurnTool(projectRoot, environment, { toolName, rawInput })
    return toolName
}

async function addText({
    projectRoot,
    environment,
    context,
}: TaskSession): Promise<void> {
    const text = await input({ message: "Text:", required: true }, context)
    await addTurnText(projectRoot, environment, text)
}

export async function workTask(
    openedTask: OpenedTask,
    session: TaskSession,
): Promise<void> {
    console.log(`\n${formatOpenedTask(openedTask)}\n`)
    const taskSession = {
        ...session,
        environment: {
            ...session.environment,
            AICO_CURRENT_POSITION_ID: openedTask.position.id,
        },
    }
    const { projectRoot, environment, operationName, context } = taskSession
    const sentTurns = openedTask.run.conversation.turns.filter(
        ({ role }) => role === "assistant",
    )
    let turnNumber = sentTurns.length + 1
    while (true) {
        const action = await select(
            {
                message: `Turn ${turnNumber}: what now?`,
                choices: turnActionChoices,
            },
            context,
        )
        try {
            switch (action) {
                case "tool": {
                    const addedToolName = await addToolCall(
                        openedTask,
                        taskSession,
                    )
                    console.log(
                        `Added to turn ${turnNumber}: a call to ${addedToolName}.`,
                    )
                    break
                }
                case "text":
                    await addText(taskSession)
                    console.log(`Added to turn ${turnNumber}: a text.`)
                    break
                case "show": {
                    const { blocks } = await loadCurrentStagedTurn(
                        projectRoot,
                        environment,
                    )
                    console.log(
                        blocks.length === 0
                            ? emptyTurnMessage
                            : formatTurn(blocks),
                    )
                    break
                }
                case "clear":
                    await clearTurn(projectRoot, environment)
                    console.log("Emptied your turn.")
                    break
                case "send": {
                    const { blocks } = await loadCurrentStagedTurn(
                        projectRoot,
                        environment,
                    )
                    if (blocks.length === 0) {
                        console.log(emptyTurnMessage)
                        break
                    }
                    const { sentTurn, answeringTurn, taskEnding } =
                        await sendTurn(projectRoot, environment, operationName)
                    console.log(formatTurn(sentTurn.blocks, answeringTurn))
                    if (taskEnding !== undefined) {
                        console.log(`\n${formatTaskEnding(taskEnding)}`)
                        return
                    }
                    turnNumber++
                    break
                }
                case "end": {
                    const { sentTurn, taskEnding } = await sendTurn(
                        projectRoot,
                        environment,
                        operationName,
                        { shouldEndSession: true },
                    )
                    console.log(formatTurn(sentTurn.blocks))
                    if (taskEnding !== undefined) {
                        console.log(`\n${formatTaskEnding(taskEnding)}`)
                    }
                    return
                }
            }
        } catch (error) {
            if (!(error instanceof UserError)) {
                throw error
            }
            console.error(error.message)
            if (action === "send") {
                return
            }
        }
    }
}
