import { beforeEach, describe, expect, test } from "bun:test"
import { useTemporaryProject } from "../../use-temporary-project.ts"

const { runCli, projectPath } = useTemporaryProject()

const interimEmployee = ["position", "interim", "employee"]

function positionStatePath(id: string): string {
    return projectPath(".llmco", ".state", "positions", `${id}.json`)
}

async function positionState(id: string): Promise<unknown> {
    const file = Bun.file(positionStatePath(id))
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

    async function positionConfig(id: string): Promise<unknown> {
        const path = projectPath(".llmco", "positions", id, "config.json")
        return Bun.file(path).json()
    }

    test("assign sets the default employee of a vacant position", async () => {
        const assign = runCli("position", "assign", "developer", "omar")

        expect(assign.exitCode).toBe(0)
        expect(assign.stdout).toBe(
            '"omar" is now the default employee of position "developer".\n',
        )
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
            defaultEmployeeId: "omar",
        })
    })

    test("assign refuses to replace a default employee without --replace", async () => {
        runCli("position", "assign", "developer", "claude-senior")

        const assign = runCli("position", "assign", "developer", "omar")

        expect(assign.exitCode).toBe(1)
        expect(assign.stderr).toContain(
            'already has "claude-senior" as default employee',
        )
        expect(assign.stderr).toContain("--replace")
        expect(await positionConfig("developer")).toEqual({
            title: "Developer",
            defaultEmployeeId: "claude-senior",
        })
    })

    test.each(["--replace", "-r"])(
        "assign %s replaces the default employee",
        async (flag) => {
            runCli("position", "assign", "developer", "claude-senior")

            const assign = runCli(
                "position",
                "assign",
                "developer",
                "omar",
                flag,
            )

            expect(assign.exitCode).toBe(0)
            expect(assign.stdout).toBe(
                '"omar" replaces "claude-senior" as the default employee of position "developer".\n',
            )
            expect(await positionConfig("developer")).toEqual({
                title: "Developer",
                defaultEmployeeId: "omar",
            })
        },
    )

    test("assign accepts the current default employee again", () => {
        runCli("position", "assign", "developer", "omar")

        const again = runCli("position", "assign", "developer", "omar")

        expect(again.exitCode).toBe(0)
        expect(again.stdout).toContain("is already the default employee")
    })
})

describe("a temporary assignment through the position's lifecycle", () => {
    const julie = {
        temporaryAssignment: { kind: "employee", employeeId: "julie" },
    }

    beforeEach(() => {
        runCli("init", "-n", "Acme")
        runCli("position", "create", "developer", "-t", "Developer")
        runCli("employee", "create", "human", "julie", "-n", "Julie")
        runCli(...interimEmployee, "developer", "julie")
    })

    test("assign of the temporary assignee ends its temporary assignment", async () => {
        const before = await positionState("developer")

        const assign = runCli("position", "assign", "developer", "julie")
        const show = runCli("position", "show", "developer").stdout

        expect(before).toEqual(julie)
        expect(assign.stdout).toBe(
            '"julie" is now the default employee of position "developer", which ends its temporary assignment.\n',
        )
        expect(await positionState("developer")).toBeUndefined()
        expect(show).toContain("default employee: julie\n\n")
    })

    test("assign and unassign of another employee keep the temporary assignment", async () => {
        runCli("employee", "create", "human", "bob", "-n", "Bob")

        const assign = runCli("position", "assign", "developer", "bob")
        const unassign = runCli("position", "unassign", "developer")

        const stays = ' It stays assigned temporarily to "julie".\n'
        expect(assign.stdout).toEndWith(stays)
        expect(unassign.stdout).toEndWith(stays)
        expect(await positionState("developer")).toEqual(julie)
    })
})

describe("the director's position", () => {
    beforeEach(() => {
        runCli("init", "-n", "Acme")
    })

    test("can't be assigned an employee", () => {
        runCli("employee", "create", "human", "omar", "-n", "Omar")

        const assignment = runCli("position", "assign", "director", "omar")

        expect(assignment.exitCode).toBe(1)
        expect(assignment.stderr).toContain("not an employee")
        expect(runCli("position", "list").stdout).toContain("(git users)")
    })
})
