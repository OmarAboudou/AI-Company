import { z } from "zod"
import { CompanyConfigSchema } from "../src/company/company.ts"
import { EmployeeConfigSchema } from "../src/employee/employee.ts"
import { IdHistorySchema } from "../src/ids/id-history-schema.ts"
import { LlmModelConfigSchema } from "../src/llm-model/llm-model.ts"
import { LlmProviderConfigSchema } from "../src/llm-provider/llm-provider.ts"
import {
    MessageConfigSchema,
    ProviderResponseSchema,
} from "../src/message/message.ts"
import {
    PositionConfigSchema,
    PositionStateSchema,
} from "../src/position/position.ts"
import { ThreadConfigSchema } from "../src/thread/thread.ts"

const publishedAt =
    "https://raw.githubusercontent.com/OmarAboudou/LLM-Company/main/schemas"

const configSchemas = {
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
    Object.entries(configSchemas).map(([name, schema]) => {
        const { $schema, ...jsonSchema } = z.toJSONSchema(schema)
        return [
            name,
            { $schema, $id: `${publishedAt}/${name}.json`, ...jsonSchema },
        ]
    }),
)
