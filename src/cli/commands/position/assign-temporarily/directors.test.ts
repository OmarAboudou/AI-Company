import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../../use-temporary-project.ts"

const { runCli, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]
const interimDirectors = ["position", "interim", "directors"]

function positionStatePath(id: string): string {
    return projectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function positionState(id: string): Promise<unknown> {
    const file = Bun.file(positionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

describe("llmco position assign-temporarily and unassign-temporarily", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "designer", "-t", "Designer")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli("employee", "create", "human", "bob", "-n", "Bob")
        runCli("position", "assign", "developer", "omar")
    })

    test("assign-temporarily without employee gives a vacant position to the directors", async () => {
        const interim = runCli(
            "position",
            "assign-temporarily",
            "directors",
            "designer",
        )

        expect(interim.exitCode).toBe(0)
        expect(interim.stdout).toBe(
            'Position "designer" is now assigned temporarily to the directors.\n',
        )
        expect(await positionState("designer")).toEqual({
            temporaryAssignment: { kind: "directors" },
        })
    })

    test.each(["--replace", "-r"])(
        "assign-temporarily %s replaces the temporary assignment",
        async (flag) => {
            runCli(...interimEmployee, "developer", "julie")

            const interim = runCli(...interimDirectors, "developer", flag)

            expect(interim.exitCode).toBe(0)
            expect(interim.stdout).toBe(
                'Position "developer" is now assigned temporarily to the directors instead of "julie".\n',
            )
            expect(await positionState("developer")).toEqual({
                temporaryAssignment: { kind: "directors" },
            })
        },
    )
})
