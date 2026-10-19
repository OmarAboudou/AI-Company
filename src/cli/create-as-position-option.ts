import { Option } from "@commander-js/extra-typings"

export function asPositionOption() {
    return new Option(
        "-a, --as-position <position-id>",
        "position to write from, among those you work (see current-human); by default, the only one of them in the thread, else the director's or your only one",
    )
}
