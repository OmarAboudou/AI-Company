import { Option } from "@commander-js/extra-typings"

export function createShellCodeOption() {
    return new Option(
        "--shell-code",
        "print the shell code that AICo's shell function evaluates",
    ).hideHelp()
}
