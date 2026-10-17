import { expect, test } from "bun:test"
import { useTemporaryProject } from "./cli-test-helpers.ts"

const { runCli } = useTemporaryProject()

test.each([
    ["position", "create", ".llmco/positions"],
    ["employee", "show", ".llmco/employees"],
    ["provider", "show", ".llmco/llm-providers"],
    ["model", "show", ".llmco/llm-providers/<provider-id>/models"],
])("%s %s --help says the id names a folder in %s", (group, command, dir) => {
    const help = runCli(group, command, "--help").stdout
    const unwrapped = help.replace(/\s+/g, " ")

    expect(unwrapped).toContain(`the name of its folder in ${dir}`)
})

test("prints the --help output for an unknown command", () => {
    const help = runCli("--help")
    const result = runCli("unknown")

    expect(help.exitCode).toBe(0)
    expect(result.exitCode).toBe(1)
    expect(result.stderr).toContain(help.stdout)
})
