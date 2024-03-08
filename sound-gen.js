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

class AudioProcessor extends AudioWorkletProcessor {
    constructor(...a) {
        super(...a);
        this.subt = this.t = 0;
        this.sampleContextRate = sampleRate;
        this.samplerate = 8000;
        this.visualiserBuffer = [];
        this.lastSample = 0;
        this.lastCalculation = 0;
        this.func = null;
        this.speed = 1;
        this.soundMode = 'regular';
        this.compilationMode = 'normal';
        Object.seal(this);
        AudioProcessor.deleteGlobals();
        AudioProcessor.freezeGlobals();
        this.func = t => t * ((t >> 12 | t >> 8) & 63 & t >> 4);
        this.port.onmessage = (e) => this.receiveData(e.data);
        this.port.start();
    }

    static deleteGlobals() { // Prevent persistent variable errors
        for (const name in globalThis) {
            if (Object.prototype.hasOwnProperty.call(globalThis, name)) {
                delete globalThis[name];
            }
        }
    }

    static freezeGlobals() {
        Object.getOwnPropertyNames(globalThis).forEach(name => {
            const prop = globalThis[name];
            const type = typeof prop;
            if ((type === 'object' || type === 'function') && name !== 'globalThis') {
                Object.freeze(prop);
            }
            if (type === 'function' && Object.prototype.hasOwnProperty.call(prop, 'prototype')) {
                Object.freeze(prop.prototype);
            }
            Object.defineProperty(globalThis, name, { writable: false, configurable: false });
        });
    }

    process(inputs, outputs, parameters) {
        const L = outputs[0][0].length;
        let runtimeFail = undefined;
        let getAudioValue;
        switch (this.soundMode) {
            case 'regular':
            default:
                getAudioValue = t => {
                    return (t & 255) / 127.5 - 1;
                }
                break;
            case 'signed':
                getAudioValue = t => {
                    return ((t + 128) & 255) / 127.5 - 1;
                }
                break;
            case 'float':
                getAudioValue = t => {
                    return Math.max(-1, Math.min(1, t));
                }
                break;
        };
        for (let i = 0; i < L; i++) {
            this.subt++;
            let o = NaN;
            if (this.subt >= Math.max(1, (this.sampleContextRate / this.samplerate / Math.abs(this.speed)))) {
                this.subt -= Math.max(1, (this.sampleContextRate / this.samplerate / Math.abs(this.speed)));
                let t = Math.floor(this.t);
                try {
                    if (this.compilationMode == 'func')
                        o = +this.func(t / this.samplerate, this.samplerate, t);
                    else o = +this.func(t);
                } catch (e) {
                    runtimeFail = { body: e.message, t };
                }
                this.lastCalculation = isNaN(o) ? this.lastCalculation : o;
                this.lastSample = getAudioValue(this.lastCalculation);
                this.visualiserBuffer.push({ t: Math.floor(this.t), o: isNaN(o) ? NaN : this.lastSample * 127.5 + 128 & 255 });
                if (this.visualiserBuffer.length >= (512 * Math.min(1, this.samplerate / 8000))) {
                    this.sendData({ samples: this.visualiserBuffer, runtimeFail, t });
                    runtimeFail = undefined;
                    this.visualiserBuffer = [];
                }
                this.t += Math.max(1, this.samplerate / this.sampleContextRate) * this.speed;
            }
            outputs[0][0][i] = this.lastSample;
        }
        if (runtimeFail) this.sendData(runtimeFail);
        return true;
    }

    sendData(data) {
        this.port.postMessage(data);
    }

    compile(string) {
        AudioProcessor.deleteGlobals();
        let old = this.func;
        let names = Object.getOwnPropertyNames(Math);
        let functions = names.map(k => Math[k]);
        let succeded = false;
        names.push('int', 'window');
        functions.push(Math.floor, globalThis);
        try {
            if (this.compilationMode == 'func') {
                this.func = new Function(...names, string)
                    .bind(globalThis, ...functions);
            } else {
                this.func = new Function(...names, 't', `return 0,\n${string || 0};`)
                    .bind(globalThis, ...functions);
            }
            succeded = true;
        } catch (e) {
            this.func = old;
            this.sendData({ compileFail: e.message });
        }
        try {
            if (this.compilationMode == 'func' && succeded) {
                this.func = this.func();
                if(typeof this.func !== 'function') { // Stop da lag!
                    this.func = t=>t;
                    this.sendData({ runtimeFail: { body: "Funcbeat expression did not return a function", t: 0 } })
                }
            }
            this.func(0);
        } catch (e) {
            this.sendData({ runtimeFail: { body: e.message??e, t: 0 } })
        }
    }

    receiveData(data) {
        if (data.samplerate) {
            this.samplerate = data.samplerate;
        }
        if (data.mode) {
            this.soundMode = data.mode;
        }
        if (data.compileUsing) {
            this.compilationMode = data.compileUsing;
        }
        if (data.func) {
            this.compile(data.func);
        }
        if (data.rewind) {
            this.t = 0;
            this.visualiserBuffer = [];
        }
        if (data.speed) this.speed = data.speed;
    }
}

registerProcessor('sound-gen', AudioProcessor);