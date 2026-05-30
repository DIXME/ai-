import express from "express"
import {build} from "./build.ts"
import bodyParser from "body-parser"
import ollama from "ollama"

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

app.get("/chat", async (req, res) => {
    await build()
    res.sendFile(files+"\\chat.html")
})

app.get("/test", async (req, res) => {
    await build()
    res.sendFile(files+"\\test.html")
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

    ollama.chat({
        stream:true,
        keep_alive:"15m",
        model:"mistral",
        messages:messages
    })
    .then(async r => {
        for await (const chunk of r) {
            res.write(chunk.message.content)
        }
        res.end()
        res.status(200)
    })
    .catch(e => {
        console.error(e)
        res.end()
        res.status(500)
    })
})

app.get("/build",async (req,res,next)=>{
    res.send(await build())
})

app.listen(80)