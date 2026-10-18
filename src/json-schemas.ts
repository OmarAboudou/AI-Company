import { z } from "zod"
import { CompanyConfigSchema } from "./company/company.ts"
import { EmployeeConfigSchema } from "./employee/employee.ts"
import { IdHistorySchema } from "./id-history.ts"
import { LlmModelConfigSchema } from "./llm-model/llm-model.ts"
import { LlmProviderConfigSchema } from "./llm-provider/llm-provider.ts"
import {
    MessageConfigSchema,
    ProviderResponseSchema,
} from "./message/message.ts"
import { PositionConfigSchema } from "./position/position.ts"
import { ThreadConfigSchema } from "./thread/thread.ts"

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
