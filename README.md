# DOLLBOX
This is a bytebeat player built for Electron. The idea is so you can have a working JavaScript player even when offline. I've tested and limited functionality works outside of Electron, which you can access at <https://chasyxx.github.io/dollbox>. If you're planning to develop for the program, I highly reccomend you get this to work in Electron as below, to make sure you don't accidentially break any of the features that work there.

## Running the electtron build
1. Clone the repo: `git clone https://github.com/Chasyxx/dollbox.git` (and change in: `cd dollbox`)
2. `npm i --save-dev`. This will install the needed NPM packages (`pako` and `electron`).
3. `npm start`. If all is well, you'll get a browser window to open up, and the fileloader and "built-in dE library loader" will be visible.

If you don't have an npm command, you need to install Node.JS: <https://nodejs.org/>

If you don't have Electron, get that too: <https://www.electronjs.org/>

As for why the library and file loaders don't show up outside of Electron, a CORS error will cause the library's attempt at loading the [Dollchan](https://dollchan.net/bytebeat/) library to fail, and for the fileloader, a browser can't mess with files on your local system (and if it could, it wouldn't let it happen.)
