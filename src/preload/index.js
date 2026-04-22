import { contextBridge, ipcRenderer } from 'electron'
import { electronAPI } from '@electron-toolkit/preload'

// Narrow, typed surface exposed to the renderer via contextBridge — renderer
// never touches raw ipcRenderer.
const api = {
  ping: (msg) => ipcRenderer.invoke('ping', msg),
  openCadPort: () => ipcRenderer.invoke('cad:openPort')
}

// GOTCHA: a live MessagePort cannot be proxied through contextBridge — its
// onmessage/postMessage/start methods don't survive the isolated-world
// boundary, so returning `event.ports[0]` via an exposed callback produces a
// dead object in the renderer. Instead, re-transfer the port into the page
// with window.postMessage (which natively supports transferables); the
// renderer listens for window 'message' events with data === 'cad:port'.
const relayCadPortToPage = (ipcEvent) => {
  window.postMessage('cad:port', '*', ipcEvent.ports)
}
ipcRenderer.on('cad:port', relayCadPortToPage)

// Use `contextBridge` APIs to expose Electron APIs to
// renderer only if context isolation is enabled, otherwise
// just add to the DOM global.
if (process.contextIsolated) {
  try {
    contextBridge.exposeInMainWorld('electron', electronAPI)
    contextBridge.exposeInMainWorld('api', api)
  } catch (error) {
    console.error(error)
  }
} else {
  // @ts-ignore (define in dts)
  window.electron = electronAPI
  // @ts-ignore (define in dts)
  window.api = api
}
