import z from "zod";

class Tool{
    
    private definition: ToolDefinition<z.ZodAny, z.ZodAny>
    private inputSchema: z.ZodType
    private outputSchema: z.ZodType

    constructor(
        definition: ToolDefinition<z.ZodAny, z.ZodAny>,
        inputSchema: z.ZodType,
        outputSchema: z.ZodType
    ){
        this.definition = definition
        this.inputSchema = inputSchema
        this.outputSchema = outputSchema
    }

    public async execute(...params: unknown[]) : Promise<unknown> {
        console.log(`Starting to execute tool : ${this.definition.name}`)
        this.checkParams({...params})
        const result = await this.definition.execute(params)
        this.checkReturnValue(result)
        console.log(`Done executing tool : ${this.definition.name}`)
        return result
    }
    
    private checkParams(params: unknown) {
        const parsingResult = z.safeParse(this.inputSchema, params)
        
        if(!parsingResult.success){

            throw new Error(`Failed to parse parameters : \n\t ${z.treeifyError(parsingResult.error)}`)
        }

        console.log(`Succesfully parsed parameters for tool : ${this.definition.name}`, parsingResult.data)
    }

    private checkReturnValue(returnValue: unknown) {
        const parsingResult = z.safeParse(this.outputSchema, returnValue)

        if(!parsingResult.success){

            throw new Error(`Failed to parse return value : \n\t ${z.treeifyError(parsingResult.error)}`)
        }

        console.log(`Succesfully parsed return value for tool : ${this.definition.name}`, parsingResult.data)
    }
}

interface ToolDefinition<TInput extends z.ZodType = z.ZodAny, TOutput extends z.ZodType = z.ZodAny> {
    name: string;
    description: string;
    inputSchema: TInput;
    outputSchema: TOutput;
    execute: (params: z.infer<TInput>) => Promise<z.infer<TOutput>>;
}

export function defineTool<TInput extends z.ZodType = z.ZodAny, TOutput extends z.ZodType = z.ZodAny>(
    definition: ToolDefinition<TInput, TOutput>
){
    return definition;
}