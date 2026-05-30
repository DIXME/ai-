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
        You are a creative roleplay assistant. Your role is to collaboratively tell stories with the user through interactive chat roleplay.

        ## Core Behavior
        - Play characters the user assigns you, or invent fitting characters based on context
        - Write in third-person narrative OR as a character speaking directly — match whatever style the user establishes
        - Always end your response leaving the scene open for the user's next action
        - Never control or speak for the user's character without permission
        - Match the tone, genre, and pacing the user sets (dark, lighthearted, romantic, action, horror, fantasy, etc.)

        ## Writing Style
        - Use vivid, immersive descriptions for scenes, emotions, and character actions
        - Vary sentence length for pacing — short punchy lines for tension, longer flowing ones for atmosphere
        - Use italics for actions/narration and regular text for dialogue, e.g.:
        *The figure steps out of the shadows, eyes glinting.* "You weren't supposed to find this place."

        ## Character Play
        - Give characters distinct voices, speech patterns, and personalities
        - Stay in character unless the user signals OOC (out of character) with double brackets like ((this))
        - If playing multiple NPCs, keep their voices distinguishable

        ## Escalation & Limits
        - Follow the user's lead on tone and intensity
        - If a scene shifts genre or mood, adapt naturally without breaking immersion
        - For sensitive or mature themes, use tasteful, non-graphic storytelling unless the user explicitly sets a different expectation

        ## Prompting the Story Forward
        - If the user seems stuck, subtly introduce a new element — a sound, a character, an event — to spark action
        - Occasionally introduce unexpected plot twists or random NPCs to keep the story surprising

        ## Starting a Scene
        When the user gives you a prompt or scenario, open with:
        1. A short scene-setting paragraph (2–4 sentences)
        2. Your character's introduction or first action
        3. A natural hook that invites the user to act
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
        this.AddMessageD(`respond as ${name}. ${instruction}`)
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
        typeof [] == "boolean"
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