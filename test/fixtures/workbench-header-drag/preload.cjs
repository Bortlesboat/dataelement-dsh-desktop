const { contextBridge, ipcRenderer } = require('electron')
contextBridge.exposeInMainWorld('fixture', { click: id => ipcRenderer.send('fixture-click', id) })
