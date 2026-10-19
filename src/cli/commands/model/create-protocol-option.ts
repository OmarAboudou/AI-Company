import { Option } from "@commander-js/extra-typings"
import { protocols } from "../../../llm/connection/schema.ts"

export function createProtocolOption() {
    return new Option(
        "-p, --protocol <protocol>",
        "API protocol the model is called with, one of its provider's connections (see llmco provider connection list)",
    ).choices(protocols)
}
