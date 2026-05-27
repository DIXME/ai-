import { create_request, ChatRequest, MessageEntry, Messages, MessageEntryRoles } from "./plugin";

const msgInput = document.getElementById("msgInput") as HTMLInputElement
const sendBtn   = document.getElementById("sendBtn") as HTMLButtonElement
const messageList = document.getElementById("messageList") as HTMLDivElement
const rightPanel = document.getElementById("panel-body") as HTMLDivElement

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
        > Each resopnse should include a meaningful escalation, not nesscarily physically, but also emotionally in the charecters
        > Each resopnse should ONLY include the thoughts feelings and actions of one charecter
        > Each response should NOT include things external of the senario, for example "Responding For CHARNAME:" is not allowed
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

    async AIMessage(name: string, instruction?: string, cb:(x:string)=>void): Promise<string>{
        const char = this.Char(name)
        if(!char){ throw new Error(`[AIConversation] [AIMessage] [-] Failed to find char [${name}]}`)}
        // if instruction is emptey, ai will rely on current context
        this.AddMessageD(`respond for ${name}. ${instruction}`)

        // req (stream output)
        const req = new ChatRequest({messages:this.context},true)
        const log = document.createElement("span")
        log.className = "log"
        var all = ""
        var done = false
        function renderLog(){
            log.innerHTML= `
            [${done ? "✓" : "loading..."}] AIMessage Request <br>
            name-> ${name} <br>
            instruction-> ${instruction} <br>
            response-> ${all} <br>
            `
        }
        rightPanel.appendChild(log)
        const r = await req.run(x => {
            cb(x)
            all+=x
            renderLog()
        })
        done=true;renderLog()
        c.AddMessageD(r,'assistant')
        return r;
    }
    
    public constructor(chars: AICharacter[] = [], context: Messages = []){
        this.chars=chars;
        this.context=context;
    }
}

function ParseAIConversation(c: AIConversation){
    messageList.innerHTML=""
    c.context.forEach((m: MessageEntry) => {
        const msg = NewMessage({sender:m.role,content:m.content},m.role=="user")
        messageList.appendChild(msg.clone)
    })
}

const dudebro = new AICharacter("dudebro99", "mean, bully, asshole")
const guy = new AICharacter("guy", "nice, kind, caring")
const c = new AIConversation([guy,dudebro])
c.Init()

console.log(msgInput,sendBtn)

function CommandHandler(value: string = msgInput.value){
    return new Promise(resolve => {
        if(value[0]=='/'){
            // cmd
            const split = value.split(' ')
            const cmd = split.shift().replace('/','')
            const input = split.join(' ')
            console.log(`${cmd} -> ${input}`)
            const ai = NewMessage({sender:cmd,content:""})
            messageList.appendChild(ai.clone)
            c.AIMessage(cmd,input,(x: string) => {            
                ai.bubbleE.textContent+=x
            }).then(r=>resolve(r))
        }
    })
    
}

async function main(){
    await CommandHandler('/dudebro99 go bully guy in the hallway')
    await CommandHandler('/guy')
    console.log("context\n["+c.context.map(m => `{role:${m.role},content:${m.content}}`).join(',')+"]")
    ParseAIConversation(c)
}


sendBtn.onclick = () => CommandHandler()

main()