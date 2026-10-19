import { Argument } from "@commander-js/extra-typings"
import { protocols } from "../../../../llm/connection/schema.ts"

export function createProtocolArgument() {
    return new Argument(
        "<protocol>",
        `API protocol: ${protocols.join(", ")}`,
    ).choices(protocols)
}
