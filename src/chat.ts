import { create_request, ChatRequest, MessageEntry, Messages, MessageEntryRoles } from "./plugin";

const msgInput = document.getElementById("msgInput") as HTMLInputElement
const sendBtn   = document.getElementById("sendBtn") as HTMLButtonElement
const messageList = document.getElementById("messageList") as HTMLDivElement

interface UIMessage {
    sender?: string,
    content?: string
    timestamp?: string
}

function NewMessage({sender, content, timestamp}: UIMessage, outgoing: boolean = false){
    const template = document.getElementById(outgoing ? "message-outgoing" : "message-incoming")
    if (!template) throw new Error("Message template not found");
    const clone = template.cloneNode(true)
    const senderE = clone.querySelector('.sender')
    const bubbleE = clone.querySelector('.bubble')
    const timestampE = clone.querySelector('.timestamp')
    clone.id=""
    senderE.textContent = sender ?? "Anon"
    bubbleE.textContent = content ?? "..."
    timestampE.textContent = timestamp ?? Date.now()
    return {
        clone,
        senderE,
        bubbleE,
        timestampE
    }
}

class AICharacter {
    name: string
    instructions: string

    constructor(name: string, instructions: string){
        this.name=name
        this.instructions=instructions
    }

    out(): string {
        return `
        > Character Definition | ${this.name}
        ${this.instructions}
        `
    }
}

class AIConversation {
    chars: AICharacter[]
    context: Messages

    Char(name: string): AICharacter | undefined {
        return this.chars.find(c => c.name==name)
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
        > Every resopnse should include a meaningful escalation, not nesscarily physically, but also emotionally in the charecters
        `
    }
    
    GenerateAIContext(): string {
        return `${this.chars.map(c => c.out()).join('\n')}`
    }

    AddMessageD(content: string, role: MessageEntryRoles = "user"){
        this.context.push({role,content})
    }

    Init(): void {
        // if there is none provided in the constructor your init here
        this.AddMessageD(this.GenerateRules(),'system')
        this.AddMessageD(this.GenerateAIContext(),'user')
    }

    AIMessage(name: string, instruction?: string): boolean {
        const char = this.Char(name)
        if(!char){ console.error(`[AIConversation] [AIMessage] [-] Failed to find char [${name}]}`);return false }
        // if instruction is emptey, ai will rely on current context
        this.AddMessageD(`respond for ${name}. ${instruction}`)
        return true;
    }

    StreamOutput(cb:(x:string)=>void){
        const r = new ChatRequest({messages:this.context},true)
        r.run(x => cb(x))
    }
    
    public constructor(chars: AICharacter[] = [], context: Messages = []){
        this.chars=chars;
        this.context=context;
    }
}

const dudebro = new AICharacter("dudebro99", "mean, bully, asshole")
const guy = new AICharacter("guy", "nice, kind, caring")
const c = new AIConversation([guy,dudebro])
c.Init()

sendBtn.onclick = function(){
    const value = msgInput.value
    if(value[0]=='/'){
        // cmd
        const split = value.split(' ')
        const cmd = split.shift().replace('/','')
        const input = split.join(' ')
        console.log(`${cmd} -> ${input}`)
        c.AIMessage(cmd,input)
        const ai = NewMessage({sender:cmd,content:""})
        messageList.appendChild(ai.clone)
        c.StreamOutput((x: string) => {            
            ai.bubbleE.textContent+=x
        })
    }
}