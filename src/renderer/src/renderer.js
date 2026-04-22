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

  // CAD flow: ask main to fork a utilityProcess and hand us one end of a
  // MessageChannel. The port arrives via window.postMessage from the preload
  // (contextBridge can't proxy a live MessagePort — see preload comment), so
  // we register the window 'message' listener BEFORE invoking openCadPort to
  // avoid missing the port. Once we have it, we talk to the worker directly.
  const cadOut = document.getElementById('cadOut')
  const cadBtn = document.getElementById('cadBtn')
  cadBtn?.addEventListener('click', async () => {
    if (cadOut) cadOut.textContent = 'Forking worker + opening port…'

    const started = performance.now()

    // Fires on the renderer's window when preload re-transfers the port from
    // main. Runs once, then unsubscribes.
    const handlePortArrival = (windowMsgEvent) => {
      if (windowMsgEvent.data !== 'cad:port') return
      window.removeEventListener('message', handlePortArrival)
      const port = windowMsgEvent.ports[0]

      // Fires on the port when the worker ships a result back.
      const handleCadResult = (portMsgEvent) => {
        const elapsed = (performance.now() - started).toFixed(1)
        if (cadOut) cadOut.textContent = `Got ${portMsgEvent.data.bytes} bytes in ${elapsed}ms`
      }
      port.onmessage = handleCadResult

      // A transferred port is delivered in a paused state; start() is required
      // before onmessage will fire.
      port.start()
      port.postMessage({ type: 'cadCall' })
    }
    window.addEventListener('message', handlePortArrival)

    await window.api.openCadPort()
  })
}

function replaceText(selector, text) {
  const element = document.querySelector(selector)
  if (element) {
    element.innerText = text
  }
}

init()
