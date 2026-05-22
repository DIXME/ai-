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
  runHeadless(callback) {
    this.controller = new AbortController;
    this.req = create_request("/test", this.controller, this.data, (x) => {
      if (callback) {
        callback(x);
      }
    });
    this.req.then((c) => {
      if (!this.stoped) {
        console.log("stoped!");
      }
      console.log("✔️ done");
    });
    return this.req;
  }
  el() {
    const template = document.getElementById("template");
    if (!template) {
      console.error("[ChatRequest] El template not found!");
      return false;
    }
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

// src/chat.ts
var msgInput = document.getElementById("msgInput");
var sendBtn = document.getElementById("sendBtn");
var messageList = document.getElementById("messageList");
function NewMessage(message, outgoing = false) {
  const template = document.getElementById(outgoing ? "message-outgoing" : "message-incoming");
  if (!template)
    throw new Error("Message template not found");
  const clone = template.cloneNode(true);
  const sender = clone.querySelector(".sender");
  const bubble = clone.querySelector(".bubble");
  const timestamp = clone.querySelector(".timestamp");
  clone.id = "";
  sender.textContent = message.role;
  bubble.textContent = message.content;
  timestamp.textContent = Date.now();
  return {
    clone,
    sender,
    bubble,
    timestamp,
    add: () => AddMessage(message.content, message.role)
  };
}
var MessagesList = [
  { role: "system", content: "short responses, keep it simple, small as posiable, your texting the user, your the users mother" }
];
function AddMessage(content, role = "user") {
  MessagesList.push({ role, content });
}
sendBtn.onclick = function() {
  const value = msgInput.value;
  if (value[0] == "/") {
    const split = value.split(" ");
    const cmd = split.shift().replace("/", "");
    const input = split.join(" ");
    console.log(`${cmd} -> ${input}`);
    switch (cmd) {
      case "ai":
        AddMessage(`respond in character, ${input}`);
        const ai = NewMessage({ role: "assistant", content: "" });
        messageList.appendChild(ai.clone);
        new ChatRequest({ messages: MessagesList }).runHeadless((x) => ai.bubble.textContent += x).then((result) => ai.add());
        break;
      case "user":
        AddMessage(`respond in character as your child, ${input}`);
        const user = NewMessage({ role: "user", content: "" }, true);
        messageList.appendChild(user.clone);
        new ChatRequest({ messages: MessagesList }).runHeadless((x) => user.bubble.textContent += x).then((result) => user.add());
        break;
    }
  } else {
    const user = NewMessage({ role: "user", content: msgInput.value }, true);
    const ai = NewMessage({ role: "assistant", content: "" });
    messageList.appendChild(user.clone);
    user.add();
    messageList.appendChild(ai.clone);
    const r = new ChatRequest({ messages: MessagesList });
    r.runHeadless((x) => ai.bubble.textContent += x).then((result) => ai.add());
  }
};
