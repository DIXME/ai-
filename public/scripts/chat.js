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

// src/AI.ts
var Storage = {
  Characters: [],
  Conversations: []
};
function save() {
  localStorage.setItem("context", JSON.stringify(Storage));
}
function load() {
  const data = JSON.parse(localStorage.getItem("context"));
  Storage["Characters"] = data.Characters.map((raw) => AICharacter.fromJSON(raw));
  Storage["Conversations"] = data.Conversations.map((raw) => AIConversation.fromJSON(raw));
}

class AICharacter {
  name;
  instructions;
  constructor(name, instructions) {
    this.name = name;
    this.instructions = instructions;
    Storage.Characters.push(this);
  }
  out() {
    return `
        > Character Definition | ${this.name}
        ${this.instructions}
        `;
  }
  static fromJSON({ name, instructions }) {
    return new AICharacter(name, instructions);
  }
}

class AIConversation {
  chars;
  context;
  logs;
  Char(name) {
    return this.chars.find((c) => c.name == name);
  }
  GenerateRules() {
    return `
        You are a creative roleplay assistant. Your role is to collaboratively tell stories with the user through interactive chat roleplay.

        ## Core Behavior
        - Play characters the user assigns you, or invent fitting characters based on context
        - Write in third-person narrative OR as a character speaking directly — match whatever style the user establishes
        - Always end your response leaving the scene open for the user's next action
        - Never control or speak for the user's character without permission
        - Match the tone, genre, and pacing the user sets (dark, lighthearted, romantic, action, horror, fantasy, etc.)

        ## Writing Style
        - Use vivid, immersive descriptions for scenes, emotions, and character actions
        - Vary sentence length for pacing — short punchy lines for tension, longer flowing ones for atmosphere
        - Use italics for actions/narration and regular text for dialogue, e.g.:
        *The figure steps out of the shadows, eyes glinting.* "You weren't supposed to find this place."

        ## Character Play
        - Give characters distinct voices, speech patterns, and personalities
        - Stay in character unless the user signals OOC (out of character) with double brackets like ((this))
        - If playing multiple NPCs, keep their voices distinguishable

        ## Escalation & Limits
        - Follow the user's lead on tone and intensity
        - If a scene shifts genre or mood, adapt naturally without breaking immersion
        - For sensitive or mature themes, use tasteful, non-graphic storytelling unless the user explicitly sets a different expectation

        ## Prompting the Story Forward
        - If the user seems stuck, subtly introduce a new element — a sound, a character, an event — to spark action
        - Occasionally introduce unexpected plot twists or random NPCs to keep the story surprising

        ## Starting a Scene
        When the user gives you a prompt or scenario, open with:
        1. A short scene-setting paragraph (2–4 sentences)
        2. Your character's introduction or first action
        3. A natural hook that invites the user to act
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
  async AIMessage(name, instruction, cb) {
    const char = this.Char(name);
    if (!char) {
      throw new Error(`[AIConversation] [AIMessage] [-] Failed to find char [${name}]}`);
    }
    this.AddMessageD(`respond as ${name}. ${instruction}`);
    const req = new ChatRequest({ messages: this.context }, true);
    const log = document.createElement("span");
    log.className = "log";
    var all = "";
    var done = false;
    function renderLog() {
      log.innerHTML = `
            [${done ? "✓" : "loading..."}] AIMessage Request <br>
            name-> ${name} <br>
            instruction-> ${instruction} <br>
            response-> ${all} <br>
            `;
    }
    this.logs.push(log);
    const r = await req.run((x) => {
      cb(x);
      all += x;
      renderLog();
    });
    done = true;
    renderLog();
    this.AddMessageD(r, "assistant");
    return r;
  }
  constructor(chars = [], context = []) {
    this.chars = chars;
    this.context = context;
    this.logs = [];
    Storage.Conversations.push(this);
  }
  static fromJSON({ context, chars }) {
    const c = new AIConversation;
    c.context = context;
    c.chars = chars;
    return c;
  }
}

// src/chat.ts
var msgInput = document.getElementById("msgInput");
var sendBtn = document.getElementById("sendBtn");
var messageList = document.getElementById("messageList");
var rightPanel = document.getElementById("panel-body");
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
function ParseAIConversation(c) {
  messageList.innerHTML = "";
  c.context.forEach((m) => {
    if (m.role == "assistant") {
      const insc_message = c.context[c.context.indexOf(m) - 1].content;
      const name = insc_message.split(".")[0].replace("respond as ", "");
      const msg = NewMessage({ sender: name, content: m.content });
      messageList.appendChild(msg.clone);
    }
  });
  c.logs.forEach((log) => {
    rightPanel.appendChild(log);
  });
  console.log(c);
}
var dudebro = new AICharacter("dudebro99", "mean, bully, asshole");
var guy = new AICharacter("guy", "nice, kind, caring");
var c = new AIConversation([guy, dudebro]);
c.Init();
console.log(msgInput, sendBtn);
function CommandHandler(value = msgInput.value) {
  return new Promise((resolve) => {
    if (value[0] == "/") {
      const split = value.split(" ");
      const cmd = split.shift().replace("/", "");
      const input = split.join(" ");
      console.log(`${cmd} -> ${input}`);
      const ai = NewMessage({ sender: cmd, content: "" });
      messageList.appendChild(ai.clone);
      c.AIMessage(cmd, input, (x) => {
        ai.bubbleE.textContent += x;
      }).then((r) => resolve(r));
    }
  });
}
async function main() {
  await CommandHandler("/dudebro99 go bully guy in the hallway");
  await CommandHandler("/guy");
  console.log(`context
[` + c.context.map((m) => `{role:${m.role},content:${m.content}}`).join(",") + "]");
  ParseAIConversation(c);
  save();
}
sendBtn.onclick = () => CommandHandler();
main();
