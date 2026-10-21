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
        "Id of the run, i.e. the name of its transcript in .llmco/.state/runs, kept on the machine that ran it.",
})

const WrittenAtSchema = z.iso.datetime().meta({
    description: "When the line was written, in UTC.",
})

const RunStartLineSchema = z.strictObject({
    at: WrittenAtSchema,
    type: z.literal("start"),
    apiId: z.string().min(1).optional().meta({
        description:
            "Id of the model on its provider's side, for a model's run. Absent for a person's.",
    }),
    systemPrompt: z.string(),
    tools: z.array(ToolDefinitionSchema),
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
            "A line of a run's transcript, in .llmco/.state/runs/<run-id>.jsonl: first what the run was given, then each turn of its conversation, in order.",
    })

export type RunTranscriptLine = z.infer<typeof RunTranscriptLineSchema>

export type Run = {
    id: string
    conversation: Conversation
}
