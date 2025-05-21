const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const fs = require("fs");
const os = require("os");
const { exec } = require("child_process");

const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const ORGANIZADO_DIR = path.join(
  os.homedir(),
  "OneDrive - B R A SERVICOS DE COMUNICACAO LTDA",
  "Documentos",
  "DownloadsOrganizados"
);
const INTERVALO_MINUTOS = 10; // Intervalo de verificação em minutos
const LIMITE_ARQUIVOS = 50;
const LIMITE_DIAS = 1;

let mainWindow;

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
    if (err) enviarLog(`Erro movendo ${arquivo}: ${err}`);
    else enviarLog(`📦 Movido: ${arquivo} → /${ext}`);
  });
}

function verificarDownloads() {
  fs.readdir(DOWNLOADS_DIR, (err, arquivos) => {
    if (err) return enviarLog(`Erro lendo a pasta: ${err}`);

    let muitosArquivos = arquivos.length > LIMITE_ARQUIVOS;
    let arquivosAntigos = 0;

    arquivos.forEach((arquivo) => {
      const caminho = path.join(DOWNLOADS_DIR, arquivo);
      const stats = fs.statSync(caminho);
      if (diasDesde(stats.mtime) > LIMITE_DIAS) {
        arquivosAntigos++;
        moverArquivoParaTipo(arquivo);
      }
    });

    if (muitosArquivos || arquivosAntigos > 5) {
      notificar("🧹 Pasta Downloads organizada automaticamente!");
    } else {
      enviarLog(`[${new Date().toLocaleTimeString()}] Downloads em ordem.`);
    }
  });
}

function enviarLog(msg) {
  console.log(msg);
  if (mainWindow) mainWindow.webContents.send("log", msg);
}

function notificar(msg) {
  if (process.platform === "linux") {
    exec(`notify-send "${msg}"`);
  } else if (process.platform === "darwin") {
    exec(`osascript -e 'display notification "${msg}" with title "Organizador de Downloads"'`);
  } else if (process.platform === "win32") {
    exec(`powershell -Command "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('${msg}', 'Organizador de Downloads')"`);
  } else {
    enviarLog(msg);
  }
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
    },
  });

  mainWindow.loadFile("index.html");
}

app.whenReady().then(() => {
  createWindow();
  enviarLog(`👀 Monitorando pasta Downloads a cada ${INTERVALO_MINUTOS} minutos...`);
  verificarDownloads();
  setInterval(verificarDownloads, INTERVALO_MINUTOS * 60 * 1000);
});