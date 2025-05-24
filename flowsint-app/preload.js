// preload.js
const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('api', {
    // expose des fonctions ici si besoin
});
