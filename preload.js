const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // simplified: only pass the copy label (e.g. 'Estabelecimento' or 'Cliente')
  print: (copy) => ipcRenderer.send('print', { copy }),
  onPrintResult: (cb) => ipcRenderer.on('print-result', (event, arg) => cb(arg))
});

// Indica ao renderer que está em execução dentro do Electron
contextBridge.exposeInMainWorld('isElectron', true);