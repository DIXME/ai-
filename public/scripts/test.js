// src/plugin.ts
async function create_request(url, controller, data = {}, callback = (c) => {}) {
  const signal = controller.signal;
  const res = fetch(url, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json"
    },
    body: JSON.stringify(data),
    signal
  });
  return new Promise((resolve) => {
    res.then(async (r) => {
      const decoder = new TextDecoder("utf-8");
      var concat = "";
      for await (const chunk of r.body) {
        const chunkText = decoder.decode(chunk, { stream: true });
        concat += chunkText;
        callback(chunkText);
      }
      resolve(concat);
    }).catch((e) => {
      console.log(`[request] [${url}] closed: ${e}`);
      resolve(e);
    });
  });
}

class ChatRequest {
  data;
  controller;
  req;
  element;
  stoped;
  run(callback) {
    this.controller = new AbortController;
    const status = this.element.querySelector(".flag");
    const ttl = this.element.querySelector(".out");
    const loading = this.element.querySelector(".loader");
    status.style.backgroundColor = "red";
    loading.style.display = "block";
    ttl.textContent = "Awaiting response...";
    this.req = create_request("/test", this.controller, this.data, (x) => {
      if (ttl.textContent == "Awaiting response...") {
        ttl.textContent = "";
      }
      if (callback) {
        callback(x);
      }
      ttl.textContent += x;
    });
    this.req.then((c) => {
      if (!this.stoped) {
        status.style.backgroundColor = "green";
      }
      loading.style.display = "none";
    });
    return this.req;
  }
  el() {
    const template = document.getElementById("template");
    const el = template.cloneNode(true);
    const status = el.querySelector(".flag");
    el.id = "x";
    el.querySelector(".edit").onclick = () => {
      console.log("edit");
    };
    el.querySelector(".regen").onclick = () => {
      this.controller.abort();
      this.run();
    };
    el.querySelector(".end").onclick = () => {
      this.controller.abort();
      status.style.backgroundColor = "orange";
      this.stoped = true;
    };
    return el;
  }
  constructor(data = { messages: [
    { role: "system", content: "keep responses minimal, dont add extra information" },
    { role: "user", content: "hello" }
  ] }) {
    this.data = data;
    this.element = this.el();
    this.controller = new AbortController;
    this.stoped = false;
  }
}

// src/test.ts
var reqs = document.getElementById("reqs");
var rs = [];
for (let i = 0;i < 3; i++) {
  const r = new ChatRequest;
  rs.push(r);
  reqs.appendChild(r.element);
}
var requests = rs.map((r) => r.run());
Promise.all(requests).then((x) => console.log("done!"));
