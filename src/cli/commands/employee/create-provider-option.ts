import { Option } from "@commander-js/extra-typings"

export function createProviderOption() {
    return new Option(
        "-p, --provider <provider-id>",
        "LLM provider id of an LLM employee, e.g. anthropic (see llmco provider list)",
    )
}
