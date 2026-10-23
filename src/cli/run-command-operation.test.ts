import { describe, expect, test } from "bun:test"
import { runGit } from "../git/run-git.ts"
import { useTemporaryProject } from "./use-temporary-project.testing.ts"

const { runCli, getProjectPath } = useTemporaryProject()

type CommandCommit = {
    commandLine: string
    exitCode: number
    lastCommitSubject: string | undefined
    changes: string | undefined
}

function runCommittedCli(...args: string[]): CommandCommit {
    const { exitCode } = runCli(...args)
    const aicoFolderPath = getProjectPath(".aico")
    return {
        commandLine: ["aico", ...args].join(" "),
        exitCode,
        lastCommitSubject: runGit(aicoFolderPath, ["log", "-1", "--format=%s"]),
        changes: runGit(aicoFolderPath, ["status", "--porcelain"]),
    }
}

function createExpectedCommit(
    commandLine: string,
    lastCommitSubject: string,
): CommandCommit {
    return { commandLine, exitCode: 0, lastCommitSubject, changes: "" }
}

// The walk through every command that changes the company takes seconds,
// a CLI process for each command.
const walkTimeoutMs = 30_000

describe("a command that changes the company", () => {
    test(
        "commits once, named after the command and its arguments",
        () => {
            runCli("init", "-n", "Acme")
            const commandCommits = [
                runCommittedCli("company", "update", "-n", "Globex"),
                runCommittedCli("project", "update", "-d", "A to-do app."),
                runCommittedCli("position", "create", "qa", "-t", "QA"),
                runCommittedCli("position", "update", "qa", "-t", "Tester"),
                runCommittedCli("provider", "create", "anthropic", "-n", "A"),
                runCommittedCli("provider", "update", "anthropic", "-e", "KEY"),
                runCommittedCli(
                    ...["provider", "connection", "create", "anthropic"],
                    ...[
                        "anthropic-messages",
                        "-u",
                        "https://api.anthropic.com",
                    ],
                ),
                runCommittedCli(
                    ...["provider", "connection", "update", "anthropic"],
                    ...["anthropic-messages", "-u", "http://localhost:4000"],
                ),
                runCommittedCli(
                    ...["model", "create", "anthropic", "opus"],
                    ...["-n", "Opus", "-a", "claude-opus-5-5"],
                ),
                runCommittedCli(
                    "model",
                    "update",
                    "anthropic",
                    "opus",
                    "-n",
                    "O",
                ),
                runCommittedCli(
                    ...["employee", "create", "llm", "claude"],
                    ...["-n", "Claude", "-p", "anthropic", "-m", "opus"],
                ),
                runCommittedCli(
                    "employee",
                    "update",
                    "claude",
                    "-n",
                    "Claude S",
                ),
                runCommittedCli("position", "assign", "qa", "claude"),
                runCommittedCli("position", "interim", "directors", "qa"),
                runCommittedCli("position", "end-interim", "qa"),
                runCommittedCli(
                    ...["employee", "hire", "llm", "julie"],
                    ...["-n", "Julie", "-p", "anthropic", "-m", "opus"],
                ),
                runCommittedCli(
                    "position",
                    "interim",
                    "employee",
                    "qa",
                    "julie",
                ),
                runCommittedCli("employee", "update-id", "julie", "julia"),
                runCommittedCli("employee", "replace", "claude", "julia"),
                runCommittedCli("position", "unassign", "qa"),
                runCommittedCli("position", "update-id", "qa", "tester"),
                runCommittedCli("position", "close", "tester"),
                runCommittedCli("employee", "fire", "claude"),
                runCommittedCli("employee", "delete", "julia", "--force"),
                runCommittedCli(
                    "model",
                    "update-id",
                    "anthropic",
                    "opus",
                    "o5",
                ),
                runCommittedCli("model", "delete", "anthropic", "o5"),
                runCommittedCli(
                    ...["provider", "connection", "delete", "anthropic"],
                    "anthropic-messages",
                ),
                runCommittedCli("provider", "update-id", "anthropic", "anthr"),
                runCommittedCli("provider", "delete", "anthr"),
            ]

            const lastCommitSubjects = [
                "company update",
                "project update",
                "position create qa",
                "position update qa",
                "provider create anthropic",
                "provider update anthropic",
                "provider connection create anthropic anthropic-messages",
                "provider connection update anthropic anthropic-messages",
                "model create anthropic opus",
                "model update anthropic opus",
                "employee create llm claude",
                "employee update claude",
                "position assign qa claude",
                "position assign-temporarily directors qa",
                "position unassign-temporarily qa",
                "employee create llm julie",
                "position assign-temporarily employee qa julie",
                "employee update-id julie julia",
                "employee replace claude julia",
                "position unassign qa",
                "position update-id qa tester",
                "position delete tester",
                "employee delete claude",
                "employee delete julia",
                "model update-id anthropic opus o5",
                "model delete anthropic o5",
                "provider connection delete anthropic anthropic-messages",
                "provider update-id anthropic anthr",
                "provider delete anthr",
            ].map((operationName) => `aico ${operationName}`)
            expect(commandCommits).toEqual(
                lastCommitSubjects.map((subject, index) =>
                    createExpectedCommit(
                        commandCommits[index]?.commandLine ?? "",
                        subject,
                    ),
                ),
            )
        },
        walkTimeoutMs,
    )

    test("commits nothing when it changes nothing", () => {
        runCli("init", "-n", "Acme")

        const opening = runCommittedCli("task", "next")

        expect(opening).toEqual(
            createExpectedCommit(opening.commandLine, "aico init"),
        )
    })
})
