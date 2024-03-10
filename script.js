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

class BytebeatSystem {
    constructor() {
        this.SR = 8000;
        this.audioNode = null;
        this.analyserNode = null;
        this.gainNode = null;
        this.audioContext = null;
        this.elements = {
            samplerate: null,
            canvasWaveform: null,
            toggleWaveform: null,
            canvasDiagram: null,
            toggleDiagram: null,
            canvasFFT: null,
            toggleFFT: null,
            codeArea: null,
            error: null,
            buttonRewind: null,
            buttonReverse: null,
            buttonPause: null,
            buttonPlay: null,
            volumeSlider: null,
            soundRangeSelect: null,
            compilationModeSelect: null,
            saveButton: null,
            loadError: null,
            loadButton: null,
            dataCreate: null,
            dataLoad: null,
            data: null,
            t: null
        };
        this.visualiserPoints = [];
        this.wafeformLast = 0;
    }

    static mod(a, b) {
        return (a % b + b) % b;
    }

    renderer() {
        let waveformCtx = this.elements.canvasWaveform.getContext('2d');
        let diagramCtx = this.elements.canvasDiagram.getContext('2d', { willReadFrequently: true });
        let frequencyCtx = this.elements.canvasFFT.getContext('2d');
        const diagramImageData = diagramCtx.getImageData(0, 0, 512, 256);
        const { data } = diagramImageData;
        if (this.visualiserPoints.length > 0 && this.SR >= 8000) {
            waveformCtx.fillStyle = "#000000";
            waveformCtx.fillRect(0, 0, 512, 256);
            waveformCtx.fillStyle = "#ffffff";
        }
        // console.log(this.visualiserPoints.length);
        while (this.visualiserPoints.length > 0) {
            let point = this.visualiserPoints.pop();
            let t = point.t;
            let o = point.o;
            let diagramIdx = BytebeatSystem.mod(t, 256 * 512);
            let waveformIdx = BytebeatSystem.mod(t, 512);
            let diagramY = diagramIdx & 255;
            let diagramX = diagramIdx >> 8 & 511;
            let pixelIdx = (diagramX + (diagramY * 512)) << 2;
            if (isNaN(o)) {
                data[pixelIdx] = 100;
                data[pixelIdx + 1] = data[pixelIdx + 2] = 0;
            }
            else data[pixelIdx] = data[pixelIdx + 1] = data[pixelIdx + 2] = o;
            data[pixelIdx + 3] = 255;
            if (isNaN(o)) {
                waveformCtx.fillStyle = "#640000";
                waveformCtx.fillRect(waveformIdx, 0, 1, 256);
                waveformCtx.fillStyle = "#ffffff";
            } else {
                const lowest = Math.min(255 - this.wafeformLast, 255 - o);
                const height = Math.max(255 - this.wafeformLast, 255 - o) - lowest + 1;
                if (this.SR < 8000) {
                    waveformCtx.fillStyle = "#000000";
                    waveformCtx.fillRect(waveformIdx, 0, 1, 256);
                    waveformCtx.fillStyle = "#ffffff";
                }
                waveformCtx.fillRect(waveformIdx, lowest, 1, height);
                this.wafeformLast = o;
            }
        }
        // console.log(diagramImageData);
        diagramCtx.putImageData(diagramImageData, 0, 0);
        const arr = new Uint8Array(this.analyserNode.frequencyBinCount);
        frequencyCtx.fillStyle = "#000000";
        frequencyCtx.fillRect(0, 0, 512, 256);
        frequencyCtx.fillStyle = "#ffffff";
        this.analyserNode.getByteFrequencyData(arr);
        for (let i = 0; i < arr.length; i++) {
            let last = 255 - (arr[i - 1] ?? 255);
            let thus = 255 - arr[i];
            const lowest = Math.min(last, thus);
            const height = Math.max(last, thus) - lowest + 1;
            frequencyCtx.fillRect(i, lowest, 1, height);
        }
        while (this.visualiserPoints.length > 65536) this.visualiserPoints.pop();
        requestAnimationFrame(_ => (this.renderer()));
    }

    async init() {
        await this.initAudio();
        this.initElements();
        requestAnimationFrame(_ => (this.renderer()));
    }

