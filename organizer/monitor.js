const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
require("dotenv").config();

const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");
const ORGANIZADO_DIR = path.join(
  os.homedir(),
  process.env.DESTINO_DOWNLOADS
);
const INTERVALO_MINUTOS = 10;
const LIMITE_ARQUIVOS = 50;
const LIMITE_DIAS = 1;

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
    if (err) console.error(`Erro movendo ${arquivo}:`, err);
    else console.log(`📦 Movido: ${arquivo} → /${ext}`);
  });
}

function verificarDownloads() {
  fs.readdir(DOWNLOADS_DIR, (err, arquivos) => {
    // console.log(
    //   `📂 Arquivos encontrados na pasta Downloads (${arquivos.length}):`
    // );
    // arquivos.forEach((arquivo, i) => {
    //   console.log(`  ${i + 1}. ${arquivo}`);
    // });

    if (err) return console.error("Erro lendo a pasta:", err);

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
      console.log(`[${new Date().toLocaleTimeString()}] Downloads em ordem.`);
    }
  });
}

function notificar(msg) {
  if (process.platform === "linux") {
    exec(`notify-send "${msg}"`);
  } else if (process.platform === "darwin") {
    exec(
      `osascript -e 'display notification "${msg}" with title "Organizador de Downloads"'`
    );
  } else if (process.platform === "win32") {
    exec(
      `powershell -Command "Add-Type -AssemblyName PresentationFramework;[System.Windows.MessageBox]::Show('${msg}', 'Organizador de Downloads')"`
    );
  } else {
    console.log(msg);
  }
}

console.log(
  `👀 Monitorando pasta Downloads a cada ${INTERVALO_MINUTOS} minutos...`
);
verificarDownloads();
setInterval(verificarDownloads, INTERVALO_MINUTOS * 60 * 1000);
