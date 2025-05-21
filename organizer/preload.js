const { contextBridge, ipcRenderer } = require("electron");
contextBridge.exposeInMainWorld("electronAPI", {
  onLog: (callback) => ipcRenderer.on("log", (_, msg) => callback(msg))
});