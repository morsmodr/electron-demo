import { app, shell, BrowserWindow, ipcMain, utilityProcess, MessageChannelMain } from 'electron'
import { join } from 'path'
import { electronApp, optimizer, is } from '@electron-toolkit/utils'
import { autoUpdater } from 'electron-updater'
import icon from '../../resources/icon.png?asset'

function createWindow() {
  // Create the browser window.
  const mainWindow = new BrowserWindow({
    width: 900,
    height: 670,
    show: false,
    autoHideMenuBar: true,
    ...(process.platform === 'linux' ? { icon } : {}),
    webPreferences: {
      preload: join(__dirname, '../preload/index.js'),
      sandbox: false
    }
  })

  mainWindow.on('ready-to-show', () => {
    mainWindow.show()
  })

  mainWindow.webContents.setWindowOpenHandler((details) => {
    shell.openExternal(details.url)
    return { action: 'deny' }
  })

  // HMR for renderer base on electron-vite cli.
  // Load the remote URL for development or the local html file for production.
  if (is.dev && process.env['ELECTRON_RENDERER_URL']) {
    mainWindow.loadURL(process.env['ELECTRON_RENDERER_URL'])
  } else {
    mainWindow.loadFile(join(__dirname, '../renderer/index.html'))
  }
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.whenReady().then(() => {
  // Set app user model id for windows
  electronApp.setAppUserModelId('com.electron')

  // Default open or close DevTools by F12 in development
  // and ignore CommandOrControl + R in production.
  // see https://github.com/alex8088/electron-toolkit/tree/master/packages/utils
  app.on('browser-window-created', (_, window) => {
    optimizer.watchWindowShortcuts(window)
  })

  // Classic request/response IPC: renderer -> preload api.ping -> ipcRenderer.invoke -> here.
  ipcMain.handle('ping', (_event, msg) => ({ reply: `main received: ${msg}`, at: Date.now() }))

  // Out-of-process worker channel. Flow: fork a utilityProcess running worker.js,
  // create a MessageChannelMain, hand port2 to the worker and port1 to the renderer.
  // Once both ends are wired, main is no longer in the data path — bulk payloads
  // flow worker <-> renderer directly over the port pair.
  //
  // Ports must be attached to webContents.postMessage (event.sender.postMessage)
  // — an ipcMain.handle return value cannot carry MessagePorts, so we fire a
  // separate 'cad:port' IPC and just return `true` to resolve the renderer's
  // awaited openCadPort() promise.
  ipcMain.handle('cad:openPort', (event) => {
    const child = utilityProcess.fork(join(__dirname, 'worker.js'), [], {
      stdio: 'inherit'
    })
    child.on('spawn', () => console.log('[cad] worker spawned, pid=', child.pid))
    child.on('exit', (code) => console.log('[cad] worker exit code=', code))
    const { port1, port2 } = new MessageChannelMain()
    child.postMessage({ type: 'init' }, [port2])
    event.sender.postMessage('cad:port', null, [port1])
    return true
  })

  createWindow()

  // electron-updater against a `generic` provider (see electron-builder.yml +
  // dev-app-update.yml). Integrity is verified against the SHA512 in
  // latest.yml, so unsigned builds still update correctly for a local POC.
  autoUpdater.on('error', (e) => console.error('[updater] error', e))
  autoUpdater.on('checking-for-update', () => console.log('[updater] checking'))
  autoUpdater.on('update-available', (i) => console.log('[updater] available', i.version))
  autoUpdater.on('update-not-available', (i) => console.log('[updater] not available', i.version))
  autoUpdater.on('download-progress', (p) =>
    console.log(`[updater] download ${Math.round(p.percent)}%`)
  )
  autoUpdater.on('update-downloaded', (i) => {
    console.log('[updater] downloaded', i.version, '— relaunching')
    autoUpdater.quitAndInstall()
  })
  autoUpdater.checkForUpdatesAndNotify()

  app.on('activate', function () {
    // On macOS it's common to re-create a window in the app when the
    // dock icon is clicked and there are no other windows open.
    if (BrowserWindow.getAllWindows().length === 0) createWindow()
  })
})

// Quit when all windows are closed, except on macOS. There, it's common
// for applications and their menu bar to stay active until the user quits
// explicitly with Cmd + Q.
app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit()
  }
})

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.