    onVisualSelectChange(v) {
        switch (v) {
            case 'W':
                this.elements.canvasWaveform.classList.remove('hide');
                this.elements.canvasDiagram.classList.add('hide');
                this.elements.canvasFFT.classList.add('hide');
                break;
            case 'D':
                this.elements.canvasWaveform.classList.add('hide');
                this.elements.canvasDiagram.classList.remove('hide');
                this.elements.canvasFFT.classList.add('hide');
                break;
            case 'F':
                this.elements.canvasWaveform.classList.add('hide');
                this.elements.canvasDiagram.classList.add('hide');
                this.elements.canvasFFT.classList.remove('hide');
                break;
            case 'A':
                this.elements.canvasWaveform.classList.remove('hide');
                this.elements.canvasDiagram.classList.remove('hide');
                this.elements.canvasFFT.classList.remove('hide');
                break;
        }
    }

    getElementsById() {
        this.elements.samplerate = document.getElementById('samplerate');
        this.elements.canvasWaveform = document.getElementById('waveform');
        this.elements.toggleWaveform = document.getElementById('toggle-waveform');
        this.elements.toggleDiagram = document.getElementById('toggle-diagram');
        this.elements.toggleFFT = document.getElementById('toggle-fft');
        this.elements.canvasDiagram = document.getElementById('diagram');
        this.elements.canvasFFT = document.getElementById('fft');
        this.elements.codeArea = document.getElementById('code-area');
        this.elements.error = document.getElementById('error');
        this.elements.buttonRewind = document.getElementById('rewind-button');
        this.elements.buttonReverse = document.getElementById('reverse-button');
        this.elements.buttonPause = document.getElementById('pause-button');
        this.elements.buttonPlay = document.getElementById('forward-button');
        this.elements.volumeSlider = document.getElementById('volume-slider');
        this.elements.soundRangeSelect = document.getElementById('range');
        this.elements.compilationModeSelect = document.getElementById('method');
        this.elements.saveButton = document.getElementById('button-save');
        this.elements.loadError = document.getElementById('open-error');
        this.elements.loadButton = document.getElementById('button-open');
        this.elements.dataCreate = document.getElementById('make-data');
        this.elements.dataLoad = document.getElementById('load-data');
        this.elements.data = document.getElementById('data');
        this.elements.t = document.getElementById('t');
    }

    safe(a) {
        document.getElementById('safe').innerText = a;
        return document.getElementById('safe').innerHTML;
    }

