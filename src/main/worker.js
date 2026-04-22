// Runs in a utilityProcess (Node, no Electron APIs). Main forks us and sends
// one MessagePortMain via parentPort; we own that port for our lifetime and
// use it to talk directly to the renderer (main is not in the data path).
//
// Naming note: both APIs below use the literal event name 'message' because
// that's what Node's EventEmitter calls the event. The callback names
// (handlePortHandoff / handleCadCall) distinguish what each one is actually
// waiting for.
const handlePortHandoff = ({ ports }) => {
  const renderPort = ports[0]

  const handleCadCall = async ({ data }) => {
    if (data?.type !== 'cadCall') return
    // Simulate a blocking native call (e.g. a SolidWorks COM round-trip).
    await new Promise((r) => setTimeout(r, 500))
    const buf = new ArrayBuffer(16 * 1024 * 1024)
    new Uint8Array(buf)[0] = 42
    // GOTCHA: MessagePortMain.postMessage's transfer list only accepts
    // MessagePortMain instances — unlike DOM MessagePort in the renderer,
    // ArrayBuffers can't be zero-copy transferred here. Structured clone
    // still ships the bytes across the process boundary straight to the
    // renderer's port without hopping through main-process JS.
    renderPort.postMessage({ type: 'cadResult', bytes: buf.byteLength, buf })
  }

  renderPort.on('message', handleCadCall)
  renderPort.start()
}

process.parentPort.once('message', handlePortHandoff)
