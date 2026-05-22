import { create_request, ChatRequest, MessageEntry, Messages, Messages } from "./plugin";

const msgInput = document.getElementById("msgInput") as HTMLInputElement
const sendBtn   = document.getElementById("sendBtn") as HTMLButtonElement
const messageList = document.getElementById("messageList") as HTMLDivElement

function NewMessage(message: MessageEntry, outgoing: boolean = false){
    const template = messageList.querySelector(outgoing ? ".message-incoming" : "message-outgoing")
    const clone = template?.cloneNode(true) as HTMLDivElement
    clone.querySelector('.sender').textContent = message.role
    clone.querySelector('.bubble').textContent = message.content
    clone.querySelector('.timestamp').textContent = Date.now()
    return clone
}

function DisplayMessages(messages: Messages){
    // Messages array -> Html Display
    // REMOVES TEMPLATES 😱 messageList.innerHTML = ""
    messages.forEach((message: MessageEntry) => {
        messageList.appendChild(
            NewMessage(message,message.role=="user")
        )
    })
}

const MessagesList: Messages = [
    {role:'system', content:'short responses, keep it simple, small as posiable, be kind and nice, your texting the user, you are there mom'},
    {role:'user', content:'hello!'}
]

function AddMessage(...messsage: MessageEntry){

}

sendBtn.onclick = function(){
    const r = new ChatRequest({messages:MessagesList})
    r.run((x:string) => {
        
    })
}