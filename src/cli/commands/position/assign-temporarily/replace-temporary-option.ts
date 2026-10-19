import { Option } from "@commander-js/extra-typings"

export function replaceTemporaryOption() {
    return new Option(
        "-r, --replace",
        "replace the current temporary assignment",
    )
}
