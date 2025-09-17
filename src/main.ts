// This file is part of the program DOLLBOX, a standalone bytebeat player app.

// This program is free software: you can redistribute it and/or modify it under
// the terms of the GNU Affero General Public License as published by the Free Software
// Foundation, either version 3 of the License, or (at your option) any later
// version.

// This program is distributed in the hope that it will be useful, but WITHOUT ANY
// WARRANTY; without even the implied warranty of MERCHANTABILITY or FITNESS FOR A
// PARTICULAR PURPOSE. See the GNU Affero General Public License for more details.

// You should have received a copy of the GNU Affero General Public License along with
// this program. If not, see <https://www.gnu.org/licenses/>. 

// Copyright 2024, 2025 Chase Taylor

//@ts-ignore - No type for pako!
import pako from './assets/pako.esm.mjs'
import { fetch as tauriFetch } from '@tauri-apps/plugin-http';

function formatBytes(bytes: number, slash: boolean = false) {
	if(bytes < 2e3) {
		return bytes + 'B';
	}
	// i fear the day we get a 1 Terabyte code...
	const i0 = Math.floor(Math.log(bytes/2) / Math.log(1000));
	const d0 = (i0 ? (bytes / (1000 ** i0)).toFixed(2) : bytes) + ['B', 'KB', 'MB', 'GB', 'TB'][i0];
	const i4 = Math.floor(Math.log(bytes/2) / Math.log(1024));
	const s4 = (i0 ? (bytes / (1024 ** i0)).toFixed(2) : bytes) + ['B', 'KiB', 'MiB', 'GiB', 'TiB'][i4];
	return slash?`${s4}/${[d0]}`:`${s4} (${[d0]})`
}

type visualiserPoint = {
  t: number,
  L: number,
  R: number
};

enum soundMode {
  u8 = 'Bytebeat',
  i8 = 'Signed Bytebeat',
  f = 'Floatbeat',
  u8f = 'uFuncbeat',
  i8f = 'iFuncbeat',
  ff = 'Funcbeat'
};

enum soundRange {
    u8 = 'regular',
    s8 = 'signed',
    f = 'float'
};

enum compilationMethod {
    expression = 'normal',
    statement = 'func',
};

type libraryCode = string | string[];

enum starRating {
    none = 0,
    star = 1,
    gold = 2
}

type LibraryRemixLink = {
    hash: string,
    author?: string,
    name: string,
    url?: string,
}

type LibrarySong = {
    /**
     * A random number associated with the song.
     * Used to grab remixes and files.
     */
    hash: string,
    name: string,
    description?: string,
    /** Source URL. */
    url?: string | string[],
    sampleRate: number,
    mode?: soundMode,

    /** Inline original code. */
    code?: string,
    /** Original code length. */
    codeLen?: number,
    /**
     * Indicates the presence of a
     * file for the original song
     * server-side. 
     */
    fileOrig?: boolean

    /** Inline minified code. */
    codeMin?: string,
    /** Minified code length. */
    codeMinLen?: number,
    /**
     * Indicates the presence of a
     * file for the minified song
     * server-side. 
     */
    fileMin?: boolean

    /** Imline formatted code. */
    codeForm?: string,
    /** Formatted code length. */
    codeFormLen?: number,
    /**
     * Indicates the presence of a
     * file for the formatted song
     * server-side. 
     */
    fileForm?: boolean

    /** Additional tags in code. */
    tags: string[],
    rating?: starRating,
    /** The library admin that added this song. */
    user_added: string,
    /** List of songs whose inspiration or code were used in this one. */
    remix?: LibraryRemixLink[],
    /** External music peice that was covered. */
    coverName?: string,
    coverUrl?: string,
    /** YYYY-MM-DD. */
    date?: `${number}-${number}-${number}`,
    stereo?: boolean
};

type LibraryAuthor = {
    author: string;
    songs: LibrarySong[];
};

const libraryLinks = {
    dollchan: {
        library: "https://dollchan.net/bytebeat/data/library/",
        songs: "https://dollchan.net/bytebeat/data/songs/",
        all: "https://dollchan.net/bytebeat/data/library/all.gz",
    },
    chasyxx: {
        library: "https://chasyxx.github.io/EnBeat_NEW/data/library/",
        songs: "https://chasyxx.github.io/EnBeat_NEW/data/songs/",
        all: "https://chasyxx.github.io/EnBeat_NEW/data/library/all.gz",
    }
} as const;

