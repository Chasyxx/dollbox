// DOLLBOX: An Electron-based bytebeat player

// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.

// This program is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
// PARTICULAR PURPOSE. See the GNU General Public License for more details.

// You should have received a copy of the GNU General Public License along with
// this program. If not, see <https://www.gnu.org/licenses/>. 

// Copyright 2024 Chase Taylor

const { app, BrowserWindow, ipcMain, dialog } = require('electron');
const { inflateRaw, deflateRaw } = require('pako');
const { readFileSync, writeFileSync } = require('node:fs');
const path = require('node:path');

async function OpenFileHandler() {
	const { canceled, filePaths } = await dialog.showOpenDialog({
		properties: ['openFile'],
		filters: [
			{ name: 'DOLLBOX file', extensions: ['dlb'] }
		]
	});
	if (!canceled) {
		const data = readFileSync(filePaths[0]);
		if (data.subarray(0, 7).toString('ascii') !== 'DOLLBOX') {
			return { error: "NOT A DOLLBOX FILE" };
		};
		let version = data.readUInt8(7);
		switch (version) {
			case 0: {
				//DOLLBOXvSSSS--;;;;;
				let sampleRate = data.readUInt32LE(8);
				let soundModes = data.subarray(12, 14).toString('ascii');
				let range, method;
				switch (soundModes[1]) {
					case 'R':
					default:
						range = 'regular';
						break;
					case 'S':
						range = 'signed';
						break;
					case 'F':
						range = 'float';
						break;
				}
				if (soundModes[1] == 'F') method = 'func';
				else method = 'normal';
				let inflated;
				try {
					inflated = inflateRaw(data.subarray(14), { to: 'string' });
				} catch (e) {
					return { error: e };
				}
				console.log(soundModes)
				console.log(range)
				console.log(method)
				console.log(inflated)
				console.log(sampleRate)
				return { code: inflated, SR: sampleRate, range, method };
			}
			default: {
				return { error: "Unknown version" };
			}
		}
	}
	return { error: "Dialog cancelled" };
}

function mkNumber(s, f, n) {
	let B = Buffer.alloc(s);
	B[f](n);
	return B;
}

async function SaveFileHandler(_event, code, sampleRate, soundRange, compileMode) {
	console.log(code, sampleRate, soundRange, compileMode);
	const res = await dialog.showSaveDialog({
		filters: [
			{ name: 'DOLLBOX file', extensions: ['dlb'] }
		],
		defaultPath: 'file.dlb'
	});
	const { canceled, filePath } = res
	if (!canceled) {

		const deflated = deflateRaw(code);
		let modeFlags = '';
		switch (soundRange) {
			case 'regular':
			default:
				modeFlags += 'R';
				break;
			case 'signed':
				modeFlags += 'S';
				break;
			case 'float':
				modeFlags += 'F';
				break
		}
		if (compileMode == 'func')
			modeFlags += 'F';
		else modeFlags += 'N';
		const file = Buffer.concat([
			Buffer.from("DOLLBOX", 'ascii'),
			mkNumber(1, 'writeUInt8', 0), // File version
			mkNumber(4, 'writeUInt32LE', sampleRate),
			Buffer.from(modeFlags, 'ascii'),
			Buffer.from(deflated)
		]); //DOLLBOXvSSSS--;;;;;

		writeFileSync(filePath, file);

		return filePath;
	} else {
		return { error: "Dialog cancelled" };
	}
}

function genWin() {
	const win = new BrowserWindow({
		width: 1080,
		height: 662,
		webPreferences: {
			preload: path.join(__dirname, 'preload.js'),
			contentSecurityPolicy: "script-src 'self' 'unsafe-eval';"
		}
	})

	win.loadFile('index.html');
}

app.whenReady().then(() => {
	ipcMain.handle('dialog:openFile', OpenFileHandler);
	ipcMain.handle('dialog:saveFile', SaveFileHandler);
	genWin();
	app.on('activate', () => {
		if (BrowserWindow.getAllWindows().length === 0) genWin();
	})
});

app.on('window-all-closed', () => {
	if (process.platform !== 'darwin') app.quit();
});

let renderBuffer = Buffer.alloc(1); // 1b is arbitrary, only there until a real render is made
