# AI Chat Context Flow

A Manifest V3 Chrome extension that carries a structured context snapshot from the current Gemini conversation into a fresh Gemini chat. The destination prompt is inserted for review and is not sent automatically.

## Load the extension

1. Clone or download this repository.
2. Open `chrome://extensions` in Chrome and enable **Developer mode**.
3. Choose **Load unpacked** and select the folder containing `manifest.json`.
4. Open or refresh an existing conversation at `https://gemini.google.com/app`.
5. Click **Continue this conversation in new chat** beside the prompt area.
6. Wait for Gemini to generate the snapshot, then review or edit it in the new chat before sending it yourself.

The source conversation receives the extension's extraction request and Gemini's generated response. The extension needs no API key, backend, or dependency installation. It uses Gemini's page UI and DOM, which may change.

## Test

Requires Node.js. From the repository root, run:

```powershell
node --test
```

## Project guide

See [`devpost/app-map.html`](devpost/app-map.html) for an offline map of the handoff flow and code entry points. The scope, product requirements, technical spec, and build checklist are in `devpost/`. The learner profile is intentionally excluded from the repository.
