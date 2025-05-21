const { app, BrowserWindow, Menu, Tray, dialog } = require('electron');
const fs = require('fs');
const path = require('path');
const axios = require('axios');
const monitorarDownloads = require('./monitor');

let tray = null;
let win = null;

function createWindow() {
  win = new BrowserWindow({
    width: 400,
    height: 300,
    webPreferences: {
      nodeIntegration: true,
      contextIsolation: false,
    },
    icon: path.join(__dirname, 'icons', 'icon.png'),
  });

  win.loadFile('index.html');
}

function criarMenu() {
  tray = new Tray(path.join(__dirname, 'icons', 'icon.png'));
  const menu = Menu.buildFromTemplate([
    {
      label: 'Configurar Bot Telegram',
      click: () => {
        win.show();
      },
    },
    {
      label: 'Sair',
      click: () => {
        app.quit();
      },
    },
  ]);
  tray.setToolTip('Organizador de Downloads');
  tray.setContextMenu(menu);
}

app.whenReady().then(() => {
  createWindow();
  criarMenu();
  monitorarDownloads();
  win.hide();
});

app.on('window-all-closed', (e) => e.preventDefault());