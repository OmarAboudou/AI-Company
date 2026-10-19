const id = "[a-z0-9]+(?:-[a-z0-9]+)*"

const mention = new RegExp(`(?<![\\w@.])@(${id})(?::(${id}))?(?![\\w-])`, "g")

function onItsOwnLine(children: string): string {
    return `\n${children}\n`
}

function withoutCode(markdown: string): string {
    return Bun.markdown.render(markdown, {
        code: () => "",
        codespan: () => "",
        paragraph: onItsOwnLine,
        heading: onItsOwnLine,
        blockquote: onItsOwnLine,
        list: onItsOwnLine,
        listItem: onItsOwnLine,
        table: onItsOwnLine,
        tr: onItsOwnLine,
        th: onItsOwnLine,
        td: onItsOwnLine,
    })
}

export type Mentions = {
    positionIds: string[]
    employeeMentions: string[]
}

export function findMentions(body: string): Mentions {
    const positionIds: string[] = []
    const employeeMentions: string[] = []
    for (const [text, positionId, employeeId] of withoutCode(body).matchAll(
        mention,
    )) {
        if (employeeId !== undefined) {
            employeeMentions.push(text)
        } else if (
            positionId !== undefined &&
            !positionIds.includes(positionId)
        ) {
            positionIds.push(positionId)
        }
    }
    return { positionIds, employeeMentions }
}
