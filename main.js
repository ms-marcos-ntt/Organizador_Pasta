const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const { app, BrowserWindow } = require("electron");
const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const ORGANIZADO_DIR = path.join(
  os.homedir(),
  "OneDrive - B R A SERVICOS DE COMUNICACAO LTDA",
  "Documentos",
  "DownloadsOrganizados"
);
const INTERVALO_MINUTOS = 10;
const LIMITE_ARQUIVOS = 50;
const LIMITE_DIAS = 1;

let win;
function createWindow() {
  win = new BrowserWindow({
    width: 600,
    height: 400,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
  });

  win.loadURL("data:text/html;charset=utf-8," + encodeURIComponent(`
    <html>
      <head><title>Organizador de Downloads</title></head>
      <body style="font-family: monospace; padding: 1em; background: #111; color: #0f0;">
        <h3>Organizador de Downloads</h3>
        <pre id="log"></pre>
        <script>
          const { ipcRenderer } = require('electron');
          ipcRenderer.on('log', (_, msg) => {
            const log = document.getElementById('log');
            log.textContent += msg + "\n";
            log.scrollTop = log.scrollHeight;
          });
        </script>
      </body>
    </html>`));
}

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
    if (err) log(`Erro movendo ${arquivo}: ${err}`);
    else log(`📦 Movido: ${arquivo} → /${ext}`);
  });
}

function verificarDownloads() {
  fs.readdir(DOWNLOADS_DIR, (err, arquivos) => {
    if (err) return log("Erro lendo a pasta: " + err);

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
      log(`[${new Date().toLocaleTimeString()}] Downloads em ordem.`);
    }
  });
}

function notificar(msg) {
  if (process.platform === "linux") {
    exec(`notify-send "${msg}"`);
  } else if (process.platform === "darwin") {
    exec(`osascript -e 'display notification "${msg}" with title "Organizador de Downloads"'`);
  } else if (process.platform === "win32") {
    exec(`powershell -Command "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('${msg}', 'Organizador de Downloads')"`);
  } else {
    log(msg);
  }
}

function log(msg) {
  if (win) win.webContents.send("log", msg);
  console.log(msg);
}

app.whenReady().then(() => {
  createWindow();
  log(`👀 Monitorando pasta Downloads a cada ${INTERVALO_MINUTOS} minutos...`);
  verificarDownloads();
  setInterval(verificarDownloads, INTERVALO_MINUTOS * 60 * 1000);
});
