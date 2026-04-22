function init() {
  window.addEventListener('DOMContentLoaded', () => {
    doAThing()
  })
}

function doAThing() {
  const versions = window.electron.process.versions
  replaceText('.electron-version', `Electron v${versions.electron}`)
  replaceText('.chrome-version', `Chromium v${versions.chrome}`)
  replaceText('.node-version', `Node v${versions.node}`)

  const out = document.getElementById('pingOut')
  const showReply = (result) => {
    if (out) out.textContent = JSON.stringify(result, null, 2)
  }

  const ipcHandlerBtn = document.getElementById('ipcHandler')
  ipcHandlerBtn?.addEventListener('click', async () => {
    showReply(await window.api.ping('from Send IPC link'))
  })

  const pingBtn = document.getElementById('pingBtn')
  pingBtn?.addEventListener('click', async () => {
    showReply(await window.api.ping('from Ping button'))
  })
}

function replaceText(selector, text) {
  const element = document.querySelector(selector)
  if (element) {
    element.innerText = text
  }
}

init()
