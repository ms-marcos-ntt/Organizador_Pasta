# 🧹 Organizador de Downloads

Um app simples feito em Node.js + Electron que monitora automaticamente a pasta `Downloads`, move os arquivos por tipo (PDF, EXE, JPG, etc) para subpastas dentro de `Documentos`, e te avisa quando uma limpeza for feita.

---

## 📁 Estrutura do Projeto

```bash
Organizador_Pasta/
├── organizer/
│   ├── dist/                  # Pasta gerada após empacotamento
│   ├── node_modules/
│   ├── main.js                # Entrada principal do Electron
│   ├── monitor.js             # Script de monitoramento e organização
│   ├── preload.js             # Comunicação entre Electron e HTML
│   └── index.html             # Interface da janelinha de log
├── package.json
└── README.md
```

---

## ⚙️ Funcionalidades

* 🧠 Verifica a pasta `Downloads` a cada X minutos.
* 📦 Move arquivos automaticamente para pastas separadas por tipo:

  * `Documentos/DownloadsOrganizados/pdf/`
  * `Documentos/DownloadsOrganizados/exe/`
  * ...
* 🪪 Notificações nativas do sistema (Windows, Linux ou macOS).
* 📺 Interface simples com log em tempo real.
* 🖱️ Empacotável como `.exe` autônomo para Windows.
* 🔁 Pode ser configurado para iniciar com o Windows.

---

## ▶️ Executando em modo dev

```bash
npm install
npm start
```

---

## 📦 Gerando o EXE do Windows

No terminal, entre na pasta `organizer` e instale as dependências uma vez:

```bash
cd organizer
npm install
```

Antes de empacotar, crie o arquivo de configuração:

```bash
copy .env.example .env
```

Edite o `.env` e configure `DESTINO_DOWNLOADS` com a pasta de destino dentro da sua pasta de usuário. Depois, execute:

```bash
npm run instalador:windowns
```

O comando valida o `.env`, gera o aplicativo Windows e informa o caminho completo do executável ao terminar. O arquivo ficará em:

```text
organizer/dist/organizador-downloads-win32-x64/organizador-downloads.exe
```

Também é possível usar o nome corrigido:

```bash
npm run instalador:windows
```

O comando antigo `npm run package` continua disponível como atalho para o mesmo processo.

---

## 🚀 Colocar na inicialização do Windows

1. Pressione `Win + R` e digite:

```bash
shell:startup
```

2. Na pasta que abrir, cole um atalho do `organizador-downloads.exe` que está dentro da pasta `dist`.

> Pronto! Toda vez que iniciar o PC, seu organizador já vai estar funcionando automaticamente.

---

## 🧪 Como funciona (internamente)

* Lê a pasta `Downloads`
* Se houver arquivos com mais de 1 dia ou mais de 50 arquivos, move para subpastas em `Documentos/DownloadsOrganizados/`
* Notifica o usuário com uma janelinha ou alerta do sistema

---

## 🧰 Dependências

* [Electron](https://www.electronjs.org/)
* [Node.js](https://nodejs.org/)
* Módulos nativos: `fs`, `path`, `os`, `child_process`

---

## 📌 Personalizações futuras (ideias)

* Interface com bot Telegram
* Interface para escolher pastas de destino
* Agendamento customizável
* Modo silencioso com balões discretos de aviso

---

## 👨‍💻 Autor

**Marcos Santos**
Organizador criado por necessidade, evoluído por capricho.
