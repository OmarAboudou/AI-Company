import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

beforeEach(() => {
    runCli("init", "--name", "Acme")
})

describe("aico company relaunch", () => {
    test("relaunches the paused company", () => {
        runCli("company", "pause")

        const relaunching = runCli("company", "relaunch")

        expect(relaunching.exitCode).toBe(0)
        expect(relaunching.stdout).toBe(
            "Relaunched the company: its tasks start again.\n",
        )
        expect(runCli("company", "show").stdout).toBe("# Acme\n")
    })

    test("refuses to relaunch a company that isn't paused", () => {
        const relaunching = runCli("company", "relaunch")

        expect(relaunching.exitCode).toBe(1)
        expect(relaunching.stderr).toBe(
            "The company isn't paused: nothing to relaunch.\n",
        )
    })
})
