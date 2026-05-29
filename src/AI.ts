import { ChatRequest } from "./plugin"

export type MessageEntryRoles = "user"|"system"|"assistant"

export type MessageEntry = {
    role: MessageEntryRoles,
    content: string
}

export type Messages = MessageEntry[]

export interface AICharacter {
    instructions: string
}

export type StorageT = {
    Characters: AICharacter[]
    Conversations: AIConversation[]
}

export const Storage: StorageT = {
    Characters:[],
    Conversations:[]
}

export function save(){
    localStorage.setItem("context",JSON.stringify(Storage))
}

export function load(){
    const data = JSON.parse(localStorage.getItem("context"))
    
    Storage["Characters"] = data.Characters.map(raw => AICharacter.fromJSON(raw))
    Storage["Conversations"] = data.Conversations.map(raw => AIConversation.fromJSON(raw))
}

export class AICharacter {
    name: string
    instructions: string

    constructor(name: string, instructions: string) {
        this.name = name
        this.instructions = instructions
        Storage.Characters.push(this)
    }

    out(): string {
        return `
        > Character Definition | ${this.name}
        ${this.instructions}
        `
    }

    static fromJSON({name, instructions}: {name: string, instructions: string}){
        return new AICharacter(name,instructions)
    }
}

export class AIConversation {
    chars: AICharacter[]
    context: Messages
    logs: HTMLSpanElement[]

    Char(name: string): AICharacter | undefined {
        return this.chars.find(c => c.name == name)
    }

    GenerateRules(): string {
        return `
        > You are a limted omniscient ai character roleplaying engine
        
        # Rules
        > You cannot break character 
        > Your responses must pretain and abide by the instructions and rules of the character you are responding for
        > Make characters react emotionally and realistically
        > Dont drag out a one sided interaction, for example if somone asks a question. end the response
        
        # Style
        > You speak in third person
        > You are aware of thoughts and feelings of only the charecter your currently responding for
        > Your responses arent labeled
        > Keep respones short, <2 paragraphs of content
        > When responding for a charecter, keep in mind that charecter is oblivious to the thoughts and feelings of others 
        > Each resopnse should include a meaningful escalation, not nesscarily physically, but also emotionally in the charecters
        > Each resopnse should ONLY include the thoughts feelings and actions of one charecter
        > Each response should NOT include things external of the senario, for example "Responding For CHARNAME:" is not allowed
        `
    }

    GenerateAIContext(): string {
        return `${this.chars.map(c => c.out()).join('\n')}`
    }

    AddMessageD(content: string, role: MessageEntryRoles = "user") {
        this.context.push({ role, content })
    }

    Init(): void {
        // if there is none provided in the constructor your init here
        this.AddMessageD(this.GenerateRules(), 'system')
        this.AddMessageD(this.GenerateAIContext(), 'user')
    }

    async AIMessage(name: string, instruction?: string, cb: (x: string) => void): Promise<string> {
        const char = this.Char(name)
        if (!char) { throw new Error(`[AIConversation] [AIMessage] [-] Failed to find char [${name}]}`) }
        // if instruction is emptey, ai will rely on current context
        this.AddMessageD(`respond for ${name}. ${instruction}`)
        // CHANGE FOR TO AS!!!

        // req (stream output)
        const req = new ChatRequest({ messages: this.context }, true)
        const log = document.createElement("span")
        log.className = "log"
        var all = ""
        var done = false
        function renderLog() {
            log.innerHTML = `
            [${done ? "✓" : "loading..."}] AIMessage Request <br>
            name-> ${name} <br>
            instruction-> ${instruction} <br>
            response-> ${all} <br>
            `
        }
        this.logs.push(log)
        const r = await req.run(x => {
            cb(x)
            all += x
            renderLog()
        })
        done = true; renderLog()
        this.AddMessageD(r, 'assistant')
        return r;
    }

    public constructor(chars: AICharacter[] = [], context: Messages = []) {
        this.chars = chars;
        this.context = context;
        this.logs = []
        Storage.Conversations.push(this)
    }

    static fromJSON({context, chars}: {context:Messages,chars:AICharacter[]}){
        const c = new AIConversation()
        c.context = context
        c.chars = chars
        return c
    }
}