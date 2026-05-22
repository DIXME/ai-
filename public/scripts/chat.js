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
  headless;
  run(callback) {
    if (this.headless) {
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
    } else {
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
  constructor(data = { messages: [] }, headless = true) {
    this.data = data;
    this.headless = headless;
    if (!headless) {
      this.element = this.el();
    }
    this.controller = new AbortController;
    this.stoped = false;
  }
}

// src/chat.ts
var msgInput = document.getElementById("msgInput");
var sendBtn = document.getElementById("sendBtn");
var messageList = document.getElementById("messageList");
function NewMessage({ sender, content, timestamp }, outgoing = false) {
  const template = document.getElementById(outgoing ? "message-outgoing" : "message-incoming");
  if (!template)
    throw new Error("Message template not found");
  const clone = template.cloneNode(true);
  const senderE = clone.querySelector(".sender");
  const bubbleE = clone.querySelector(".bubble");
  const timestampE = clone.querySelector(".timestamp");
  clone.id = "";
  senderE.textContent = sender ?? "Anon";
  bubbleE.textContent = content ?? "...";
  timestampE.textContent = timestamp ?? Date.now();
  return {
    clone,
    senderE,
    bubbleE,
    timestampE
  };
}

class AICharacter {
  name;
  instructions;
  constructor(name, instructions) {
    this.name = name;
    this.instructions = instructions;
  }
  out() {
    return `
        > Character Definition | ${this.name}
        ${this.instructions}
        `;
  }
}

class AIConversation {
  chars;
  context;
  Char(name) {
    return this.chars.find((c) => c.name == name);
  }
  GenerateRules() {
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
        > Every resopnse should include a meaningful escalation, not nesscarily physically, but also emotionally in the charecters
        `;
  }
  GenerateAIContext() {
    return `${this.chars.map((c) => c.out()).join(`
`)}`;
  }
  AddMessageD(content, role = "user") {
    this.context.push({ role, content });
  }
  Init() {
    this.AddMessageD(this.GenerateRules(), "system");
    this.AddMessageD(this.GenerateAIContext(), "user");
  }
  AIMessage(name, instruction) {
    const char = this.Char(name);
    if (!char) {
      console.error(`[AIConversation] [AIMessage] [-] Failed to find char [${name}]}`);
      return false;
    }
    this.AddMessageD(`respond for ${name}. ${instruction}`);
    return true;
  }
  StreamOutput(cb) {
    const r = new ChatRequest({ messages: this.context }, true);
    r.run((x) => cb(x));
  }
  constructor(chars = [], context = []) {
    this.chars = chars;
    this.context = context;
  }
}
var dudebro = new AICharacter("dudebro99", "mean, bully, asshole");
var guy = new AICharacter("guy", "nice, kind, caring");
var c = new AIConversation([guy, dudebro]);
c.Init();
sendBtn.onclick = function() {
  const value = msgInput.value;
  if (value[0] == "/") {
    const split = value.split(" ");
    const cmd = split.shift().replace("/", "");
    const input = split.join(" ");
    console.log(`${cmd} -> ${input}`);
    c.AIMessage(cmd, input);
    const ai = NewMessage({ sender: cmd, content: "" });
    messageList.appendChild(ai.clone);
    c.StreamOutput((x) => {
      ai.bubbleE.textContent += x;
    });
  }
};
