const os = require('os');
const DOWNLOADS_DIR = path.join(os.homedir(), 'Downloads');
const ORGANIZADO_DIR = path.join(os.homedir(), 'Documentos', 'DownloadsOrganizados');
const INTERVALO_MINUTOS = 10;
const LIMITE_ARQUIVOS = 50;
const LIMITE_DIAS = 7;
const { enviarTelegram } = require('./telegram');

function diasDesde(data) {
  const agora = new Date();
  const diffMs = agora - data;
  return diffMs / (1000 * 60 * 60 * 24);
}

function moverArquivoParaTipo(arquivo) {
  const ext = path.extname(arquivo).slice(1).toLowerCase() || 'outros';
  const destinoDir = path.join(ORGANIZADO_DIR, ext);

  if (!fs.existsSync(destinoDir)) fs.mkdirSync(destinoDir, { recursive: true });

  const origem = path.join(DOWNLOADS_DIR, arquivo);
  const destino = path.join(destinoDir, arquivo);

  fs.rename(origem, destino, err => {
    if (err) console.error(`Erro movendo ${arquivo}:`, err);
    else console.log(`📦 Movido: ${arquivo} → /${ext}`);
  });
}

function verificarDownloads() {
  fs.readdir(DOWNLOADS_DIR, (err, arquivos) => {
    if (err) return console.error('Erro lendo a pasta:', err);

    let muitosArquivos = arquivos.length > LIMITE_ARQUIVOS;
    let arquivosAntigos = 0;

    arquivos.forEach(arquivo => {
      const caminho = path.join(DOWNLOADS_DIR, arquivo);
      const stats = fs.statSync(caminho);
      if (diasDesde(stats.mtime) > LIMITE_DIAS) {
        arquivosAntigos++;
        moverArquivoParaTipo(arquivo);
      }
    });

    if (muitosArquivos || arquivosAntigos > 5) {
      enviarTelegram('🧹 Pasta Downloads foi organizada automaticamente!');
    }
  });
}

module.exports = function monitorarDownloads() {
  console.log('⏳ Iniciando monitoramento de Downloads...');
  verificarDownloads();
  setInterval(verificarDownloads, INTERVALO_MINUTOS * 60 * 1000);
};