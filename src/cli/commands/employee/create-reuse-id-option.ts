import { Option } from "@commander-js/extra-typings"

export function createReuseIdOption() {
    return new Option(
        "-r, --reuse-id",
        "give the id even if an earlier employee had it, in threads or as a former id",
    )
}
