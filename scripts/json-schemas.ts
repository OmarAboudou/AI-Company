import { z } from "zod"
import { IdHistorySchema } from "../src/ids/id-history-schema.ts"
import { LlmModelConfigSchema } from "../src/llm/model/schema.ts"
import { LlmProviderConfigSchema } from "../src/llm/provider/schema.ts"
import {
    MessageConfigSchema,
    ProviderResponseSchema,
} from "../src/messaging/message/schema.ts"
import { ThreadConfigSchema } from "../src/messaging/thread/schema.ts"
import { CompanyConfigSchema } from "../src/organization/company/schema.ts"
import { EmployeeConfigSchema } from "../src/organization/employee/schema.ts"
import {
    PositionConfigSchema,
    PositionStateSchema,
} from "../src/organization/position/schema.ts"

const publicationUrl =
    "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas"

const zodSchemas = {
    company: CompanyConfigSchema,
    position: PositionConfigSchema,
    employee: EmployeeConfigSchema,
    "llm-provider": LlmProviderConfigSchema,
    "llm-model": LlmModelConfigSchema,
    thread: ThreadConfigSchema,
    message: MessageConfigSchema,
    "provider-response": ProviderResponseSchema,
    "id-history": IdHistorySchema,
    "position-state": PositionStateSchema,
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
