import type { AnswerEvent } from "../work/answer-mentions.ts"
import { printUnknownMentions } from "./print-unknown-mentions.ts"

export function printAnswerEvent(event: AnswerEvent): void {
    switch (event.kind) {
        case "vacant":
            console.error(
                `@${event.position.id} is vacant: the message waits until someone is assigned.`,
            )
            return
        case "worked-by-directors":
            console.error(
                `@${event.position.id} is worked by the directors: the message waits for their answer.`,
            )
            return
        case "worked-by-human":
            console.error(
                `@${event.position.id} is worked by ${event.employee.name}, a human: the message waits for their answer.`,
            )
            return
        case "answering":
            console.error(
                `${event.employee.name} answers as ${event.position.title} (@${event.position.id}):`,
            )
            return
        case "text":
            process.stdout.write(event.text)
            return
        case "streamed":
            process.stdout.write("\n")
            return
        case "answered":
            if (event.isCut) {
                console.error(
                    `${event.employee.name}'s answer was cut at its length limit.`,
                )
            }
            printUnknownMentions(event.unknownMentionIds)
    }
}
