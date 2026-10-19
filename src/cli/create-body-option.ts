import { Option } from "@commander-js/extra-typings"

export function bodyOption(what = "the message") {
    return new Option("-b, --body <text>", `${what}, in Markdown`)
}
