const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');

let mainWindow;
let isPrinting = false;

const HISTORY_FILES = {
  active: {
    Estabelecimento: 'historico-via-estabelecimento.jsonl',
    Cliente: 'historico-via-cliente.jsonl'
  },
  expired: {
    Estabelecimento: 'historico-via-estabelecimento-vencido.jsonl',
    Cliente: 'historico-via-cliente-vencido.jsonl'
  }
};

const ACTIVE_RETENTION_DAYS = 30;
const EXPIRED_RETENTION_DAYS = 7;

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

  ipcMain.handle('history:read', (event, options = {}) => {
    try {
      const copy = typeof options === 'string' ? options : options.copy;
      const bucket = typeof options === 'string' ? 'active' : (options.bucket || 'active');
      if (!copy) return [];

      const { active, expired } = processHistoryRetention(copy);
      return bucket === 'expired' ? expired : active;
    } catch (e) {
      console.warn('Falha ao ler histórico:', e.message);
      return [];
    }
  });

  ipcMain.on('open-history-window', () => {
    const historyWindow = new BrowserWindow({
      width: 760,
      height: 700,
      autoHideMenuBar: true,
      webPreferences: {
        preload: path.join(__dirname, 'preload.js'),
        contextIsolation: true,
        nodeIntegration: false
      }
    });

    historyWindow.loadFile('history.html');
  });
}

function getHistoryDir() {
  const dir = path.join(app.getPath('userData'), 'historico-vias');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getHistoryFilePath(copy, bucket = 'active') {
  const fileName = HISTORY_FILES[bucket]?.[copy];
  if (!fileName) return null;
  return path.join(getHistoryDir(), fileName);
}

function readHistoryLines(copy, bucket = 'active') {
  const filePath = getHistoryFilePath(copy, bucket);
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
    .filter(Boolean);
}

function writeHistoryLines(copy, bucket, rows) {
  const filePath = getHistoryFilePath(copy, bucket);
  if (!filePath) return;

  const content = rows.map((row) => JSON.stringify(row)).join('\n');
  fs.writeFileSync(filePath, content ? `${content}\n` : '', 'utf8');
}

function appendCopyHistory(copy, payload) {
  const filePath = getHistoryFilePath(copy, 'active');
  if (!filePath) return;

  const line = JSON.stringify({
    copy,
    createdAt: new Date().toISOString(),
    ...payload
  });

  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

function isOlderThan(dateValue, days) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  const ms = days * 24 * 60 * 60 * 1000;
  return (Date.now() - parsed.getTime()) > ms;
}

function processHistoryRetention(copy) {
  const activeRows = readHistoryLines(copy, 'active');
  const expiredRows = readHistoryLines(copy, 'expired');

  const activeKept = [];
  const movedToExpired = [];

  activeRows.forEach((row) => {
    if (isOlderThan(row.createdAt, ACTIVE_RETENTION_DAYS)) {
      movedToExpired.push({
        ...row,
        movedToExpiredAt: new Date().toISOString()
      });
    } else {
      activeKept.push(row);
    }
  });

  const combinedExpired = [...expiredRows, ...movedToExpired];
  const expiredKept = combinedExpired.filter((row) => {
    const baseDate = row.movedToExpiredAt || row.createdAt;
    return !isOlderThan(baseDate, EXPIRED_RETENTION_DAYS);
  });

  writeHistoryLines(copy, 'active', activeKept);
  writeHistoryLines(copy, 'expired', expiredKept);

  return {
    active: [...activeKept].reverse(),
    expired: [...expiredKept].reverse()
  };
}

function getHistoryDir() {
  const dir = path.join(app.getPath('userData'), 'historico-vias');
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
}

function getHistoryFilePath(copy, bucket = 'active') {
  const fileName = HISTORY_FILES[bucket]?.[copy];
  if (!fileName) return null;
  return path.join(getHistoryDir(), fileName);
}

function readHistoryLines(copy, bucket = 'active') {
  const filePath = getHistoryFilePath(copy, bucket);
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
    .filter(Boolean);
}

function writeHistoryLines(copy, bucket, rows) {
  const filePath = getHistoryFilePath(copy, bucket);
  if (!filePath) return;

  const content = rows.map((row) => JSON.stringify(row)).join('\n');
  fs.writeFileSync(filePath, content ? `${content}\n` : '', 'utf8');
}

function appendCopyHistory(copy, payload) {
  const filePath = getHistoryFilePath(copy, 'active');
  if (!filePath) return;

  const line = JSON.stringify({
    copy,
    createdAt: new Date().toISOString(),
    ...payload
  });

  fs.appendFileSync(filePath, `${line}\n`, 'utf8');
}

function isOlderThan(dateValue, days) {
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return false;
  const ms = days * 24 * 60 * 60 * 1000;
  return (Date.now() - parsed.getTime()) > ms;
}

function processHistoryRetention(copy) {
  const activeRows = readHistoryLines(copy, 'active');
  const expiredRows = readHistoryLines(copy, 'expired');

  const activeKept = [];
  const movedToExpired = [];

  activeRows.forEach((row) => {
    if (isOlderThan(row.createdAt, ACTIVE_RETENTION_DAYS)) {
      movedToExpired.push({
        ...row,
        movedToExpiredAt: new Date().toISOString()
      });
    } else {
      activeKept.push(row);
    }
  });

  const combinedExpired = [...expiredRows, ...movedToExpired];
  const expiredKept = combinedExpired.filter((row) => {
    const baseDate = row.movedToExpiredAt || row.createdAt;
    return !isOlderThan(baseDate, EXPIRED_RETENTION_DAYS);
  });

  writeHistoryLines(copy, 'active', activeKept);
  writeHistoryLines(copy, 'expired', expiredKept);

  return {
    active: [...activeKept].reverse(),
    expired: [...expiredKept].reverse()
  };
}


app.whenReady().then(() => {
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
