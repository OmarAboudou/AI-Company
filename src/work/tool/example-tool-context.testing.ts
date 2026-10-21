import type { ToolContext } from "./define-tool.ts"

export const exampleToolContext: ToolContext = {
    projectRoot: "/tmp/acme",
    journal: { projectRoot: "/tmp/acme", events: [] },
    task: {
        id: "20261018-140323-000-77aa",
        askedAt: "2026-10-18T14:03:23.000Z",
        type: "catch-up-thread",
        params: { threadId: "2026-10-18-choice-of-framework" },
        positionId: "backend-developer",
        causeEventId: "20261018-140322-123-5d1e",
    },
    depth: 1,
    position: {
        id: "backend-developer",
        title: "Backend Developer",
        description: "",
    },
    employee: {
        id: "claude-senior",
        name: "Claude Senior",
        kind: "llm",
        providerId: "anthropic",
        modelId: "opus",
    },
    runId: "20261018-140324-000-1b2c",
}
