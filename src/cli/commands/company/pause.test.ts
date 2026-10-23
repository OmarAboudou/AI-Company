import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli } = useTemporaryProject()

beforeEach(() => {
    runCli("init", "--name", "Acme")
})

describe("aico company pause", () => {
    test("pauses the company, which then shows it paused", () => {
        const pausing = runCli("company", "pause")

        expect(pausing.exitCode).toBe(0)
        expect(pausing.stdout).toBe(
            "Paused the company: no new task starts but the founder's until `aico company relaunch`.\n",
        )
        expect(runCli("company", "show").stdout).toMatch(
            /^# Acme\n\nPaused since \d{4}-\d\d-\d\d \d\d:\d\d UTC: `aico company relaunch` relaunches it\.\n$/,
        )
    })

    test("refuses to pause a paused company", () => {
        runCli("company", "pause")

        const pausing = runCli("company", "pause")

        expect(pausing.exitCode).toBe(1)
        expect(pausing.stderr).toBe(
            "The company is already paused. Run `aico company relaunch` to relaunch it.\n",
        )
    })
})
