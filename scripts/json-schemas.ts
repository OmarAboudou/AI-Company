import { z } from "zod"
import { IdHistorySchema } from "../src/ids/id-history-schema.ts"
import { JournalEventSchema } from "../src/journal/schema.ts"
import { LlmModelConfigSchema } from "../src/llm/model/schema.ts"
import { LlmProviderConfigSchema } from "../src/llm/provider/schema.ts"
import { MessageConfigSchema } from "../src/messaging/message/schema.ts"
import { ThreadConfigSchema } from "../src/messaging/thread/schema.ts"
import { CompanyConfigSchema } from "../src/organization/company/schema.ts"
import { EmployeeConfigSchema } from "../src/organization/employee/schema.ts"
import {
    PositionConfigSchema,
    PositionStateSchema,
} from "../src/organization/position/schema.ts"
import { builtInEventTypes } from "../src/work/built-in-event-types.ts"
import { DispatchedEventsSchema } from "../src/work/listener/schema.ts"
import { TaskSchema } from "../src/work/task/schema.ts"
import { StagedTurnSchema } from "../src/work/turn/schema.ts"

const publicationUrl =
    "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas"

const [firstEventType, ...otherEventTypes] = builtInEventTypes

const BuiltInEventSchema = z
    .discriminatedUnion("type", [
        firstEventType.recordingSchema,
        ...otherEventTypes.map(({ recordingSchema }) => recordingSchema),
    ])
    .meta(JournalEventSchema.meta() ?? {})

const zodSchemas = {
    company: CompanyConfigSchema,
    position: PositionConfigSchema,
    employee: EmployeeConfigSchema,
    "llm-provider": LlmProviderConfigSchema,
    "llm-model": LlmModelConfigSchema,
    thread: ThreadConfigSchema,
    message: MessageConfigSchema,
    event: BuiltInEventSchema,
    task: TaskSchema,
    "id-history": IdHistorySchema,
    "position-state": PositionStateSchema,
    "dispatched-events": DispatchedEventsSchema,
    "staged-turn": StagedTurnSchema,
}

export const jsonSchemas = Object.fromEntries(
    Object.entries(zodSchemas).map(([name, schema]) => {
        const { $schema, ...jsonSchema } = z.toJSONSchema(schema)
        return [
            name,
            { $schema, $id: `${publicationUrl}/${name}.json`, ...jsonSchema },
        ]
    }),
)
