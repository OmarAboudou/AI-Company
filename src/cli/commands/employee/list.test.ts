import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico employee", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" })
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
        await createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
        })
    })

    function createClaude() {
        return runCli(
            "employee",
            "create",
            "llm",
            "claude-senior",
            "--name",
            "Claude Senior",
            "--provider",
            "anthropic",
            "--model",
            "claude-opus-5-5",
        )
    }

    test("list aligns names and models after the ids, sorted by id", () => {
        const model = ["-p", "anthropic", "-m", "claude-opus-5-5"]
        runCli("employee", "create", "llm", "omar", "-n", "Omar", ...model)
        createClaude()

        expect(runCli("employee", "list").stdout).toBe(
            "claude-senior  Claude Senior  anthropic/claude-opus-5-5\n" +
                "omar           Omar           anthropic/claude-opus-5-5\n",
        )
    })

    test("list says so when there is no employee", () => {
        const list = runCli("employee", "list")

        expect(list.exitCode).toBe(0)
        expect(list.stdout).toContain("No employees yet.")
    })
})

test("employee commands require a company", () => {
    expect(runCli("employee", "list").exitCode).toBe(1)
})

describe("aico position assign and unassign", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme", description: "" })
        await Promise.all([
            createPosition(projectRoot, "developer", {
                title: "Developer",
                description: "",
            }),
            createPosition(projectRoot, "qa-tester", {
                title: "QA Tester",
                description: "",
            }),
            createLlmProvider(projectRoot, "anthropic", { name: "Anthropic" }),
        ])
        await createLlmConnection(
            projectRoot,
            "anthropic",
            "anthropic-messages",
            { baseUrl: "https://api.anthropic.com" },
        )
        await createLlmModel(projectRoot, "anthropic", "claude-opus-5-5", {
            name: "Claude Opus 5.5",
            apiId: "claude-opus-5-5",
        })
        await createEmployee(projectRoot, "claude-senior", {
            name: "Claude Senior",
            kind: "llm",
            providerId: "anthropic",
            modelId: "claude-opus-5-5",
        })
        await createEmployee(projectRoot, "omar", {
            name: "Omar",
            kind: "llm",
            providerId: "anthropic",
            modelId: "claude-opus-5-5",
        })
    })

    test.each(["--positions", "-p"])(
        "employee list %s shows the positions filled",
        (flag) => {
            runCli("position", "assign", "developer", "claude-senior")
            runCli("position", "assign", "qa-tester", "claude-senior")

            expect(runCli("employee", "list", flag).stdout).toBe(
                "claude-senior  Claude Senior  anthropic/claude-opus-5-5  developer, qa-tester\n" +
                    "omar           Omar           anthropic/claude-opus-5-5  (none)\n",
            )
        },
    )
})
