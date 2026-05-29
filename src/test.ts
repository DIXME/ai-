// ── Types ────────────────────────────────────────────────────────────────────

type AnyObject = Record<string, unknown>

interface EditorOptions {
  depth?: number        // current recursion depth (internal)
  maxDepth?: number     // max recursion depth (default 4)
  onChange?: (key: string, value: unknown) => void
  onClose?: () => void
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function formatKey(key: string): string {
  return key
    .replace(/([A-Z])/g, ' $1')
    .replace(/[_-]/g, ' ')
    .replace(/^\w/, c => c.toUpperCase())
    .trim()
}

function escapeHtml(str: string): string {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Field renderers ───────────────────────────────────────────────────────────

function renderField(key: string, val: unknown, path: string, depth: number, maxDepth: number): string {
  const label = formatKey(key)
  const dataPath = escapeHtml(path)

  if (val === null || val === undefined) {
    return `
      <div class="ed-field">
        <span class="ed-label">${label}</span>
        <span class="ed-null">${val === null ? 'null' : 'undefined'}</span>
      </div>`
  }

  if (typeof val === 'boolean') {
    return `
      <div class="ed-field">
        <span class="ed-label">${label}</span>
        <label class="ed-toggle">
          <input type="checkbox" data-path="${dataPath}" ${val ? 'checked' : ''}>
          <span class="ed-toggle-track"><span class="ed-toggle-thumb"></span></span>
        </label>
      </div>`
  }

  if (typeof val === 'number') {
    return `
      <div class="ed-field">
        <span class="ed-label">${label}</span>
        <input class="ed-input ed-input--number" type="number" data-path="${dataPath}" value="${val}">
      </div>`
  }

  if (typeof val === 'function') {
    return '' // functions are handled in the Actions section
  }

  if (typeof val === 'string') {
    const isLong = val.length > 60 || val.includes('\n')
    if (isLong) {
      return `
        <div class="ed-field ed-field--col">
          <span class="ed-label">${label}</span>
          <textarea class="ed-textarea" data-path="${dataPath}" rows="3">${escapeHtml(val)}</textarea>
        </div>`
    }
    return `
      <div class="ed-field">
        <span class="ed-label">${label}</span>
        <input class="ed-input" type="text" data-path="${dataPath}" value="${escapeHtml(val)}">
      </div>`
  }

  if (Array.isArray(val)) {
    if (depth >= maxDepth) {
      return `
        <div class="ed-field">
          <span class="ed-label">${label}</span>
          <span class="ed-null">[Array(${val.length})]</span>
        </div>`
    }
    return `
      <div class="ed-group">
        <div class="ed-group-head">
          <span class="ed-group-icon">▾</span>
          <span class="ed-label">${label}</span>
          <span class="ed-badge">${val.length}</span>
        </div>
        <div class="ed-group-body">
          ${val.map((item, i) => renderField(String(i), item, `${path}.${i}`, depth + 1, maxDepth)).join('')}
        </div>
      </div>`
  }

  if (typeof val === 'object') {
    if (depth >= maxDepth) {
      return `
        <div class="ed-field">
          <span class="ed-label">${label}</span>
          <span class="ed-null">{Object}</span>
        </div>`
    }
    return `
      <div class="ed-group">
        <div class="ed-group-head">
          <span class="ed-group-icon">▾</span>
          <span class="ed-label">${label}</span>
          <span class="ed-badge">${Object.keys(val as AnyObject).length}</span>
        </div>
        <div class="ed-group-body">
          ${renderFields(val as AnyObject, path, depth + 1, maxDepth)}
        </div>
      </div>`
  }

  return `
    <div class="ed-field">
      <span class="ed-label">${label}</span>
      <span class="ed-value">${escapeHtml(String(val))}</span>
    </div>`
}

function renderFields(obj: AnyObject, basePath: string, depth: number, maxDepth: number): string {
  return Object.keys(obj)
    .filter(k => typeof obj[k] !== 'function')
    .map(k => renderField(k, obj[k], `${basePath}.${k}`, depth, maxDepth))
    .join('')
}

function renderActions(obj: AnyObject): string {
  const fns = Object.keys(obj).filter(k => typeof obj[k] === 'function')
  if (fns.length === 0) return ''

  return `
    <div class="ed-section">
      <div class="ed-section-title">Actions</div>
      <div class="ed-actions">
        ${fns.map(k => `
          <button class="ed-action-btn" data-fn="${escapeHtml(k)}">
            <span class="ed-action-icon">▶</span>
            ${formatKey(k)}
          </button>`).join('')}
      </div>
      <div class="ed-action-output" id="ed-action-output" style="display:none"></div>
    </div>`
}

// ── Main Editor function ──────────────────────────────────────────────────────

function Editor(
  object: AnyObject,
  name: string = 'Unknown Object ✏️',
  options: EditorOptions = {}
): HTMLElement {
  const { maxDepth = 4, onChange, onClose } = options

  const hasProperties = Object.keys(object).some(k => typeof object[k] !== 'function')

  const html = `
    <div class="ed-popup" id="ed-popup">
      <div class="ed-popup-inner">

        <div class="ed-header">
          <span class="ed-title">${escapeHtml(name)}</span>
          <button class="ed-close" id="ed-close" aria-label="Close">✕</button>
        </div>

        <div class="ed-body">
          ${hasProperties ? `
            <div class="ed-section">
              <div class="ed-section-title">Properties</div>
              ${renderFields(object, 'root', 0, maxDepth)}
            </div>` : ''}

          ${renderActions(object)}
        </div>

        <div class="ed-footer">
          <button class="ed-btn ed-btn--ghost" id="ed-cancel">Cancel</button>
          <button class="ed-btn ed-btn--primary" id="ed-apply">Apply</button>
        </div>

      </div>
    </div>`

  // ── Mount ──
  const wrapper = document.createElement('div')
  wrapper.innerHTML = `
    <style>
      .ed-popup{position:fixed;inset:0;background:rgba(0,0,0,.6);display:flex;align-items:center;justify-content:center;z-index:9999;padding:16px}
      .ed-popup-inner{background:#141516;border:1px solid #2a2b2d;border-radius:8px;width:100%;max-width:480px;max-height:80vh;display:flex;flex-direction:column;overflow:hidden;box-shadow:0 24px 48px rgba(0,0,0,.6)}
      .ed-header{display:flex;align-items:center;justify-content:space-between;padding:14px 16px;border-bottom:1px solid #2a2b2d;flex-shrink:0}
      .ed-title{font-family:'Courier New',monospace;font-size:13px;font-weight:700;letter-spacing:.06em;text-transform:uppercase;color:#e2e3e5}
      .ed-close{background:none;border:none;color:#5a5c61;cursor:pointer;font-size:14px;padding:2px 6px;border-radius:4px;line-height:1;transition:color .15s,background .15s}
      .ed-close:hover{color:#e2e3e5;background:#2a2b2d}
      .ed-body{flex:1;overflow-y:auto;padding:12px 16px;display:flex;flex-direction:column;gap:12px}
      .ed-body::-webkit-scrollbar{width:4px}
      .ed-body::-webkit-scrollbar-thumb{background:#2a2b2d;border-radius:2px}
      .ed-section{display:flex;flex-direction:column;gap:2px}
      .ed-section-title{font-family:'Courier New',monospace;font-size:10px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#3a3c40;padding:4px 0 6px;border-bottom:1px solid #1e2022;margin-bottom:4px}
      .ed-field{display:flex;align-items:center;justify-content:space-between;gap:12px;padding:5px 0;min-height:32px}
      .ed-field--col{flex-direction:column;align-items:flex-start;gap:6px}
      .ed-label{font-size:12px;color:#5a5c61;flex-shrink:0;white-space:nowrap;font-family:'Courier New',monospace}
      .ed-value{font-size:12px;color:#e2e3e5;font-family:'Courier New',monospace}
      .ed-null{font-size:12px;color:#3a3c40;font-style:italic;font-family:'Courier New',monospace}
      .ed-input{background:#1a1b1e;border:1px solid #2a2b2d;color:#e2e3e5;font-size:12px;font-family:'Courier New',monospace;padding:4px 8px;border-radius:4px;height:28px;min-width:0;width:200px;outline:none;transition:border-color .15s}
      .ed-input:focus{border-color:#4f8ef7}
      .ed-input--number{width:100px}
      .ed-textarea{background:#1a1b1e;border:1px solid #2a2b2d;color:#e2e3e5;font-size:12px;font-family:'Courier New',monospace;padding:6px 8px;border-radius:4px;width:100%;outline:none;resize:vertical;line-height:1.5;transition:border-color .15s}
      .ed-textarea:focus{border-color:#4f8ef7}
      .ed-toggle{position:relative;display:flex;align-items:center;cursor:pointer;flex-shrink:0}
      .ed-toggle input{position:absolute;opacity:0;width:0;height:0}
      .ed-toggle-track{width:36px;height:20px;background:#2a2b2d;border-radius:10px;transition:background .2s;position:relative}
      .ed-toggle input:checked ~ .ed-toggle-track{background:#1d4ed8}
      .ed-toggle-thumb{position:absolute;top:3px;left:3px;width:14px;height:14px;background:#5a5c61;border-radius:50%;transition:transform .2s,background .2s}
      .ed-toggle input:checked ~ .ed-toggle-track .ed-toggle-thumb{transform:translateX(16px);background:#fff}
      .ed-group{border:1px solid #1e2022;border-radius:6px;overflow:hidden;margin:2px 0}
      .ed-group-head{display:flex;align-items:center;gap:8px;padding:7px 10px;cursor:pointer;background:#1a1b1e;transition:background .12s;user-select:none}
      .ed-group-head:hover{background:#1e2022}
      .ed-group-icon{font-size:10px;color:#3a3c40;transition:transform .15s;flex-shrink:0}
      .ed-group.collapsed .ed-group-icon{transform:rotate(-90deg)}
      .ed-group.collapsed .ed-group-body{display:none}
      .ed-group-body{padding:4px 10px 6px 22px;display:flex;flex-direction:column;gap:0;background:#111213}
      .ed-badge{font-size:10px;background:#1e2022;color:#3a3c40;padding:1px 6px;border-radius:10px;font-family:'Courier New',monospace;margin-left:auto}
      .ed-actions{display:flex;flex-wrap:wrap;gap:6px;padding:4px 0}
      .ed-action-btn{display:flex;align-items:center;gap:6px;background:#1a1b1e;border:1px solid #2a2b2d;color:#e2e3e5;font-size:11px;font-family:'Courier New',monospace;padding:5px 10px;border-radius:4px;cursor:pointer;transition:background .15s,border-color .15s;letter-spacing:.04em}
      .ed-action-btn:hover{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
      .ed-action-icon{font-size:9px;color:#4f8ef7}
      .ed-action-btn:hover .ed-action-icon{color:#fff}
      .ed-action-output{margin-top:8px;background:#1a1b1e;border:1px solid #2a2b2d;border-radius:4px;padding:8px 10px;font-size:12px;font-family:'Courier New',monospace;color:#5a5c61;white-space:pre-wrap;word-break:break-all;max-height:120px;overflow-y:auto}
      .ed-footer{display:flex;justify-content:flex-end;gap:8px;padding:12px 16px;border-top:1px solid #2a2b2d;flex-shrink:0}
      .ed-btn{height:30px;padding:0 14px;font-size:12px;font-family:'Courier New',monospace;font-weight:700;letter-spacing:.06em;text-transform:uppercase;border-radius:4px;cursor:pointer;transition:background .15s,opacity .15s;border:1px solid transparent}
      .ed-btn--ghost{background:none;border-color:#2a2b2d;color:#5a5c61}
      .ed-btn--ghost:hover{background:#2a2b2d;color:#e2e3e5}
      .ed-btn--primary{background:#1d4ed8;border-color:#1d4ed8;color:#fff}
      .ed-btn--primary:hover{opacity:.85}
    </style>
    ${html}`

  document.body.appendChild(wrapper)

  // ── State: track mutations ──
  const mutations: Record<string, unknown> = {}

  // ── Wire: close ──
  function close() {
    wrapper.remove()
    onClose?.()
  }

  wrapper.querySelector('#ed-close')!.addEventListener('click', close)
  wrapper.querySelector('#ed-cancel')!.addEventListener('click', close)
  wrapper.querySelector('#ed-popup')!.addEventListener('click', (e) => {
    if ((e.target as Element).id === 'ed-popup') close()
  })

  // ── Wire: apply ──
  wrapper.querySelector('#ed-apply')!.addEventListener('click', () => {
    Object.entries(mutations).forEach(([path, val]) => {
      onChange?.(path, val)
      // Write back into the original object (simple top-level keys)
      const parts = path.replace(/^root\./, '').split('.')
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      let ref: any = object
      for (let i = 0; i < parts.length - 1; i++) ref = ref[parts[i]]
      ref[parts[parts.length - 1]] = val
    })
    close()
  })

  // ── Wire: input changes ──
  wrapper.addEventListener('change', (e) => {
    const el = e.target as HTMLInputElement
    const path = el.dataset.path
    if (!path) return
    if (el.type === 'checkbox') mutations[path] = el.checked
    else if (el.type === 'number') mutations[path] = Number(el.value)
    else mutations[path] = el.value
  })

  // ── Wire: collapsible groups ──
  wrapper.querySelectorAll('.ed-group-head').forEach(head => {
    head.addEventListener('click', () => {
      (head.closest('.ed-group') as Element).classList.toggle('collapsed')
    })
  })

  // ── Wire: action buttons ──
  const actionOutput = wrapper.querySelector('#ed-action-output') as HTMLElement | null
  wrapper.querySelectorAll('.ed-action-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const fnKey = (btn as HTMLElement).dataset.fn!
      const fn = object[fnKey]
      if (typeof fn !== 'function') return
      try {
        const result = fn.call(object)
        if (actionOutput) {
          actionOutput.style.display = 'block'
          const display = result !== undefined ? String(result) : `${fnKey}() called`
          actionOutput.textContent = `▶ ${fnKey}()\n${display}`
        }
      } catch (err) {
        if (actionOutput) {
          actionOutput.style.display = 'block'
          actionOutput.textContent = `✕ ${fnKey}() threw:\n${err}`
          actionOutput.style.color = '#e24b4a'
        }
      }
    })
  })

  return wrapper
}

const exampleObject = {
  username: "Jew",              // string
  age: 21,                          // number
  isOnline: true,                   // boolean
  score: 99.5,                      // float number
  hobbies: ["coding", "music"],     // array
  address: {                        // nested object
    city: "Poop Fart",
    state: "Sinster"
  },
  createdAt: new Date(),            // Date object
  greet: function () {              // function
    return `Hello ${this.username}`;
  },
  lastLogin: null,                  // null
  favoriteColor: undefined          // undefined
};

document.getElementById("layout").appendChild( Editor(exampleObject) )