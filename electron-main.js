const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isPrinting = false;

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 420,
    height: 800,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false
    }
  });

  mainWindow.loadFile('index.html');

  ipcMain.on('print', (event, { copy }) => {
    if (isPrinting) {
      console.warn('⛔ Impressão já em andamento');
      return;
    }
  
    const win = BrowserWindow.getFocusedWindow();
    if (!win) return;
  
    isPrinting = true;
  
    win.webContents.print(
      {
        silent: false,
        printBackground: true
      },
      (success, errorType) => {
        isPrinting = false;
  
        event.reply('print-result', {
          success,
          failureReason: errorType,
          copy
        });
      }
    );
  });

  mainWindow.on('closed', () => {
    mainWindow = null;
  });
}

app.whenReady().then(() => {
  // Disable hardware acceleration if GPU cache issues persist
  // app.disableHardwareAcceleration();
  
  // Clear GPU cache on startup
  const cacheDir = path.join(app.getPath('userData'), 'GPUCache');
  if (fs.existsSync(cacheDir)) {
    try {
      fs.rmSync(cacheDir, { recursive: true, force: true });
      console.log('GPU cache cleared');
    } catch (e) {
      console.warn('Failed to clear GPU cache:', e.message);
    }
  }
  
  createWindow();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (BrowserWindow.getAllWindows().length === 0) createWindow();
});