//      DOLLBOX: An Electron-based bytebeat player

// 	    This program is free software: you can redistribute it and/or modify it under
//      the terms of the GNU General Public License as published by the Free Software
//      Foundation, either version 3 of the License, or (at your option) any later
//      version.

//      This program is distributed in the hope that it will be useful, but WITHOUT ANY
//      WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
//      PARTICULAR PURPOSE. See the GNU General Public License for more details.

//      You should have received a copy of the GNU General Public License along with
//      this program. If not, see <https://www.gnu.org/licenses/>. 

//      Copyright 2024 Chase Taylor

const { contextBridge, ipcRenderer } = require('electron/renderer');

contextBridge.exposeInMainWorld("elecAPI", {
    save: (code, sampleRate, soundRange, compileMode) => ipcRenderer.invoke('dialog:saveFile', code, sampleRate, soundRange, compileMode),
    load: () => ipcRenderer.invoke('dialog:openFile')
})

window.addEventListener('DOMContentLoaded', () => {
    const replaceText = (selector, text) => {
        const element = document.getElementById(selector);
        if (element) element.innerText = text;
    }

    for (const dependency of ['chrome', 'node', 'electron']) {
        replaceText(`${dependency}-version`, process.versions[dependency]);
    }
    let reveals = document.getElementsByClassName('electron-show');
    let l = reveals.length;
    for (let i = 0; i < l; i++) {
        try {
            reveals.item(i).classList.remove('hide');
        } catch { break; }
    };
})
