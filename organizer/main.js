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

function resolverDiretorioOrganizado() {
  const configurado = process.env.DESTINO_DOWNLOADS?.trim();
  if (!configurado) {
    throw new Error("DESTINO_DOWNLOADS não está configurado no arquivo .env");
  }

  // Caminhos absolutos devem ser usados como estão. Só caminhos relativos
  // são colocados dentro da pasta do usuário.
  return path.isAbsolute(configurado)
    ? path.normalize(configurado)
    : path.join(os.homedir(), configurado);
}

const ORGANIZADO_DIR = resolverDiretorioOrganizado();

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
    if (!err) {
      enviarLog(`📦 Movido: ${arquivo} → /${ext}`);
      return;
    }

    // rename não funciona entre volumes (por exemplo, Downloads no C: e
    // destino no D:). Nesse caso, copia primeiro e só remove a origem após
    // a cópia terminar com sucesso.
    if (err.code !== "EXDEV") {
      registrarErro(`Erro movendo ${arquivo}`, err);
      return;
    }

    fs.copyFile(origem, destino, fs.constants.COPYFILE_EXCL, (copyError) => {
      if (copyError) {
        if (copyError.code === "EEXIST") {
          enviarLog(`Ignorado: ${arquivo} já existe em /${ext}.`, "INFO");
          return;
        }
        registrarErro(`Erro copiando ${arquivo} para /${ext}`, copyError);
        return;
      }

      fs.unlink(origem, (unlinkError) => {
        if (unlinkError) {
          registrarErro(`Arquivo copiado, mas não foi possível remover a origem de ${arquivo}`, unlinkError);
          return;
        }
        enviarLog(`📦 Movido entre volumes: ${arquivo} → /${ext}`);
      });
    });
  });
}

function verificarDownloads() {
  fs.readdir(DOWNLOADS_DIR, { withFileTypes: true }, (err, entradas) => {
    if (err) return registrarErro("Erro lendo a pasta Downloads", err);

    const arquivos = entradas.filter((entrada) => entrada.isFile()).map((entrada) => entrada.name);
    let muitosArquivos = arquivos.length > LIMITE_ARQUIVOS;
    let arquivosAntigos = 0;
    let analisesPendentes = arquivos.length;

    const finalizarAnalise = () => {
      analisesPendentes--;
      if (analisesPendentes > 0) return;

      if (muitosArquivos || arquivosAntigos > 5) {
        notificar("🧹 Pasta Downloads organizada automaticamente!");
      } else {
        enviarLog(`[${new Date().toLocaleTimeString()}] Downloads em ordem.`);
      }
    };

    if (analisesPendentes === 0) return finalizarAnalise();

    arquivos.forEach((arquivo) => {
      const caminho = path.join(DOWNLOADS_DIR, arquivo);
      fs.stat(caminho, (statError, stats) => {
        if (statError) {
          registrarErro(`Erro analisando ${arquivo}`, statError);
          finalizarAnalise();
          return;
        }
        if (stats.isFile() && diasDesde(stats.mtime) > LIMITE_DIAS) {
          arquivosAntigos++;
          moverArquivoParaTipo(arquivo);
        }
        finalizarAnalise();
      });
    });
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
    width: 900,
    height: 650,
    minWidth: 420,
    minHeight: 420,
    show: false,
    backgroundColor: "#0b1120",
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
    mainWindow.show();
  });

  mainWindow.webContents.on("did-fail-load", (_, errorCode, errorDescription, validatedURL) => {
    registrarErro(`Falha carregando a interface (${errorCode}) em ${validatedURL}`, errorDescription);
  });

  mainWindow.webContents.on("render-process-gone", (_, details) => {
    registrarErro("Processo da interface encerrado", details);
  });

  mainWindow.webContents.on("console-message", (_, level, message, line, sourceId) => {
    if (level >= 2) enviarLog(`Interface: ${message} (${sourceId}:${line})`, "ERROR");
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
  // Primeiro entrega a janela ao usuário; a varredura pode ser pesada em
  // pastas com muitos arquivos e não deve atrasar a abertura da interface.
  setTimeout(verificarDownloads, 250);
  monitorInterval = setInterval(verificarDownloads, INTERVALO_MINUTOS * 60 * 1000);
}).catch((error) => {
  registrarErro("Erro ao iniciar o aplicativo", error);
});
