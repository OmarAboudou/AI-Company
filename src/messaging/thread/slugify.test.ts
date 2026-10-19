import { describe, expect, test } from "bun:test"
import { slugify } from "./slugify.ts"

describe("slugify", () => {
    test.each([
        ["Choice of framework", "choice-of-framework"],
        [
            "Choix du framework : Hono ou Express ?",
            "choix-du-framework-hono-ou-express",
        ],
        ["Économie & café", "economie-cafe"],
        ["  API v2  ", "api-v2"],
        ["!!!", "thread"],
        ["予算", "thread"],
    ])("%s becomes %s", (subject, slug) => {
        expect(slugify(subject)).toBe(slug)
    })

    test("keeps whole words within 50 characters", () => {
        const subject = "word ".repeat(20)

        const slug = slugify(subject)

        expect(slug.length).toBeLessThanOrEqual(50)
        expect(slug).toMatch(/^word(-word)*$/)
    })
})
