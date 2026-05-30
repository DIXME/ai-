import { create_request, ChatRequest } from "./plugin";
import { AICharacter, AIConversation, MessageEntry, MessageEntryRoles, Messages, save, load, Storage } from "./AI";
import { ObjectViewer } from "./ObjectViewer";

const msgInput = document.getElementById("msgInput") as HTMLInputElement
const sendBtn = document.getElementById("sendBtn") as HTMLButtonElement
const messageList = document.getElementById("messageList") as HTMLDivElement
const rightPanel = document.getElementById("panel-body") as HTMLDivElement

interface UIMessage {
    sender?: string,
    content?: string
    timestamp?: string
}

function NewMessage({ sender, content, timestamp }: UIMessage, outgoing: boolean = false) {
    const template = document.getElementById(outgoing ? "message-outgoing" : "message-incoming")
    if (!template) throw new Error("Message template not found");
    const clone = template.cloneNode(true)
    const senderE = clone.querySelector('.sender')
    const bubbleE = clone.querySelector('.bubble')
    const timestampE = clone.querySelector('.timestamp')
    clone.id = ""
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

function ParseAIConversation(c: AIConversation) {
    messageList.innerHTML = ""
    c.context.forEach((m: MessageEntry) => {
        if(m.role=="assistant"){
            const insc_message: string = c.context[c.context.indexOf(m)-1].content
            const name = insc_message.split('.')[0].replace("respond as ","")
            const msg = NewMessage({ sender: name, content: m.content })
            messageList.appendChild(msg.clone)   
        }
    })
    c.logs.forEach((log:HTMLSpanElement) => {
        rightPanel.appendChild(log)
    })
    console.log(c)
}

const dudebro = new AICharacter("dudebro99", "mean, bully, asshole")
const guy = new AICharacter("guy", "nice, kind, caring")
const c = new AIConversation([guy, dudebro])
c.Init()

console.log(msgInput, sendBtn)

function CommandHandler(value: string = msgInput.value) {
    return new Promise(resolve => {
        if (value[0] == '/') {
            // cmd
            const split = value.split(' ')
            const cmd = split.shift().replace('/', '')
            const input = split.join(' ')
            console.log(`${cmd} -> ${input}`)
            const ai = NewMessage({ sender: cmd, content: "" })
            messageList.appendChild(ai.clone)
            c.AIMessage(cmd, input, (x: string) => {
                ai.bubbleE.textContent += x
            }).then(r => resolve(r))
        }
    })

}

async function main() {
    await CommandHandler('/dudebro99 go bully guy in the hallway')
    await CommandHandler('/guy')
    console.log("context\n[" + c.context.map(m => `{role:${m.role},content:${m.content}}`).join(',') + "]")
    ParseAIConversation(c)
    save()
}

sendBtn.onclick = () => CommandHandler()

main()

/*
main()

*/