    async generateEntry(entry, treeElem) {
        let elem = document.createElement('li');
        treeElem.appendChild(elem);
        if (entry.stereo) {
            elem.innerText = "Stereo tracks are not yet supported\n";
        }
        // Name, author
        let res = ""
        if (entry.name) {
            if (entry.url) {
                entry.url = entry.url[0] ?? entry.url;
                res += `"<a href="${entry.url.replaceAll('"', '\\"')}" target="_blank">${this.safe(entry.name)}</a>"${entry.author ? ' ' : ''}`;
            }
            else res += `"${this.safe(entry.name)}"${entry.author ? ' ' : ''}`;
        } else if (entry.url) {
            entry.url = entry.url[0] ?? entry.url;
            res += `(<a href="${entry.url.replaceAll('"', '\\"')}" target="_blank">Unnamed</a>)${entry.author ? ' ' : ''}`;
        }
        if (entry.author) res += `By ${this.safe(entry.author)}`;

        if (entry.sampleRate && entry.sampleRate !== 8000 || (entry.mode && entry.mode !== 'Bytebeat')) res += " @"
        if (entry.sampleRate && entry.sampleRate !== 8000) res += ` ${entry.sampleRate}Hz`;
        if (entry.mode && entry.mode !== 'Bytebeat') {
            res += ` ${entry.mode}`;
        }
        if (entry.description) res += ` "${this.safe(entry.description)}"`;

        if (res !== '') {
            let nameSpan = document.createElement('span');
            nameSpan.innerHTML = res;
            elem.appendChild(nameSpan);
            elem.appendChild(document.createElement('br'));
        }

        function addCodeLink(text, code, SR, mode) {
            let container = document.createElement('span');
            if (text) {
                if (text) container.innerText = `${text}: `;
            }
            let codeLink = document.createElement('a');
            codeLink.href = "javascript:void(0);"; // The URL will be refused of evalulation, but it'll do nothing anyway
            if (Array.isArray(code)) {
                code = code.reduce((a, b) => a + "\n" + b);
            }
            codeLink.setAttribute('code', code);
            codeLink.setAttribute('rate', SR);
            codeLink.setAttribute('mode', entry.mode ?? "Bytebeat");
            codeLink.addEventListener('click', function () {
                bytebeat.loadCode(this);
            })
            codeLink.classList.add("code");
            codeLink.innerText = code;
            container.appendChild(codeLink);
            elem.appendChild(container);
            elem.appendChild(document.createElement('br'));
        }

        // Code
        if (entry.codeMinified) {
            addCodeLink('Minified', entry.codeMinified, entry.sampleRate ?? 8000, entry.mode ?? "Bytebeat")
        }

        if (entry.codeOriginal) {
            addCodeLink(entry.codeMinified ? 'Original' : '', entry.codeOriginal, entry.sampleRate ?? 8000, entry.mode ?? "Bytebeat")
        }

        if (entry.file) {
            let buttonRow = document.createElement('div');
            buttonRow.classList.add("flex");
            function addCodeLink(text, file, SR, mode) {
                let button = document.createElement('button');
                button.setAttribute('file', file);
                button.setAttribute('rate', SR);
                button.setAttribute('mode', entry.mode ?? "Bytebeat");
                button.addEventListener('click', function () {
                    bytebeat.loadCodeFromFile(this);
                })
                button.classList.add("library-codebutton");
                button.innerText = text;
                buttonRow.appendChild(button);
            }

            if (entry.fileMinified) {
                addCodeLink("Minified", `https://dollchan.net/bytebeat/library/minified/${entry.file}`, entry.sampleRate ?? 8000, entry.mode ?? "Bytebeat");
            }

            if (entry.fileOriginal) {
                addCodeLink("Original", `https://dollchan.net/bytebeat/library/original/${entry.file}`, entry.sampleRate ?? 8000, entry.mode ?? "Bytebeat");
            }

            if (entry.fileFormatted) {
                addCodeLink("Formatted", `https://dollchan.net/bytebeat/library/formatted/${entry.file}`, entry.sampleRate ?? 8000, entry.mode ?? "Bytebeat");
            }
            elem.appendChild(buttonRow);
        }

        if (entry.children) {
            let tree = document.createElement('ul');
            elem.appendChild(tree);
            for (const A of entry.children) {
                this.generateEntry(A, tree);
            }
        }
    }

    createData() {
        let D = this.elements.data;
        D.value = "DOLLBOX:";
        D.value += `${this.SR}:`;
        D.value += `${this.elements.soundRangeSelect.value}:`;
        D.value += `${this.elements.compilationModeSelect.value}:`;
        D.value += btoa(this.elements.codeArea.value);
    }

    loadData() {
        let Z = this.elements.data.value.trim();
        Z = Z.replace('DOLLBOX:', '');
        const SR = +Z.match(/\d+/);
        Z = Z.replace(/\d+/, '');
        const soundRange = Z.match(/\w+(?=:)/);
        Z = Z.replace(/\w+:/, '');
        const compilationMode = Z.match(/\w+(?=:)/);
        Z = Z.replace(/\w+:/, '');
        this.loadCodeBase(atob(Z.slice(1)), SR, soundRange, compilationMode);
    }

