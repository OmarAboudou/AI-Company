import type ApplicationConfig from "../ApplicationConfig"
import {readdir} from "node:fs/promises"
import {pathToFileURL} from "node:url"
import {join, resolve} from "node:path"
import {type ToolDefinition, isToolDefinition} from "./Tool"

const TOOL_DIRECTORY = "Tools"

export async function loadTools(appConfig: ApplicationConfig) : Promise<ToolDefinition[]>{
    const toolDirPath = join(appConfig.companyRootDir, TOOL_DIRECTORY);
    const entries = await readdir(toolDirPath, {withFileTypes: true, recursive: true})
    const tsFiles = entries.filter( (entry) => entry.isFile() && entry.name.endsWith(".ts") )
    const result : ToolDefinition[] = []
    for(const tsFile of tsFiles){
        const fileUrl = pathToFileURL(resolve(tsFile.parentPath, tsFile.name))
        const toolDefinition: unknown = ( await import( fileUrl.href ) ).default
        if(!isToolDefinition(toolDefinition)){
            throw new Error(`${fileUrl.pathname} does not export a valid tool as default`)
        }
        result.push(toolDefinition)
    }
    return result;
}