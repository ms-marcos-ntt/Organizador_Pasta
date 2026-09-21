const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");
const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });
const { Tray, Menu } = require("electron");

let tray = null;
let logFilePath = null;
let monitorInterval = null;
let encerrandoAplicativo = false;
const logBuffer = [];
const logHistory = [];
const MAX_LOGS_IN_MEMORY = 500;


const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const ORGANIZADO_DIR = path.join(
  os.homedir(),
  process.env.DESTINO_DOWNLOADS
);

const INTERVALO_MINUTOS = 10; // Intervalo de verificação em minutos
const LIMITE_ARQUIVOS = 50;
const LIMITE_DIAS = 1;

let mainWindow;

function valorDoErro(error) {
  if (error instanceof Error) return error.stack || `${error.name}: ${error.message}`;
  if (typeof error === "string") return error;
  try {
    return JSON.stringify(error);
  } catch {
    return String(error);
  }
}

function inicializarLogger() {
  const logDir = app.getPath("logs");
  fs.mkdirSync(logDir, { recursive: true });
  logFilePath = path.join(logDir, "organizador-debug.log");

  if (logBuffer.length > 0) {
    fs.appendFileSync(logFilePath, logBuffer.map((item) => item.line).join(""), "utf8");
    logBuffer.length = 0;
  }
}

function enviarLog(msg, nivel = "INFO") {
  const timestamp = new Date().toISOString();
  const texto = `[${timestamp}] [${nivel}] ${msg}`;
  const evento = { timestamp, nivel, mensagem: String(msg) };
  const linha = `${texto}\n`;
  logHistory.push(evento);
  while (logHistory.length > MAX_LOGS_IN_MEMORY) logHistory.shift();

  console.log(texto);

  if (logFilePath) {
    try {
      fs.appendFileSync(logFilePath, linha, "utf8");
    } catch (error) {
      console.error("Não foi possível salvar o log:", error);
    }
  } else {
    logBuffer.push({ line: linha });
  }

  while (logBuffer.length > MAX_LOGS_IN_MEMORY) logBuffer.shift();

  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send("log", evento);
  }
}

function registrarErro(contexto, error) {
  enviarLog(`${contexto}: ${valorDoErro(error)}`, "ERROR");
}

process.on("uncaughtException", (error) => {
  registrarErro("Erro não tratado", error);
});

process.on("unhandledRejection", (reason) => {
  registrarErro("Promise rejeitada sem tratamento", reason);
});

function diasDesde(data) {
  const agora = new Date();
  const diffMs = agora - data;
  return diffMs / (1000 * 60 * 60 * 24);
}

function moverArquivoParaTipo(arquivo) {
  const ext = path.extname(arquivo).slice(1).toLowerCase() || "outros";
  const destinoDir = path.join(ORGANIZADO_DIR, ext);

  if (!fs.existsSync(destinoDir)) fs.mkdirSync(destinoDir, { recursive: true });

  const origem = path.join(DOWNLOADS_DIR, arquivo);
  const destino = path.join(destinoDir, arquivo);

  fs.rename(origem, destino, (err) => {
    if (err) registrarErro(`Erro movendo ${arquivo}`, err);
    else enviarLog(`📦 Movido: ${arquivo} → /${ext}`);
  });
}

function verificarDownloads() {
  fs.readdir(DOWNLOADS_DIR, (err, arquivos) => {
    if (err) return registrarErro("Erro lendo a pasta Downloads", err);

    let muitosArquivos = arquivos.length > LIMITE_ARQUIVOS;
    let arquivosAntigos = 0;

    arquivos.forEach((arquivo) => {
      const caminho = path.join(DOWNLOADS_DIR, arquivo);
      try {
        const stats = fs.statSync(caminho);
        if (stats.isFile() && diasDesde(stats.mtime) > LIMITE_DIAS) {
          arquivosAntigos++;
          moverArquivoParaTipo(arquivo);
        }
      } catch (error) {
        registrarErro(`Erro analisando ${arquivo}`, error);
      }
    });

    if (muitosArquivos || arquivosAntigos > 5) {
      notificar("🧹 Pasta Downloads organizada automaticamente!");
    } else {
      enviarLog(`[${new Date().toLocaleTimeString()}] Downloads em ordem.`);
    }
  });
}

function notificar(msg) {
  if (process.platform === "linux") {
    exec(`notify-send "${msg}"`, (error) => error && registrarErro("Erro na notificação Linux", error));
  } else if (process.platform === "darwin") {
    exec(`osascript -e 'display notification "${msg}" with title "Organizador de Downloads"'`, (error) => error && registrarErro("Erro na notificação macOS", error));
  } else if (process.platform === "win32") {
    exec(`powershell -Command "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('${msg}', 'Organizador de Downloads')"`, (error) => error && registrarErro("Erro na notificação Windows", error));
  } else {
    enviarLog(msg);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    show: false, // Não mostra imediatamente
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.webContents.on("did-finish-load", () => {
    for (const evento of logHistory) mainWindow.webContents.send("log", evento);
    mainWindow.webContents.send("log", {
      timestamp: new Date().toISOString(),
      nivel: "INFO",
      mensagem: `Arquivo de log: ${logFilePath}`,
    });
  });

  mainWindow.loadFile(path.join(__dirname, "index.html"));

  // Minimizar em vez de fechar
  mainWindow.on("close", (event) => {
    if (!encerrandoAplicativo) {
      event.preventDefault();
      mainWindow.hide();
    }
  });

  // Criar bandeja
  tray = new Tray(path.join(__dirname, "icon.png")); // coloque um ícone .png aqui
  const contextMenu = Menu.buildFromTemplate([
    {
      label: "Mostrar",
      click: () => mainWindow.show(),
    },
    {
      label: "Sair",
      click: () => {
        finalizarAplicativo();
      },
    },
  ]);
  tray.setToolTip("Organizador de Downloads");
  tray.setContextMenu(contextMenu);
}

function finalizarAplicativo() {
  if (encerrandoAplicativo) return;

  encerrandoAplicativo = true;
  if (monitorInterval) clearInterval(monitorInterval);
  if (tray) tray.destroy();
  enviarLog("Aplicativo encerrado pelo usuário.");
  app.quit();
}

app.on("before-quit", () => {
  encerrandoAplicativo = true;
  if (monitorInterval) clearInterval(monitorInterval);
});


app.whenReady().then(() => {
  inicializarLogger();
  createWindow();
  enviarLog(`👀 Monitorando pasta Downloads a cada ${INTERVALO_MINUTOS} minutos...`);
  enviarLog(`📝 Logs salvos em: ${logFilePath}`);
  verificarDownloads();
  monitorInterval = setInterval(verificarDownloads, INTERVALO_MINUTOS * 60 * 1000);
}).catch((error) => {
  registrarErro("Erro ao iniciar o aplicativo", error);
});
