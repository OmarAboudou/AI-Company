import { beforeEach, describe, expect, test } from "bun:test"
import { createLlmConnection } from "../../../llm/connection/create-llm-connection.ts"
import { createLlmModel } from "../../../llm/model/create-llm-model.ts"
import { createLlmProvider } from "../../../llm/provider/create-llm-provider.ts"
import { createCompany } from "../../../organization/company/create-company.ts"
import { createEmployee } from "../../../organization/employee/create-employee.ts"
import { createPosition } from "../../../organization/position/create-position.ts"
import { useTemporaryProject } from "../../use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

describe("aico position", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
    })

    test("list aligns titles and holders after the ids, sorted by id", () => {
        runCli("position", "create", "qa-tester", "--title", "QA Tester")
        runCli("position", "create", "developer", "--title", "Developer")

        expect(runCli("position", "list").stdout).toBe(
            "developer  Developer  (you)\n" +
                "director   Director   (you)\n" +
                "qa-tester  QA Tester  (you)\n",
        )
    })
})

describe("aico position list and show", () => {
    beforeEach(async () => {
        const projectRoot = getProjectPath()
        await createCompany(projectRoot, { name: "Acme" })
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

    test("list and show display the employee holding a position", () => {
        runCli("position", "assign", "qa-tester", "claude-senior")

        expect(runCli("position", "list").stdout).toBe(
            "developer  Developer  (you)\n" +
                "director   Director   (you)\n" +
                "qa-tester  QA Tester  claude-senior\n",
        )
        expect(runCli("position", "show", "qa-tester").stdout).toBe(
            "# QA Tester\n\nheld by: claude-senior\n\n\n",
        )
    })
})

describe("corrupted files", () => {
    test("position list names the broken position file", async () => {
        runCli("init", "--name", "Acme")
        runCli("position", "create", "developer", "--title", "Developer")
        await Bun.write(
            getProjectPath(".aico", "positions", "developer", "config.json"),
            "{ not json",
        )

        const list = runCli("position", "list")

        expect(list.exitCode).toBe(1)
        expect(list.stderr).toStartWith(
            "Invalid JSON in .aico/positions/developer/config.json",
        )
    })
})

test("position commands require a company", () => {
    expect(runCli("position", "list").exitCode).toBe(1)
})
