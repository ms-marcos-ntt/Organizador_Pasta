const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  onLog: (callback) => ipcRenderer.on("log", (_, evento) => callback(evento))
});
