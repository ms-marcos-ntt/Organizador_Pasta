const fs = require("fs");
const path = require("path");
const { spawnSync } = require("child_process");
const dotenv = require("dotenv");

const projectDir = path.resolve(__dirname, "..");
const envPath = path.join(projectDir, ".env");
const outputDir = path.join(projectDir, "dist");
const executablePath = path.join(
  outputDir,
  "organizador-downloads-win32-x64",
  "organizador-downloads.exe"
);

// electron-packager 17 usa extract-zip, que pode travar no Node 24 durante
// a extração do ZIP do Electron no Windows. O Expand-Archive nativo evita
// esse problema sem alterar as dependências do projeto.
if (process.platform === "win32") {
  const extractZipPath = require.resolve("extract-zip");
  require(extractZipPath);
  require.cache[extractZipPath].exports = async (zipPath, options) => {
    const quote = (value) => `'${String(value).replace(/'/g, "''")}'`;
    const command = `Expand-Archive -LiteralPath ${quote(zipPath)} -DestinationPath ${quote(options.dir)} -Force`;
    const result = spawnSync(
      "powershell.exe",
      ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", command],
      { stdio: "inherit" }
    );

    if (result.error || result.status !== 0) {
      throw result.error || new Error("Falha ao extrair o Electron com Expand-Archive.");
    }
  };
}

const packager = require("electron-packager");

if (!fs.existsSync(envPath)) {
  console.error("\nArquivo .env não encontrado.");
  console.error("Crie organizer/.env a partir de organizer/.env.example e configure DESTINO_DOWNLOADS.\n");
  process.exit(1);
}

const env = dotenv.parse(fs.readFileSync(envPath));
if (!env.DESTINO_DOWNLOADS || !env.DESTINO_DOWNLOADS.trim()) {
  console.error("\nA variável DESTINO_DOWNLOADS não está configurada no arquivo .env.\n");
  process.exit(1);
}

function findExecutable(directory) {
  if (!fs.existsSync(directory)) return null;

  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    const entryPath = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      const found = findExecutable(entryPath);
      if (found) return found;
    } else if (entry.name.toLowerCase().endsWith(".exe")) {
      return entryPath;
    }
  }

  return null;
}

async function main() {
  console.log("Gerando o executável Windows...\n");

  try {
    await packager({
      dir: projectDir,
      name: "organizador-downloads",
      platform: "win32",
      arch: "x64",
      extraResource: [envPath],
      out: outputDir,
      overwrite: true,
    });
  } catch (error) {
    console.error(`\nNão foi possível gerar o executável: ${error.message}\n`);
    process.exit(1);
  }

  const generatedExecutable = findExecutable(outputDir);
  if (!generatedExecutable) {
    console.error(`\nO empacotamento terminou, mas o executável não foi encontrado em:\n${executablePath}\n`);
    process.exit(1);
  }

  console.log("\nExecutável gerado com sucesso!");
  console.log(`Pasta do aplicativo: ${path.dirname(generatedExecutable)}`);
  console.log(`Executável: ${generatedExecutable}`);
}

main();