type libraryOption = keyof typeof libraryLinks;

class BytebeatSystem {
    SR: number;
    audioNode: AudioWorkletNode | null;
    analyserNode: AnalyserNode | null;
    gainNode: GainNode | null;
    audioContext: AudioContext | null;
    elements: {
        samplerate: null | HTMLInputElement,
        canvasWaveform: null | HTMLCanvasElement,
        toggleWaveform: null | HTMLInputElement,
        canvasDiagram: null | HTMLCanvasElement,
        toggleDiagram: null | HTMLInputElement,
        canvasFFT: null | HTMLCanvasElement,
        toggleFFT: null | HTMLInputElement,
        codeArea: null | HTMLTextAreaElement,
        error: null | HTMLDivElement,
        buttonRewind: null | HTMLButtonElement,
        buttonReverse: null | HTMLButtonElement,
        buttonPause: null | HTMLButtonElement,
        buttonPlay: null | HTMLButtonElement,
        volumeSlider: null | HTMLInputElement,
        soundRangeSelect: null | HTMLSelectElement,
        compilationModeSelect: null | HTMLSelectElement,
        saveButton: null | HTMLButtonElement,
        loadError: null | HTMLSpanElement,
        loadButton: null | HTMLButtonElement,
        dataCreate: null | HTMLButtonElement,
        dataLoad: null | HTMLButtonElement,
        data: null | HTMLTextAreaElement,
        t: null | HTMLDivElement,
        librarySelector: null | HTMLSelectElement
    };
    libraryCache: Map<string, LibrarySong>;
    visualiserPoints: visualiserPoint[];
    waveformLast: [number, number];
    currentLibrary: libraryOption;
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
            t: null,
            librarySelector: null
        };
        this.visualiserPoints = [];
        this.waveformLast = [0, 0];
        this.libraryCache = new Map();
        this.currentLibrary = 'dollchan';
    }

    static mod(a: number, b: number): number {
        return (a % b + b) % b;
    }

    renderer() {
        let waveformCtx = this.elements.canvasWaveform!.getContext('2d')!;
        let diagramCtx = this.elements.canvasDiagram!.getContext('2d', { willReadFrequently: true })!;
        let frequencyCtx = this.elements.canvasFFT!.getContext('2d')!;
        const waveformImageData = waveformCtx.getImageData(0, 0, 512, 256);
        const diagramImageData = diagramCtx.getImageData(0, 0, 512, 256);
        const frequencyImageData = frequencyCtx.getImageData(0, 0, 512, 256);
        const { data: waveformData } = waveformImageData;
        const { data: diagramData } = diagramImageData;
        const { data: frequencyData } = frequencyImageData;
        // if (this.visualiserPoints.length > 0 && this.SR >= 8000) {
        //     for(let x=0; x<512; x++) {
        //         for(let y=0; y<512; y++) {
        //             let P = (y*512+x)<<2;
        //             waveformData[P] =
        //             waveformData[P+1] =
        //             waveformData[P+2] = 0;
        //             waveformData[P+3] = 255;
        //         }
        //     }
        // }
        while (this.visualiserPoints.length > 0) {
            let point = this.visualiserPoints.pop()!;
            const { t, L, R } = point;
            let diagramIdx = BytebeatSystem.mod(t, 256 * 512);
            let waveformIdx = BytebeatSystem.mod(t, 512);
            let diagramY = diagramIdx & 255;
            let diagramX = diagramIdx >> 8 & 511;
            let pixelIdx = (diagramX + (diagramY * 512)) << 2;
            const hasNaN = isNaN(L) || isNaN(R);
            diagramData[pixelIdx] =
                diagramData[pixelIdx + 1] =
                diagramData[pixelIdx + 2] = 0;
            if (hasNaN) {
                diagramData[pixelIdx] = 100;
                diagramData[pixelIdx + 1] = diagramData[pixelIdx + 2] = 0;
            }
            if (!hasNaN) diagramData[pixelIdx] = R;
            if (!isNaN(L)) diagramData[pixelIdx + 1] = L;
            if (!isNaN(R)) diagramData[pixelIdx + 2] = R;
            for(let i = 0; i < 256; i++) {
                const P = (i*512+waveformIdx)<<2;
                waveformData[P] = hasNaN?100:0;
                waveformData[P+1] =
                waveformData[P+2] = 0;
                waveformData[P+3] = 255;
            }
            diagramData[pixelIdx + 3] = 255;
            if (!isNaN(L)) {
                const lowestL = Math.min(255 - this.waveformLast[0], 255 - L);
                const highestL = Math.max(255 - this.waveformLast[0], 255 - L);
                const highlightPixelL = ((255 - L) * 512 + waveformIdx) << 2;
                for (let i = lowestL; i < highestL; i++) {
                    waveformData[(i * 512 + waveformIdx) * 4 + 1] = 128;
                }
                waveformData[highlightPixelL + 1] = 255;
            }
            if (!isNaN(R)) {
                const lowestR = Math.min(255 - this.waveformLast[1], 255 - R);
                const highestR = Math.max(255 - this.waveformLast[1], 255 - R);
                const highlightPixelR = ((255 - R) * 512 + waveformIdx) << 2;
                for (let i = lowestR; i < highestR; i++) {
                    const P = (i * 512 + waveformIdx) << 2;
                    waveformData[P] =
                        waveformData[P + 2] = 128;
                }
                waveformData[highlightPixelR] =
                    waveformData[highlightPixelR + 2] = 255;
            }
            this.waveformLast = [isNaN(L) ? this.waveformLast[0] : L, isNaN(R) ? this.waveformLast[1] : R];
        }
        // console.log(diagramImageData);
        diagramCtx.putImageData(diagramImageData, 0, 0);
        waveformCtx.putImageData(waveformImageData, 0, 0);
        const arr = new Uint8Array(this.analyserNode!.frequencyBinCount);
        frequencyCtx.fillStyle = "#000000";
        frequencyCtx.fillRect(0, 0, 512, 256);
        frequencyCtx.fillStyle = "#ffffff";
        this.analyserNode!.getByteFrequencyData(arr);
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

    initData() {
        if (window.location.hash && window.location.hash !== '#') {
            this.elements.data!.value = window.location.hash.replace('#', '');
            this.loadData();
        }
    }

    onVisualSelectChange(v: 'W' | 'D' | 'F' | 'A') {
        switch (v) {
            case 'W':
                this.elements.canvasWaveform!.classList.remove('hide');
                this.elements.canvasDiagram!.classList.add('hide');
                this.elements.canvasFFT!.classList.add('hide');
                break;
            case 'D':
                this.elements.canvasWaveform!.classList.add('hide');
                this.elements.canvasDiagram!.classList.remove('hide');
                this.elements.canvasFFT!.classList.add('hide');
                break;
            case 'F':
                this.elements.canvasWaveform!.classList.add('hide');
                this.elements.canvasDiagram!.classList.add('hide');
                this.elements.canvasFFT!.classList.remove('hide');
                break;
            case 'A':
                this.elements.canvasWaveform!.classList.remove('hide');
                this.elements.canvasDiagram!.classList.remove('hide');
                this.elements.canvasFFT!.classList.remove('hide');
                break;
        }
    }

    getElementsById() {
        this.elements.samplerate = document.getElementById('samplerate') as typeof this.elements.samplerate;
        this.elements.canvasWaveform = document.getElementById('waveform') as typeof this.elements.canvasWaveform;
        this.elements.toggleWaveform = document.getElementById('toggle-waveform') as typeof this.elements.toggleWaveform;
        this.elements.canvasDiagram = document.getElementById('diagram') as typeof this.elements.canvasDiagram;
        this.elements.toggleDiagram = document.getElementById('toggle-diagram') as typeof this.elements.toggleDiagram;
        this.elements.canvasFFT = document.getElementById('fft') as typeof this.elements.canvasFFT;
        this.elements.toggleFFT = document.getElementById('toggle-fft') as typeof this.elements.toggleFFT;
        this.elements.codeArea = document.getElementById('code-area') as typeof this.elements.codeArea;
        this.elements.error = document.getElementById('error') as typeof this.elements.error;
        this.elements.buttonRewind = document.getElementById('rewind-button') as typeof this.elements.buttonRewind;
        this.elements.buttonReverse = document.getElementById('reverse-button') as typeof this.elements.buttonReverse;
        this.elements.buttonPause = document.getElementById('pause-button') as typeof this.elements.buttonPause;
        this.elements.buttonPlay = document.getElementById('forward-button') as typeof this.elements.buttonPlay;
        this.elements.volumeSlider = document.getElementById('volume-slider') as typeof this.elements.volumeSlider;
        this.elements.soundRangeSelect = document.getElementById('range') as typeof this.elements.soundRangeSelect;
        this.elements.compilationModeSelect = document.getElementById('method') as typeof this.elements.compilationModeSelect;
        this.elements.saveButton = document.getElementById('button-save') as typeof this.elements.saveButton;
        this.elements.loadError = document.getElementById('open-error') as typeof this.elements.loadError;
        this.elements.loadButton = document.getElementById('button-open') as typeof this.elements.loadButton;
        this.elements.dataCreate = document.getElementById('make-data') as typeof this.elements.dataCreate;
        this.elements.dataLoad = document.getElementById('load-data') as typeof this.elements.dataLoad;
        this.elements.data = document.getElementById('data') as typeof this.elements.data;
        this.elements.t = document.getElementById('t') as typeof this.elements.t;
        this.elements.librarySelector = document.getElementById('library-select') as typeof this.elements.librarySelector
    }

    safe(a: string) {
        document.getElementById('safe')!.innerText = a;
        return document.getElementById('safe')!.innerHTML;
    }

    static libraryCodeToString(code: libraryCode) {
        if (Array.isArray(code))
            return code.reduce((a, b) => a + "\n" + b, "");
        return code;
    }

    async generateSongDetails(entry: LibrarySong, entryContainer: HTMLElement) {
        // Name, author
        let res = "";
        if (entry.name) {
            if (entry.url) {
                let url = Array.isArray(entry.url) ? entry.url[0] : entry.url;
                res = `&quot;<a href="${this.safe(url)}" target="_blank">${this.safe(entry.name)}</a>&quot;`;
            }
            else res = `&quot;${this.safe(entry.name)}&quot;`;
        } else if (entry.url) {
            let url = Array.isArray(entry.url) ? entry.url[0] : entry.url;
            res = `(<a href="${this.safe(url)}" target="_blank">Unnamed</a>)`;
        }
        if(Array.isArray(entry.url) && entry.url.length > 1) {
            for(let i = 1; i < entry.url.length; i++) {
                res += `<a href="${this.safe(entry.url[i])}" target="_blank"> [${i+1}]</a>`;
            }
        }

        // Samplerate, mode, stereo
        if (entry.sampleRate && entry.sampleRate !== 8000 || (entry.mode && entry.mode !== soundMode.u8))
            res += " @"
        if (entry.sampleRate && entry.sampleRate !== 8000) res += ` ${entry.sampleRate}Hz`;
        if (entry.stereo) res += ' <span class="stereo-marker1">Ste</span><span class="stereo-marker2">reo</span>';
        if (entry.mode && entry.mode !== soundMode.u8) {
            res += ` <span class="mode-marker-${entry.mode.toLowerCase().replace(/\s/g, '-')}">${this.safe(entry.mode)}</span>`;
        }

        // Description
        if (entry.description) res += `<br>&quot;${this.safe(entry.description)}&quot;`;

        // Remix details and view buttons
        if(entry.remix && entry.remix.length > 0) {
            for(const remix of entry.remix) {
                if(remix.url) {
                    res += `<br>Remix of <a target="_blank" href=${this.safe(remix.url)}>&quot;${this.safe(remix.name)}&quot;`
                    if(remix.author) res += ` by ${this.safe(remix.author)}`;
                    res += '</a>';
                } else {
                    res += `<br>Remix of <span>${this.safe(remix.name)}`;
                    if(remix.author) res += ` by ${this.safe(remix.author)}`;
                    res += '</span>'
                }
                res += ` <button class="library-remix-button" id="${this.currentLibrary}-${entry.hash}-${remix.hash}" title="Open this remix's entry">&gt;</button>`+
                `<div class="library-remix-container hide" id="${this.currentLibrary}-${entry.hash}-${remix.hash}-container"></div>`;
            }
        }

        // Cover details
        if(entry.coverName) {
            if(entry.coverUrl) {
                res += `<br>Cover of <a href=${entry.coverUrl} target="_blank">&quot;${this.safe(entry.coverName)}&quot;</a>`;
            } else {
                res += `<br>Cover of &quot;${this.safe(entry.coverName)}&quot;`;
            }
        }

        // Add the information area if needed
        if (res !== '') {
            let infoSpan = document.createElement('span');
            infoSpan.innerHTML = res;

            // Add functionalty to remix buttons if needed
            if(entry.remix && entry.remix.length > 0) {
                for(const remix of entry.remix) {
                    const button: HTMLButtonElement | null = infoSpan.querySelector("#"+CSS.escape(this.currentLibrary+"-"+entry.hash+"-"+remix.hash));
                    const container: HTMLDivElement | null = infoSpan.querySelector("#"+CSS.escape(this.currentLibrary+"-"+entry.hash+"-"+remix.hash+"-container"));
                    if(button === null || container === null) {
                        console.warn("Elements null!? "+remix.name);
                        continue;
                    }
                    button.addEventListener('click',()=>{
                        if(container.classList.contains("hide")) {
                            button.innerText="<";
                            container.classList.remove("hide");
                            if(!container.hasAttribute("loaded")) {
                                let entry = this.libraryCache.get(this.currentLibrary+"-"+remix.hash);
                                if(entry===undefined) {
                                    container.innerText = "Hang on...";
                                    this.cacheAllLibraryEntries().then(()=>{
                                        entry = this.libraryCache.get(this.currentLibrary+"-"+remix.hash);
                                        if(entry===undefined) {
                                            container.innerText = "This remix isn't in the library.";
                                            return;
                                        } else {
                                            container.innerHTML = "";
                                            this.generateSongDetails(entry,container);
                                            container.setAttribute('loaded','yes');
                                        }
                                    }).catch(error=>{
                                        container.innerText = String(error);
                                    });
                                } else {
                                    this.generateSongDetails(entry,container);
                                    container.setAttribute('loaded','yes');
                                }
                            }
                        } else {
                            button.innerText=">";
                            container.classList.add("hide");
                        }
                    })
                }
            }

            entryContainer.appendChild(infoSpan);
            entryContainer.appendChild(document.createElement('br'));
        }

        // Add inline codes
        const addCodeLink = (text: string, code: libraryCode, SR: number, mode: soundMode, override?: string | null)=>{
            let container = document.createElement('span');
            if (text) {
                if (text) container.innerText = `${text}: `;
            }
            let codeLink = document.createElement('a');
            codeLink.href = "javascript:void(0);"; // The URL will be refused of evalulation, but it'll do nothing anyway
            code = BytebeatSystem.libraryCodeToString(code);
            codeLink.setAttribute('code', code);
            codeLink.setAttribute('rate', SR.toString());
            codeLink.setAttribute('mode', mode);
            codeLink.addEventListener('click', ()=>{
                this.loadCode(codeLink);
            })
            codeLink.classList.add("code");
            codeLink.innerText = override ?? code;
            container.appendChild(codeLink);
            entryContainer.appendChild(container);
            entryContainer.appendChild(document.createElement('br'));
        }

        if (entry.codeMin) {
            addCodeLink('Minified', entry.codeMin, entry.sampleRate ?? 8000, entry.mode ?? soundMode.u8);
        }

        if (entry.code) {
            addCodeLink(entry.code ? 'Original' : '', entry.code, entry.sampleRate ?? 8000, entry.mode ?? soundMode.u8, entry.codeMin ? `${BytebeatSystem.libraryCodeToString(entry.code).length - BytebeatSystem.libraryCodeToString(entry.codeMin).length}c more` : null)
        }

        if (entry.codeForm) {
                addCodeLink('Formatted', entry.codeForm, entry.sampleRate ?? 8000, entry.mode ?? soundMode.u8, entry.code ?  `${BytebeatSystem.libraryCodeToString(entry.codeForm).length - BytebeatSystem.libraryCodeToString(entry.code).length}c more`:null);
        }

        // Add file load buttons
        if (entry.fileOrig || entry.fileMin || entry.fileForm) {
            let buttonRow = document.createElement('div');
            buttonRow.classList.add("flex");
            const addCodeLink=(text: string, file: string, SR: number, mode?: soundMode)=>{
                let button = document.createElement('button');
                button.setAttribute('file', file);
                button.setAttribute('rate', SR.toString(10));
                button.setAttribute('mode', mode ?? soundMode.u8);
                button.addEventListener('click', ()=>{
                    this.loadCodeFromFile(button);
                })
                button.classList.add("library-codebutton");
                button.innerText = text;
                buttonRow.appendChild(button);
            }

            if (entry.fileMin) {
                addCodeLink("Minified "+formatBytes(entry.codeMinLen??0), libraryLinks[this.currentLibrary].songs+`minified/${entry.hash}.js`, entry.sampleRate ?? 8000, entry.mode ?? soundMode.u8);
            }

            if (entry.fileOrig) {
                addCodeLink("Original "+formatBytes(entry.codeLen??0), libraryLinks[this.currentLibrary].songs+`original/${entry.hash}.js`, entry.sampleRate ?? 8000, entry.mode ?? soundMode.u8);
            }

            if (entry.fileForm) {
                addCodeLink("Formatted "+formatBytes(entry.codeFormLen??0), libraryLinks[this.currentLibrary].songs+`formatted/${entry.hash}.js`, entry.sampleRate ?? 8000, entry.mode ?? soundMode.u8);
            }
            entryContainer.appendChild(buttonRow);
        }
    }

    createData() {
        let D = this.elements.data!;
        D.value = "DOLLBOX:";
        D.value += `${this.SR}:`;
        D.value += `${this.elements.soundRangeSelect!.value}:`;
        D.value += `${this.elements.compilationModeSelect!.value}:`;
        D.value += btoa(this.elements.codeArea!.value);
        window.location.hash = D.value;
    }

    loadData() {
        let Z = this.elements.data!.value.trim();
        Z = Z.replace('DOLLBOX:', '');
        const SR = +(Z.match(/\d+/)??"8000");
        Z = Z.replace(/\d+/, '');
        const codeSoundRange = (Z.match(/\w+(?=:)/)??soundRange.u8)[0] as soundRange;
        Z = Z.replace(/\w+:/, '');
        const codeCompilationMethod = (Z.match(/\w+(?=:)/)??compilationMethod.expression)[0] as compilationMethod;
        Z = Z.replace(/\w+:/, '');
        this.loadCodeBase(atob(Z.slice(1)), SR, codeSoundRange, codeCompilationMethod);
    }

    initElements() {
        this.getElementsById();
        this.elements.samplerate!.addEventListener('change', () => {
            this.elements.samplerate!.value = Math.abs(+this.elements.samplerate!.value).toString(10);
            this.elements.samplerate!.value = isNaN(parseFloat(this.elements.samplerate!.value)) ? "8000" : this.elements.samplerate!.value;
            this.SR = parseFloat(this.elements.samplerate!.value);
            this.sendData({ samplerate: this.SR });
        });

        this.elements.codeArea!.addEventListener("keyup", (event) => {
            if (event.isComposing || event.keyCode === 229) {
                return;
            }
            this.elements.error!.innerText = "No error";
            this.sendData({ func: this.elements.codeArea!.value });
        });

        this.elements.buttonRewind!.addEventListener('click', () => {
            this.sendData({ rewind: true });
            let diagramCtx = this.elements.canvasDiagram!.getContext('2d')!;
            diagramCtx.fillStyle = '#ff0000';
            diagramCtx.fillRect(0, 0, 512, 256);
        });

        this.elements.buttonPause!.addEventListener('click', () => {
            this.audioContext!.suspend();
        });

        this.elements.buttonPlay!.addEventListener('click', () => {
            this.sendData({ speed: 1 });
            this.audioContext!.resume();
        });

        this.elements.buttonReverse!.addEventListener('click', () => {
            this.sendData({ speed: -1 });
            this.audioContext!.resume();
        });

        this.elements.volumeSlider!.addEventListener('change', () => {
            this.gainNode!.gain.exponentialRampToValueAtTime(parseFloat(this.elements.volumeSlider!.value) / 100 + 0.01, 0.1);
        });

        this.elements.toggleWaveform!.addEventListener('change', () => {
            this.elements.canvasWaveform!.classList.toggle('hide', !this.elements.toggleWaveform!.checked);
        });

        this.elements.toggleDiagram!.addEventListener('change', () => {
            this.elements.canvasDiagram!.classList.toggle('hide', !this.elements.toggleDiagram!.checked);
        });

        this.elements.toggleFFT!.addEventListener('change', () => {
            this.elements.canvasFFT!.classList.toggle('hide', !this.elements.toggleFFT!.checked);
        });

        this.elements.soundRangeSelect!.addEventListener('change', () => {
            this.sendData({ mode: this.elements.soundRangeSelect!.value });
        })

        this.elements.compilationModeSelect!.addEventListener('change', () => {
            this.sendData({ compileUsing: this.elements.compilationModeSelect!.value, func: this.elements.codeArea!.value });
            this.elements.error!.innerText = "No error";
        })

        document.getElementById('lag-button')!.addEventListener('click', () => {
            this.audioContext!.suspend();
            setTimeout(() => { this.audioContext!.resume(); }, 250);
        });

        this.elements.dataCreate!.addEventListener('click', () => { this.createData() });
        this.elements.dataLoad!.addEventListener('click', () => { this.loadData() });

        this.elements.librarySelector!.addEventListener('change', ()=>{
            const library = this.elements.librarySelector!.value as libraryOption;
            this.currentLibrary = library;
            const selections = document.getElementsByClassName('library-selection');
            for(let i = 0; i < selections.length; i++) {
                const selection = selections.item(i)! as HTMLDivElement;
                const selectionLibrary = selection.id.replace('library-','');
                if(library===selectionLibrary) {
                    selection.classList.remove("hide");
                } else {
                    selection.classList.add("hide");
                }
            }
        })

        // Obsolete in Tauri
        // this.elements.loadButton!.addEventListener('click', async () => {
        //     const data = await window.elecAPI.load();
        //     console.log(data);
        //     if (data.error) {
        //         this.elements.loadError.innerText = "Error: " + data.error;
        //     } else {
        //         const { code, SR, range, method } = data;
        //         this.loadCodeBase(code, SR, range, method)
        //         this.elements.loadError.innerText = "";
        //     }
        // })

        // this.elements.saveButton.addEventListener('click', async () => {
        //     await window.elecAPI.save(this.elements.codeArea.value, this.SR, this.elements.soundRangeSelect.value, this.elements.compilationModeSelect.value);
        // })

        let libraries = document.getElementsByClassName('library-part');
        for (let i = 0; i < libraries.length; i++) {
            let header = libraries.item(i)!;
            header.addEventListener('toggle', () => {
                if (header.getAttribute('loaded') == null) {
                    header.setAttribute('loaded', "true");
                    let loading = header.querySelector('.loading')!;
                    header.querySelector('.library-errortext')?.remove();
                    loading.classList.remove('hide');
                    let article = header.querySelector('.library-content')!;
                    let path = article.id.replace(/.+?--/g, '');
                    let list = document.createElement('ul');
                    article.appendChild(list);
                    tauriFetch(libraryLinks[header.getAttribute('library')! as libraryOption].library+`${path}.gz`, { cache: 'no-cache' }).then(data => {
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
                        let odd = 0;
                        data.bytes().then(async(A) => {
                            const authors = JSON.parse(pako.ungzip(A, { to: 'string' }));
                            for(const _author of authors) {
                                const author = _author as LibraryAuthor;
                                const { songs } = author;
                                const box = document.createElement('li');
                                box.classList.add('library-author-container-'+(odd+1));
                                const label = document.createElement('span');
                                const songList = document.createElement('ul');
                                for(let song of songs) {
                                    this.libraryCache.set(this.currentLibrary+"-"+song.hash,song);
                                    const listEntry = document.createElement('li');
                                    listEntry.classList.add("library-entry");
                                    this.generateSongDetails(song,listEntry);
                                    songList.appendChild(listEntry);
                                }
                                label.innerText=author.author||"<no author>";
                                box.appendChild(label);
                                if(songs.length > 5) {
                                    const details = document.createElement('details');
                                    details.classList.add("library-hidden");
                                    const summary = document.createElement('summary');
                                    summary.innerText = `${songs.length} songs`;
                                    details.appendChild(summary);
                                    details.appendChild(songList);
                                    box.appendChild(details);
                                } else {
                                    box.appendChild(songList);
                                }
                                list.appendChild(box);
                                odd = 1 - odd;
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

    cacheAllLibraryEntries() {
        return new Promise<void>((resolve,reject)=>{
            tauriFetch(libraryLinks[this.currentLibrary].all, { cache: 'no-cache' }).then(data => {
                if (!data.ok) {
                    console.error("Couldn't cache all of the library entries due to status code "+data.status);
                    reject("HTTP "+data.status);
                    return;
                }
                data.bytes().then(async(A) => {
                    const authors = JSON.parse(pako.ungzip(A, { to: 'string' }));
                    for(const _author of authors) {
                        const author = _author as LibraryAuthor;
                        const { songs } = author;
                        for(const song of songs) {
                            this.libraryCache.set(this.currentLibrary+"-"+song.hash,song);
                        }
                    }
                    resolve();
                });
            });
        })
    }

    async initAudio() {
        this.audioContext = new AudioContext({ sampleRate: 48000 });
        await this.audioContext.audioWorklet.addModule('sound-gen.js');
        this.audioNode = new AudioWorkletNode(this.audioContext, 'sound-gen', { outputChannelCount: [2] });
        this.audioNode.port.addEventListener('message', e => this.receiveData(e.data));
        this.audioNode.port.start();
        this.analyserNode = new AnalyserNode(this.audioContext, { fftSize: 1024 });
        this.gainNode = new GainNode(this.audioContext, { gain: 0.5 });
        this.audioNode.connect(this.analyserNode);
        this.analyserNode.connect(this.gainNode);
        this.gainNode.connect(this.audioContext.destination);
    }

    setSampleRate(sr: number) {
        this.SR = sr;
        this.sendData({ samplerate: this.SR });
        this.elements.samplerate!.value = this.SR.toString();
    }

    loadCodeDollchan(code: string, SR: number, mode: soundMode) {
        let range: soundRange, method: compilationMethod;
        switch (mode.toLowerCase().trim()) {
            case "bytebeat": default:
                range = soundRange.u8;
                method = compilationMethod.expression;
                break;
            case "signed bytebeat":
                range = soundRange.s8;
                method = compilationMethod.expression;
                break;
            case "floatbeat":
                range = soundRange.f;
                method = compilationMethod.expression;
                break;
            case "funcbeat":
                range = soundRange.f;
                method = compilationMethod.statement;
                break;
        }
        this.loadCodeBase(code, SR, range, method);
    }

    loadCodeBase(code: string, SR: number, range: soundRange, method: compilationMethod) {
        this.setSampleRate(SR);
        this.elements.codeArea!.value = code;
        this.elements.soundRangeSelect!.value = range;
        this.elements.compilationModeSelect!.value = method;
        this.sendData({ func: code, rewind: true, speed: 1, mode: range, compileUsing: method });
        let diagramCtx = this.elements.canvasDiagram!.getContext('2d');
        diagramCtx!.fillStyle = '#ff0000';
        diagramCtx!.fillRect(0, 0, 512, 256);
        this.audioContext!.resume();
        this.elements.error!.innerText = "No error";
    }

    loadCode(elem: HTMLSpanElement) {
        let SR = Math.abs(parseFloat(elem.getAttribute('rate')??"0"))||8000;
        let C = elem.getAttribute('code')??"//Error loading: code undefined\nt";
        let M = (elem.getAttribute('mode')??soundMode.u8) as soundMode;

        this.loadCodeDollchan(C, SR, M);
    }

    loadCodeFromFile(elem: HTMLSpanElement) {
        let oldText = elem.innerText;
        elem.innerText = "Loading..."
        let SR = parseFloat(elem.getAttribute('rate')??"0")||8000;
        let F = elem.getAttribute('file');
        if(F===null) {
            return console.error("Load code with null file");
        }
        let M = (elem.getAttribute('mode')??soundMode.u8) as soundMode;

        tauriFetch(F, { cache: "no-cache" }).then(data => {
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

    receiveData(data: any) {
        if (data.samples) {
            this.visualiserPoints = this.visualiserPoints.concat(data.samples);
            // console.log(this.visualiserPoints.length);
        }
        if (data.compileFail) this.elements.error!.innerText = data.compileFail;
        if (data.runtimeFail) this.elements.error!.innerText = "{{" + data.runtimeFail.t + "}} " + data.runtimeFail.body;
        if (data.t) this.elements.t!.innerText = data.t;
    }

    sendData(data: any) {
        this.audioNode!.port.postMessage(data);
    }
}

console.log("Script has loaded!");

const bytebeat = new BytebeatSystem();
console.log("BytebeatSystem sucessfully created");

async function afterDOM() {
    let status = document.getElementById('loading-status')!;
    status.innerText = "DOM initialized\n";
    console.log("DOM initialized");
    let deletes = document.getElementsByClassName('delete-on-load');
    let l = deletes.length;
    for (let i = 0; i < l; i++) {
        try {
            deletes.item(0)!.remove();
        } catch { break; }
    };
    status.innerText += "delete-on-load elements deleted\n";
    console.log("delete-on-load elements deleted");
    bytebeat.initElements();
    status.innerText += "Element list initialized\n";
    console.log("Element list initialized");
    bytebeat.initData();
    status.innerText += "Link loaded (if there was one)\n";
    console.log("Link loaded (if there was one)");
    requestAnimationFrame(_ => (bytebeat.renderer()));
    console.log("Rendering started");
    console.log("The DOLLBOX frontend is now active!");
    status.remove();
}

bytebeat.initAudio().then(()=>{
    console.log("Audio initialized, waiting for DOM if needed");
    if (document.readyState == 'loading') {
        document.addEventListener('DOMContentLoaded', afterDOM);
    } else afterDOM();
});

