# 🧹 Organizador de Downloads

Um app simples feito em Node.js + Electron que monitora automaticamente a pasta `Downloads`, move os arquivos por tipo (PDF, EXE, JPG, etc) para subpastas dentro de `Documentos`, e te avisa quando uma limpeza for feita.

---

## 📁 Estrutura do Projeto

```bash
Organizador_Pasta/
├── node_modules/
├── organizer/
│   ├── dist/                  # Pasta gerada após empacotamento
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

## 📦 Empacotando como EXE (Windows)

1. Instale o empacotador:

```bash
npm install --save-dev electron-packager
```

2. Adicione o script ao `package.json`:

```json
"scripts": {
  "start": "electron .",
  "package": "electron-packager . organizador-downloads --platform=win32 --arch=x64 --out=dist --overwrite"
}
```

3. Empacote com:

```bash
npm run package
```

4. Abra a pasta:

```bash
dist/organizador-downloads-win32-x64/
```

E execute o `organizador-downloads.exe`.

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
