# DOLLBOX
This is a standalone bytebeat player built on Tauri.
The idea is so you can have a working JavaScript player even when offline.

> [!NOTE]
>
> Unlike older Electron versions that worked in-browser, 
> versions From 0.3.0 on use Tauri and TypeScript.
> There is no framework or bundler at the moment.

## Running from the source code

### Make sure you have Tauri!
You can find a quickstart guide at https://v2.tauri.app/start/.

I personally use [Deno](https://deno.com/) and created this project with the Deno template.
Make sure to get that if you don't have it.

Run `deno add -D npm:@tauri-apps/cli@latest` to get Tauri (At lest, this is what I did).

### Instructions
1. Make sure your terminal is within whatever folder you cloned the repo to.

2. `deno task tauri dev`
