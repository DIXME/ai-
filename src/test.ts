import { create_request, ChatRequest  } from "./plugin";

function write(x: string): void {
    document.body.insertAdjacentHTML(`beforebegin`,x)
}

const reqs = document.getElementById("reqs")

const rs = []
for(let i = 0; i < 3; i++){
    const r = new ChatRequest()
    rs.push(r)
    reqs.appendChild(r.element)
}
const requests = rs.map(r=>r.run())
Promise.all(requests).then(x=>console.log('done!'))