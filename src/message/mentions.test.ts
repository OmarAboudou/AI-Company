import { describe, expect, test } from "bun:test"
import { findMentions } from "./mentions.ts"

function positionIds(body: string): string[] {
    return findMentions(body).positionIds
}

describe("findMentions", () => {
    test("finds every @position-id once, in order", () => {
        const body = "@backend-developer, ask @qa-tester. @backend-developer?"

        expect(positionIds(body)).toEqual(["backend-developer", "qa-tester"])
    })

    test.each([
        ["at the start of a line", "@qa-tester can you check?"],
        ["after a parenthesis", "(cc @qa-tester)"],
        ["before punctuation", "Thanks @qa-tester!"],
        ["before an apostrophe", "@qa-tester's report"],
    ])("finds a mention %s", (_, body) => {
        expect(positionIds(body)).toEqual(["qa-tester"])
    })

    test.each([
        ["an e-mail address", "write to omar@acme.com"],
        ["an uppercase name", "@QA-Tester"],
        ["an inline code span", "run `npm i @types/bun` first"],
        ["a double-backtick code span", "``a @qa-tester b``"],
        ["a fenced code block", "```ts\nimport x from '@qa-tester'\n```"],
        ["a tilde code block", "~~~\n@qa-tester\n~~~"],
        ["an unclosed code block", "```\n@qa-tester"],
    ])("ignores %s", (_, body) => {
        expect(positionIds(body)).toEqual([])
    })

    test("finds mentions after a code block", () => {
        const body = "```\n@ignored\n```\n\n@qa-tester, see above."

        expect(positionIds(body)).toEqual(["qa-tester"])
    })

    test("sets apart mentions of a specific employee", () => {
        const mentions = findMentions("@backend-developer:claude-senior hi")

        expect(mentions.positionIds).toEqual([])
        expect(mentions.employeeMentions).toEqual([
            "@backend-developer:claude-senior",
        ])
    })
})
