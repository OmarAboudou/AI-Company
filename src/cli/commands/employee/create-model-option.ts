import { Option } from "@commander-js/extra-typings"

export function createModelOption() {
    return new Option(
        "-m, --model <model-id>",
        "id of an LLM employee's model in llmco, not its api id, e.g. claude-opus-5-5 (see llmco model list)",
    )
}
