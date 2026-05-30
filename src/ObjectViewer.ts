type PopupMenuArgs = {
  title?: string
  content?: HTMLElement | string
}

export
function PopupMenu({ title, content }: PopupMenuArgs = {}) {
  const root = document.getElementById("layout");
  const menu: HTMLDivElement = document.getElementById("popup-template").cloneNode(true) as HTMLDivElement
  menu.id = ""; root.appendChild(menu)
  const header = menu.querySelector('.header')
  const contentE = menu.querySelector('.content')
  header.innerHTML = (title ?? "Popup MenuX") + header.innerHTML
  if (content) {
    if (typeof content == 'string') {
      contentE.insertAdjacentHTML('beforeend', content)
    } else {
      menu.appendChild(content)
    }
  }
  function toggle() {
    this.menu.classList.toggle("active")
  }
  function remove() {
    root.removeChild(menu)
  }
  header.querySelector("#close").onclick = remove
  return { menu, toggle, remove, contentE, header }
}

function Format(x: any): string {
  switch (typeof x) {
    case 'string':
      return x.replace(x[0], x[0].toUpperCase())
  }
  return x
}

export
function ObjectViewer(name, object) {
  const keys = Object.keys(object)
  const content = keys.map(key => {
    const val = Format(object[key])
    return `<div class="entry-wrap"><span>${Format(key)}</span> <input id='${key}-input' ${function () {
      if (typeof val == 'boolean') {
        return `type='checkbox'`
      } else if (typeof val == 'number') {
        return `type='number' value='${val}'`
      } else if (typeof val == 'string') {
        return `value='${val}'`
      } else {
        return `value='${JSON.stringify(val)}'`
      }
    }()}/></div>`
  }).join('')
  const menu = PopupMenu({ title: name, content })
  // wire everything up
  function apply(){
    keys.forEach(key => {
      const val = object[key]
      const input = menu.contentE.querySelector(`#${key}-input`)
      if(typeof val == 'string'){
        object[key] = input.value
      } else if (typeof val == 'object'){
        object[key] = JSON.parse(input.value)
      } else if (typeof val == 'number'){
        object[key] = parseInt(input.value)
      } else if (typeof val == 'boolean'){
        object[key] = JSON.parse(input.checked)
      } else {
        console.log("???",input.value)
        return `???`
      }
    })
  }
  menu.menu.querySelector("#apply").onclick = apply
  menu.menu.querySelector("#copy").onclick = () => {
    navigator.clipboard.writeText(JSON.stringify(object))
  }
  menu.menu.querySelector("#save-as").onclick = () => {
    const blob = new Blob([JSON.stringify(object)],{ type: "text/plain" })
    const url = URL.createObjectURL(blob);
    const tempAnchor = document.createElement("a");
    tempAnchor.href = url;
    tempAnchor.download = `${name}-snapshot.json`;
    tempAnchor.click()
    URL.revokeObjectURL(url);
  }
  return menu
}

function main(){
  const ex = {
    "id": 101,
    "username": "jdoe_dev",
    "isActive": true,
    "profile": {
      "firstName": "John",
      "lastName": "Doe",
      "age": 30,
      "location": {
        "city": "New York",
        "coordinates": {
          "lat": 40.7128,
          "long": -74.0060
        }
      }
    },
    "tags": ["developer", "json", "example"],
    "roles": [
      {
        "roleId": 1,
        "roleName": "admin"
      },
      {
        "roleId": 2,
        "roleName": "user"
      }
    ],
    "preferences": null,
    "score": 95.5
  }

  const m = ObjectViewer("📖 Example Object", ex)
  m.toggle()
  console.log(m)
}

main()