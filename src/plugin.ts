export async function 
create_request(url: string, controller: AbortController, data: Object = {}, callback:(x: string)=>void=c=>{}): Promise<string>{
    const signal = controller.signal

    const res = fetch(url,{
        method: "POST",
        headers: {
            'Content-Type': 'application/json',
            'Accept': 'application/json',
        },
        body: JSON.stringify(data),
        signal     
    })

    return new Promise(resolve => {
        res
        .then(async (r: Response)=> {
            const decoder = new TextDecoder("utf-8");
            var concat = ""
            for await (const chunk of r.body) {
                const chunkText = decoder.decode(chunk, { stream: true });
                concat+=chunkText
                callback(chunkText)
            }
            resolve(concat) // send back full string
        })
        .catch(e => {
            console.log(`[request] [${url}] closed: ${e}`)
            resolve(e)
        })
    })
}

export type MessageEntryRoles = "user"|"system"|"assistant"

export type MessageEntry = {
    role: MessageEntryRoles,
    content: string
}

export type Messages = MessageEntry[]

export interface ChatRequestPayload {
    messages: Messages
}

export interface AICharacter {
    instructions: string
}

export class ChatRequest {
    data: ChatRequestPayload
    controller: AbortController
    req?: Promise<string>
    element: Node
    stoped: Boolean

    run(callback?:(x:string)=>void){
        this.controller = new AbortController(); // new controller! important!
        const status = this.element.querySelector('.flag');
        const ttl = this.element.querySelector('.out')
        const loading = this.element.querySelector('.loader')

        status.style.backgroundColor = "red"
        loading.style.display = "block"
        ttl.textContent="Awaiting response..."
        
        this.req = create_request("/test",this.controller,this.data,x=>{
            if(ttl.textContent == "Awaiting response..."){
                ttl.textContent = ""
            }
            if(callback){
                callback(x)
            }
            ttl.textContent+=x
        })

        this.req.then(c => {
            if(!this.stoped){
                status.style.backgroundColor = "green"
            }
            loading.style.display = "none"
        })
        return this.req
    }

    runHeadless(callback?:(x:string)=>void){
        this.controller = new AbortController(); // new controller! important!
        
        this.req = create_request("/test",this.controller,this.data,x=>{
            if(callback){callback(x)}
        })

        this.req.then(c => {
            if(!this.stoped){
                console.log("stoped!")
            }
            console.log('✔️ done')
        })
        return this.req
    }

    el(): Node | Boolean { // element factory
        const template = document.getElementById("template")
        if(!template){console.error("[ChatRequest] El template not found!");return false}
        const el = template.cloneNode(true)
        const status = el.querySelector('.flag');
        el.id = "x"
        el.querySelector(".edit").onclick = () => {
            console.log('edit')
        }
        el.querySelector(".regen").onclick = () => {
            this.controller.abort()
            this.run()
        }
        el.querySelector(".end").onclick = () => {
            this.controller.abort()
            status.style.backgroundColor="orange"
            this.stoped=true
        }
        return el
    }

    public constructor(data: ChatRequestPayload = {messages:[
    {role:'system',content:'keep responses minimal, dont add extra information'},
    {role:'user',content:'hello'}]}){
        this.data = data;
        this.element = this.el()
        this.controller = new AbortController();
        this.stoped = false;
    }
}