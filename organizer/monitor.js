const fs = require("fs");
const path = require("path");
const os = require("os");
const { exec } = require("child_process");
const dotenvPath = path.join(__dirname, ".env");
require("dotenv").config({ path: dotenvPath });

const DOWNLOADS_DIR = path.join(os.homedir(), "Downloads");

function resolverDiretorioOrganizado() {
  const configurado = process.env.DESTINO_DOWNLOADS?.trim();
  if (!configurado) {
    throw new Error("DESTINO_DOWNLOADS não está configurado no arquivo .env");
  }

  return path.isAbsolute(configurado)
    ? path.normalize(configurado)
    : path.join(os.homedir(), configurado);
}

const ORGANIZADO_DIR = resolverDiretorioOrganizado();
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
    if (!err) {
      console.log(`📦 Movido: ${arquivo} → /${ext}`);
      return;
    }

    if (err.code !== "EXDEV") {
      console.error(`Erro movendo ${arquivo}:`, err);
      return;
    }

    fs.copyFile(origem, destino, fs.constants.COPYFILE_EXCL, (copyError) => {
      if (copyError) {
        console.error(`Erro copiando ${arquivo}:`, copyError);
        return;
      }

      fs.unlink(origem, (unlinkError) => {
        if (unlinkError) {
          console.error(`Arquivo copiado, mas não removido da origem ${arquivo}:`, unlinkError);
          return;
        }
        console.log(`📦 Movido entre volumes: ${arquivo} → /${ext}`);
      });
    });
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
