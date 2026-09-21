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

console.log("Gerando o executável Windows...\n");

const command = process.platform === "win32" ? "electron-packager.cmd" : "electron-packager";
const result = spawnSync(
  command,
  [
    ".",
    "organizador-downloads",
    "--platform=win32",
    "--arch=x64",
    "--extra-resource=.env",
    "--out=dist",
    "--overwrite",
  ],
  { cwd: projectDir, stdio: "inherit", shell: false }
);

if (result.error) {
  console.error(`\nNão foi possível executar o empacotador: ${result.error.message}\n`);
  process.exit(1);
}

if (result.status !== 0) {
  process.exit(result.status || 1);
}

if (!fs.existsSync(executablePath)) {
  console.error(`\nO empacotamento terminou, mas o executável não foi encontrado em:\n${executablePath}\n`);
  process.exit(1);
}

console.log("\nExecutável gerado com sucesso!");
console.log(`Pasta do aplicativo: ${path.dirname(executablePath)}`);
console.log(`Executável: ${executablePath}`);
