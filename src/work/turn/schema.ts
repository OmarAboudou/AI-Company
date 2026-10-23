import { z } from "zod"
import {
    TextBlockSchema,
    ToolCallBlockSchema,
} from "../../llm/conversation/schema.ts"

export const StagedTurnSchema = z
    .strictObject({
        blocks: z
            .array(
                z.discriminatedUnion("type", [
                    TextBlockSchema,
                    ToolCallBlockSchema,
                ]),
            )
            .meta({
                description:
                    "The blocks added to the person's next turn, in order: texts and tool calls.",
            }),
    })
    .meta({
        title: "llmco staged turn",
        description:
            "The turn a person prepares in a run, in .aico/.state/runs/<run-id>.turn.json, until aico turn send sends it. Written by llmco and ignored by git.",
    })

export type StagedTurn = z.infer<typeof StagedTurnSchema>