    initElements() {
        this.getElementsById();
        this.elements.samplerate.addEventListener('change', () => {
            this.elements.samplerate.value = Math.abs(+this.elements.samplerate.value);
            this.elements.samplerate.value = isNaN(this.elements.samplerate.value) ? 8000 : this.elements.samplerate.value;
            this.SR = this.elements.samplerate.value;
            this.sendData({ samplerate: this.SR });
        });

        this.elements.codeArea.addEventListener("keyup", (event) => {
            if (event.isComposing || event.keyCode === 229) {
                return;
            }
            this.elements.error.innerText = "No error";
            this.sendData({ func: this.elements.codeArea.value });
        });

        this.elements.buttonRewind.addEventListener('click', () => {
            this.sendData({ rewind: true });
            let diagramCtx = this.elements.canvasDiagram.getContext('2d');
            diagramCtx.fillStyle = '#ff0000';
            diagramCtx.fillRect(0, 0, 512, 256);
        });

        this.elements.buttonPause.addEventListener('click', () => {
            this.audioContext.suspend();
        });

        this.elements.buttonPlay.addEventListener('click', () => {
            this.sendData({ speed: 1 });
            this.audioContext.resume();
        });

        this.elements.buttonReverse.addEventListener('click', () => {
            this.sendData({ speed: -1 });
            this.audioContext.resume();
        });

        this.elements.volumeSlider.addEventListener('change', () => {
            this.gainNode.gain.exponentialRampToValueAtTime(this.elements.volumeSlider.value / 100 + 0.01, 0.1);
        });

        this.elements.toggleWaveform.addEventListener('change', () => {
            this.elements.canvasWaveform.classList.toggle('hide', !this.elements.toggleWaveform.checked);
        });

        this.elements.toggleDiagram.addEventListener('change', () => {
            this.elements.canvasDiagram.classList.toggle('hide', !this.elements.toggleDiagram.checked);
        });

        this.elements.toggleFFT.addEventListener('change', () => {
            this.elements.canvasFFT.classList.toggle('hide', !this.elements.toggleFFT.checked);
        });

        this.elements.soundRangeSelect.addEventListener('change', () => {
            this.sendData({ mode: this.elements.soundRangeSelect.value });
        })

        this.elements.compilationModeSelect.addEventListener('change', () => {
            this.sendData({ compileUsing: this.elements.compilationModeSelect.value, func: this.elements.codeArea.value });
            this.elements.error.innerText = "No error";
        })

        document.getElementById('lag-button').addEventListener('click', () => {
            this.audioContext.suspend();
            setTimeout(() => { this.audioContext.resume(); }, 250);
        });

        this.elements.dataCreate.addEventListener('click', () => { this.createData() });
        this.elements.dataLoad.addEventListener('click', () => { this.loadData() });

        this.elements.loadButton.addEventListener('click', async () => {
            const data = await window.elecAPI.load();
            console.log(data);
            if (data.error) {
                this.elements.loadError.innerText = "Error: " + data.error;
            } else {
                const { code, SR, range, method } = data;
                this.loadCodeBase(code, SR, range, method)
                this.elements.loadError.innerText = "";
            }
        })

        this.elements.saveButton.addEventListener('click', async () => {
            await window.elecAPI.save(this.elements.codeArea.value, this.SR, this.elements.soundRangeSelect.value, this.elements.compilationModeSelect.value);
        })

        let libraries = document.getElementsByClassName('library-part');
        for (let i = 0; i < libraries.length; i++) {
            let header = libraries.item(i);
            header.addEventListener('toggle', () => {
                if (header.getAttribute('loaded') == null) {
                    header.setAttribute('loaded', true);
                    let loading = header.querySelector('.loading');
                    header.querySelector('.library-errortext')?.remove();
                    loading.classList.remove('hide');
                    let article = header.querySelector('.library-content');
                    let path = article.id.replace("library-", '');
                    let list = document.createElement('ul');
                    article.appendChild(list);
                    fetch(`https://dollchan.net/bytebeat/library/${path}.json`, { cache: 'no-cache' }).then(data => {
                        if (!data.ok) {
                            loading.classList.add('hide');
                            header.removeAttribute('loaded');
                            list.remove();
                            let error = document.createElement('p');
                            error.classList.add("library-errortext");
                            error.innerText = `HTTP ${data.status}`;
                            article.appendChild(error);
                            return;
                        }
                        data.json().then(A => {
                            for (const i of A) {
                                this.generateEntry(i, list);
                            }
                            loading.remove();
                        });
                    }).catch(reason => {
                        loading.classList.add('hide');
                        header.removeAttribute('loaded');
                        list.remove();
                        let error = document.createElement('p');
                        error.classList.add("library-errortext");
                        error.innerText = reason;
                        article.appendChild(error);
                        return;
                    });
                }
            })
        }
    }

