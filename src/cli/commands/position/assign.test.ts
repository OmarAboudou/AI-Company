import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function getPositionStatePath(id: string): string {
    return getProjectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function loadPositionStateFile(id: string): Promise<unknown> {
    const file = Bun.file(getPositionStatePath(id))
    return (await file.exists()) ? file.json() : undefined
}

describe("llmco position assign and unassign", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("position", "create", "qa-tester", "-t", "QA Tester")
        runCli("employee", "create", "human", "omar", "-n", "Omar")
        runCli("provider", "create", "anthropic", "-n", "Anthropic")
        runCli(
            "provider",
            "connection",
            "create",
            "anthropic",
            "anthropic-messages",
            "-u",
            "https://api.anthropic.com",
        )
        runCli(
            "model",
            "create",
            "anthropic",
            "claude-opus-5-5",
            "-n",
            "Claude Opus 5.5",
            "-a",
            "claude-opus-5-5",
        )
        runCli(
            "employee",
            "create",
            "llm",
            "claude-senior",
            "-n",
            "Claude Senior",
            "-p",
            "anthropic",
            "-m",
            "claude-opus-5-5",
        )
    })

    async function loadPositionConfigFile(id: string): Promise<unknown> {
        const path = getProjectPath(".llmco", "positions", id, "config.json")
        return Bun.file(path).json()
    }

    test("assign sets the default employee of a vacant position", async () => {
        const assignment = runCli("position", "assign", "developer", "omar")

        expect(assignment.exitCode).toBe(0)
        expect(assignment.stdout).toBe(
            '"omar" is now the default employee of position "developer".\n',
        )
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
            defaultEmployeeId: "omar",
        })
    })

    test("assign refuses to replace a default employee without --replace", async () => {
        runCli("position", "assign", "developer", "claude-senior")

        const assignment = runCli("position", "assign", "developer", "omar")

        expect(assignment.exitCode).toBe(1)
        expect(assignment.stderr).toContain(
            'already has "claude-senior" as default employee',
        )
        expect(assignment.stderr).toContain("--replace")
        expect(await loadPositionConfigFile("developer")).toEqual({
            title: "Developer",
            defaultEmployeeId: "claude-senior",
        })
    })

    test.each(["--replace", "-r"])(
        "assign %s replaces the default employee",
        async (flag) => {
            runCli("position", "assign", "developer", "claude-senior")

            const assignment = runCli(
                "position",
                "assign",
                "developer",
                "omar",
                flag,
            )

            expect(assignment.exitCode).toBe(0)
            expect(assignment.stdout).toBe(
                '"omar" replaces "claude-senior" as the default employee of position "developer".\n',
            )
            expect(await loadPositionConfigFile("developer")).toEqual({
                title: "Developer",
                defaultEmployeeId: "omar",
            })
        },
    )

    test("assign accepts the current default employee again", () => {
        runCli("position", "assign", "developer", "omar")

        const reassignment = runCli("position", "assign", "developer", "omar")

        expect(reassignment.exitCode).toBe(0)
        expect(reassignment.stdout).toContain("is already the default employee")
    })
})

describe("a temporary assignment through the position's lifecycle", () => {
    const julieState = {
        temporaryAssignment: { kind: "employee", employeeId: "julie" },
    }

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli(...interimEmployee, "developer", "julie")
    })

    test("assign of the temporary assignee ends its temporary assignment", async () => {
        const before = await loadPositionStateFile("developer")

        const assignment = runCli("position", "assign", "developer", "julie")
        const show = runCli("position", "show", "developer").stdout

        expect(before).toEqual(julieState)
        expect(assignment.stdout).toBe(
            '"julie" is now the default employee of position "developer", which ends its temporary assignment.\n',
        )
        expect(await loadPositionStateFile("developer")).toBeUndefined()
        expect(show).toContain("default employee: julie\n\n")
    })

    test("assign and unassign of another employee keep the temporary assignment", async () => {
        runCli("employee", "create", "human", "bob", "-n", "Bob")

        const assignment = runCli("position", "assign", "developer", "bob")
        const unassignment = runCli("position", "unassign", "developer")

        const stillTemporaryMessage =
            ' It stays assigned temporarily to "julie".\n'
        expect(assignment.stdout).toEndWith(stillTemporaryMessage)
        expect(unassignment.stdout).toEndWith(stillTemporaryMessage)
        expect(await loadPositionStateFile("developer")).toEqual(julieState)
    })
})
