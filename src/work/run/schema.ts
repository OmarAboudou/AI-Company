import { z } from "zod"
import { IdSchema } from "../../ids/id-schema.ts"
import {
    AssistantTurnSchema,
    type Conversation,
    ToolDefinitionSchema,
    UserTurnSchema,
} from "../../llm/conversation/schema.ts"

export const RunIdSchema = IdSchema.meta({
    description:
        "Id of the run, i.e. the name of its transcript in .aico/.state/runs, kept on the machine that ran it.",
})

const WrittenAtSchema = z.iso.datetime().meta({
    description: "When the line was written, in UTC.",
})

const RunSessionSchema = z
    .strictObject({
        toolNames: z.array(z.string().min(1)).meta({
            description:
                "Names of the tools the task's type gave the run, besides those that end the task.",
        }),
        boundToolInputs: z
            .record(z.string(), z.record(z.string(), z.unknown()))
            .optional()
            .meta({
                description:
                    "The inputs the task's type fixes in some of these tools, by tool name.",
            }),
        result: z.record(z.string(), z.unknown()).meta({
            description:
                "The result the task starts from, which the run's end completes.",
        }),
    })
    .meta({
        description:
            "What the task's type gave the run besides its message, for the run to go on in another process.",
    })

export type RunSession = z.infer<typeof RunSessionSchema>

const RunStartLineSchema = z.strictObject({
    at: WrittenAtSchema,
    type: z.literal("start"),
    apiId: z.string().min(1).optional().meta({
        description:
            "Id of the model on its provider's side, for a model's run. Absent for a person's.",
    }),
    processId: z.int().positive().optional().meta({
        description:
            "Id of the process that runs a model's run, for a later aico run to tell whether it was cut short. Absent for a person's.",
    }),
    systemPrompt: z.string(),
    tools: z.array(ToolDefinitionSchema),
    session: RunSessionSchema,
})

const turnLineFields = { at: WrittenAtSchema, type: z.literal("turn") }

const RunTurnLineSchema = z.discriminatedUnion("role", [
    UserTurnSchema.extend(turnLineFields),
    AssistantTurnSchema.extend(turnLineFields),
])

export const RunTranscriptLineSchema = z
    .discriminatedUnion("type", [RunStartLineSchema, RunTurnLineSchema])
    .meta({
        description:
            "A line of a run's transcript, in .aico/.state/runs/<run-id>.jsonl: first what the run was given, then each turn of its conversation, in order.",
    })

export type RunTranscriptLine = z.infer<typeof RunTranscriptLineSchema>

export type Run = {
    id: string
    conversation: Conversation
    session: RunSession
    processId?: number
}

export type RunProgress =
    | { kind: "text"; text: string }
    | { kind: "tool-call"; name: string; input: unknown }
    | { kind: "tool-result"; name: string; text: string; isError: boolean }
