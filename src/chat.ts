import { create_request, ChatRequest, MessageEntry, Messages, MessageEntryRoles } from "./plugin";

const msgInput = document.getElementById("msgInput") as HTMLInputElement
const sendBtn   = document.getElementById("sendBtn") as HTMLButtonElement
const messageList = document.getElementById("messageList") as HTMLDivElement

function NewMessage(message: MessageEntry, outgoing: boolean = false){
    const template = document.getElementById(outgoing ? "message-outgoing" : "message-incoming")
    if (!template) throw new Error("Message template not found");
    const clone = template.cloneNode(true)
    const sender = clone.querySelector('.sender')
    const bubble = clone.querySelector('.bubble')
    const timestamp = clone.querySelector('.timestamp')
    clone.id=""
    sender.textContent = message.role
    bubble.textContent = message.content
    timestamp.textContent = Date.now()
    return {
        clone,
        sender,
        bubble,
        timestamp,
        add: () => AddMessage(message.content,message.role)
    }
}

function DisplayMessages(messages: Messages){
    // Messages array -> Html Display
    messageList.innerHTML = ""
    messages.forEach((message: MessageEntry) => {
        messageList.appendChild(
            NewMessage(message,message.role=="user").clone
        )
    })
}

const MessagesList: Messages = [
    {role:'system', content:'short responses, keep it simple, small as posiable, your texting the user, your the users mother'}
]

function AddMessage(content: string, role: MessageEntryRoles = "user"){
    MessagesList.push({role,content})
}

export class AICharacter {
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

export class AIConversation {}

sendBtn.onclick = function(){
    const value = msgInput.value
    if(value[0]=='/'){
        // cmd
        const split = value.split(' ')
        const cmd = split.shift().replace('/','')
        const input = split.join(' ')
        console.log(`${cmd} -> ${input}`)
        switch(cmd){
            case "ai":
                AddMessage(`respond in character, ${input}`)
                const ai = NewMessage({role:'assistant',content:''})
                messageList.appendChild(ai.clone)
                new ChatRequest({messages:MessagesList})
                .runHeadless(x => ai.bubble.textContent+=x)
                .then(result => ai.add())
                break;
            case "user":
                AddMessage(`respond as ${c}, ${input}`)
                const user = NewMessage({role:'user',content:''},true)
                messageList.appendChild(user.clone)
                new ChatRequest({messages:MessagesList})
                .runHeadless(x => user.bubble.textContent+=x)
                .then(result => user.add())
                break;
        }
    } else {
        const user = NewMessage({role:'user',content:msgInput.value},true)
        const ai = NewMessage({role:'assistant',content:''})
        messageList.appendChild(user.clone); user.add()
        messageList.appendChild(ai.clone); // wait for full result first
        const r = new ChatRequest({messages:MessagesList})
        r.runHeadless(x => ai.bubble.textContent+=x)
        .then(result => ai.add())
    }
}