import express from "express"
import {build} from "./build.ts"
import { create_request } from "./src/plugin.ts"
import bodyParser from "body-parser"

await build()

const app = express()
const model = "mistral"
const files = (import.meta.dirname+"\\public") ?? ""

app.use((req, res, next) => {
    const ip = req.socket.remoteAddress
    console.log(`[${req.method}] [${req.path}] [${ip}]`)
    next()
})
app.use(bodyParser.json())
app.use(express.static(files))

app.get("/", (req, res) => {
    res.sendFile(files+"\\chat.html")
})

app.post("/test", async (req, res, next) => {
    const messages = req.body["messages"] ?? [
    {role:'system',content:'keep responses minimal, dont add extra information'},
    {role:'user',content:'hello'}]

    let completed = false
    req.on("aborted", () => {
        if (!completed) {
            console.log("[-] disconnected / aborted request") 
        }
    })
    create_request("http://localhost:11434/api/chat",new AbortController(),{
        messages,
        model
    },x=>{
        const r = JSON.parse(x)
        if(r.done){
            completed=true
            console.log("[+] request completed!")
            res.end()
            res.status(200)
        }
        res.write(r.message.content)
    })
    .then(r => {

    })
    .catch(e => {
        console.log("err: "+e.message)
    })
})

app.get("/build",async (req,res,next)=>{
    res.send(await build())
})

app.listen(80)