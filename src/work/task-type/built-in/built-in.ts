import type { TaskType } from "../define-task-type.ts"
import { analyseFailureTaskType } from "./analyse-failure/analyse-failure.ts"
import { analyseRenouncementTaskType } from "./analyse-renouncement/analyse-renouncement.ts"
import { answerTaskType } from "./answer/answer.ts"
import { handleTaskType } from "./handle/handle.ts"
import { resumeTaskType } from "./resume/resume.ts"
import { validateTaskType } from "./validate/validate.ts"

export const builtInTaskTypes: Record<string, TaskType> = Object.fromEntries(
    [
        handleTaskType,
        answerTaskType,
        resumeTaskType,
        validateTaskType,
        analyseFailureTaskType,
        analyseRenouncementTaskType,
    ].map((taskType) => [taskType.type, taskType]),
)
