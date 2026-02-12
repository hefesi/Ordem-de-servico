const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isPrinting = false;

const HISTORY_FILES = {
  Estabelecimento: 'historico-via-estabelecimento.jsonl',
  Cliente: 'historico-via-cliente.jsonl'
};

function getHistoryDir() {
  const dir = path.join(app.getPath('userData'), 'historico-vias');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getHistoryFilePath(copy) {
  const fileName = HISTORY_FILES[copy];
  if (!fileName) return null;
  return path.join(getHistoryDir(), fileName);
}

function appendCopyHistory(copy, payload) {
  const filePath = getHistoryFilePath(copy);
  if (!filePath) return;

  const line = JSON.stringify({
    copy,
    createdAt: new Date().toISOString(),
    ...payload
  });

  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

function readCopyHistory(copy) {
  const filePath = getHistoryFilePath(copy);
  if (!filePath || !fs.existsSync(filePath)) return [];

  const content = fs.readFileSync(filePath, 'utf8').trim();
  if (!content) return [];

  return content
    .split('\n')
    .map((line) => {
      try {
        return JSON.parse(line);
      } catch (e) {
        return null;
      }
    })
    .filter(Boolean)
    .reverse();
}

function clearCopyHistory(copy) {
  const filePath = getHistoryFilePath(copy);
  if (!filePath) return;
  fs.writeFileSync(filePath, '', 'utf8');
}

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

  ipcMain.on('print', (event, { copy, payload }) => {
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

        if (success) {
          try {
            appendCopyHistory(copy, payload || {});
          } catch (historyErr) {
            console.warn('Falha ao registrar histórico da via:', historyErr.message);
          }
        }
  
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

  ipcMain.handle('history:read', (event, copy) => {
    try {
      return readCopyHistory(copy);
    } catch (e) {
      console.warn('Falha ao ler histórico:', e.message);
      return [];
    }
  });

  ipcMain.handle('history:clear', (event, copy) => {
    try {
      clearCopyHistory(copy);
      return { ok: true };
    } catch (e) {
      return { ok: false, message: e.message };
    }
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
