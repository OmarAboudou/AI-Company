import { readGitCommitter } from "../../git/read-git-committer.ts"
import type { Author } from "../../messaging/message/schema.ts"
import type { ToolContext } from "./define-tool.ts"

export function readCallAuthor({
    projectRoot,
    position,
    worker,
}: ToolContext): Author {
    return {
        position: { id: position.id, title: position.title },
        ...(worker.kind === "employee" && {
            employee: { id: worker.employee.id, name: worker.employee.name },
        }),
        committer: readGitCommitter(projectRoot),
    }
}
