const idPattern = "[a-z0-9]+(?:-[a-z0-9]+)*"

const mentionPattern = new RegExp(
    `(?<![\\w@.])@(${idPattern})(?::(${idPattern}))?(?![\\w-])`,
    "g",
)

function formatOnItsOwnLine(children: string): string {
    return `\n${children}\n`
}

function removeCode(markdown: string): string {
    return Bun.markdown.render(markdown, {
        code: () => "",
        codespan: () => "",
        paragraph: formatOnItsOwnLine,
        heading: formatOnItsOwnLine,
        blockquote: formatOnItsOwnLine,
        list: formatOnItsOwnLine,
        listItem: formatOnItsOwnLine,
        table: formatOnItsOwnLine,
        tr: formatOnItsOwnLine,
        th: formatOnItsOwnLine,
        td: formatOnItsOwnLine,
    })
}

export type Mentions = {
    positionIds: string[]
    employeeMentions: string[]
}

export function findMentions(body: string): Mentions {
    const positionIds: string[] = []
    const employeeMentions: string[] = []
    const mentionMatches = removeCode(body).matchAll(mentionPattern)
    for (const [mentionText, positionId, employeeId] of mentionMatches) {
        if (employeeId !== undefined) {
            employeeMentions.push(mentionText)
        } else if (
            positionId !== undefined &&
            !positionIds.includes(positionId)
        ) {
            positionIds.push(positionId)
        }
    }
    return { positionIds, employeeMentions }
}
