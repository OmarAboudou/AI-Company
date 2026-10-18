const id = "[a-z0-9]+(?:-[a-z0-9]+)*"

const mention = new RegExp(`(?<![\\w@.])@(${id})(?::(${id}))?(?![\\w-])`, "g")

function withoutCode(markdown: string): string {
    return markdown
        .replace(/^(`{3,}|~{3,}).*$[\s\S]*?(?:^\1\s*$|(?![\s\S]))/gm, "")
        .replace(/(`+)[\s\S]*?\1/g, "")
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
