const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // simplified: only pass the copy label (e.g. 'Estabelecimento' or 'Cliente')
  print: (copy, payload) => ipcRenderer.send('print', { copy, payload }),
  onPrintResult: (cb) => ipcRenderer.on('print-result', (event, arg) => cb(arg)),
  readHistory: (copy) => ipcRenderer.invoke('history:read', copy),
  clearHistory: (copy) => ipcRenderer.invoke('history:clear', copy)
});

// Indica ao renderer que está em execução dentro do Electron
contextBridge.exposeInMainWorld('isElectron', true);
