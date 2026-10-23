import type { Command } from "@commander-js/extra-typings"
import { projectRoot } from "../../project-root.ts"

export function registerTaskWorkCommand(taskCommand: Command): void {
    taskCommand
        .command("work")
        .description(
            "Work the tasks of the positions you work, one after the other, as an LLM employee does: AICo asks what to do, which tool to call and its inputs. Once no task waits, it waits for the next one, until Ctrl+C or Ctrl+D.",
        )
        .action(async () => {
            // Only this command needs Inquirer: imported with the program,
            // it would slow the start of every other command.
            const { workTasks } = await import("./work-tasks.ts")
            await workTasks(projectRoot, process.env)
        })
}
