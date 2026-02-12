const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  print: (copy, payload) => ipcRenderer.send('print', { copy, payload }),
  onPrintResult: (cb) => ipcRenderer.on('print-result', (event, arg) => cb(arg)),
  readHistory: (copy, bucket = 'active') => ipcRenderer.invoke('history:read', { copy, bucket }),
  openHistoryWindow: () => ipcRenderer.send('open-history-window')
});

contextBridge.exposeInMainWorld('isElectron', true);