    async initAudio() {
        this.audioContext = new AudioContext({ sampleRate: 48000 });
        await this.audioContext.audioWorklet.addModule('sound-gen.js');
        this.audioNode = new AudioWorkletNode(this.audioContext, 'sound-gen', { outputChannelCount: [1] });
        this.audioNode.port.addEventListener('message', e => this.receiveData(e.data));
        this.audioNode.port.start();
        this.analyserNode = new AnalyserNode(this.audioContext, { fftSize: 1024 });
        this.gainNode = new GainNode(this.audioContext, { gain: 0.5 });
        this.audioNode.connect(this.analyserNode);
        this.analyserNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    setSampleRate(sr) {
        this.SR = sr;
        this.sendData({ samplerate: this.SR });
        this.elements.samplerate.value = this.SR;
    }

    loadCodeDollchan(code, SR, mode) {
        let range, method;
        switch (mode) {
            case "Bytebeat":
                range = "regular";
                method = "normal";
                break;
            case "Signed Bytebeat":
                range = "signed";
                method = "normal";
                break;
            case "Floatbeat":
                range = "float";
                method = "normal";
                break;
            case "Funcbeat":
                range = "float";
                method = "func";
                break;
        }
        this.loadCodeBase(code, SR, range, method);
    }

    loadCodeBase(code, SR, range, method) {
        range = String(range).replace(/\W/g,'');
        method = String(method).replace(/\W/g,'');
        this.setSampleRate(SR);
        this.elements.codeArea.value = code;
        this.elements.soundRangeSelect.value = range;
        this.elements.compilationModeSelect.value = method;
        this.sendData({ func: code, rewind: true, speed: 1, mode: range, compileUsing: method });
        let diagramCtx = this.elements.canvasDiagram.getContext('2d');
        diagramCtx.fillStyle = '#ff0000';
        diagramCtx.fillRect(0, 0, 512, 256);
        this.audioContext.resume();
        this.elements.error.innerText = "No error";
    }

    loadCode(elem) {
        let SR = elem.getAttribute('rate');
        let C = elem.getAttribute('code');
        let M = elem.getAttribute('mode');

        this.loadCodeDollchan(C, SR, M);
    }

    loadCodeFromFile(elem) {
        let oldText = elem.innerText;
        elem.innerText = "Loading..."
        let SR = elem.getAttribute('rate');
        let F = elem.getAttribute('file');
        let M = elem.getAttribute('mode');

        fetch(F, { cache: "no-cache" }).then(data => {
            if (!data.ok) {
                elem.innerText = `HTTP ${data.status}`
                setTimeout(() => { elem.innerText = oldText }, 1000);
                return;
            }
            data.text().then((C) => {
                this.loadCodeDollchan(C, SR, M);
                elem.innerText = oldText;
            }
            );
        }).catch((reason) => {
            elem.innerText = reason;
            setTimeout(() => { elem.innerText = oldText }, 1000);
            return;
        });
    }

    receiveData(data) {
        if (data.samples) {
            this.visualiserPoints = this.visualiserPoints.concat(data.samples);
            // console.log(this.visualiserPoints.length);
        }
        if (data.compileFail) this.elements.error.innerText = data.compileFail;
        if (data.runtimeFail) this.elements.error.innerText = "{{" + data.runtimeFail.t + "}} " + data.runtimeFail.body;
        if (data.t) this.elements.t.innerText = data.t;
    }

    sendData(data) {
        this.audioNode.port.postMessage(data);
    }

    controlsSetSpeed(speed, e) {

    }
}

async function M() {
    let status = document.getElementById('loading-status');
    status.innerText = "Script loaded\n";
    let deletes = document.getElementsByClassName('delete-on-load');
    let l = deletes.length;
    for (let i = 0; i < l; i++) {
        try {
            deletes.item(0).remove();
        } catch { break; }
    };
    status.innerText += "Infoheader removed\n";
    globalThis.bytebeat = new BytebeatSystem();
    status.innerText += "BytebeatSystem created\n";
    globalThis.bytebeat.init();
    status.innerText += "Loaded!";
    status.remove();
}

if (document.readyState == 'loading') {
    document.addEventListener('DOMContentLoaded', M);
} else M();