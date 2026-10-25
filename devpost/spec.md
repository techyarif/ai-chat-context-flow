---
doc: spec
status: approved
---

# AI Chat Context Flow — Technical Spec

## How This Works, In Plain Language

This is a small Chrome extension written in plain JavaScript. A content script is the part Chrome places into Gemini pages: it adds a detailed extraction request to the open conversation, reads Gemini's completed snapshot response, draws the continuation button, and fills the fresh chat's prompt box. A Manifest V3 service worker coordinates tabs, passes messages, and removes a one-time snapshot from local storage after insertion.

The user starts in the conversation they want to continue. The extension automatically sends an extraction request there; Gemini processes the conversation and adds its request and response as new turns. A generated snapshot is kept briefly in `chrome.storage.local` only while it crosses into a fresh Gemini tab; after successful insertion it is deleted. No chat index, API key, API integration, or backend is used. Gemini's normal network and account processing applies to the extraction. There is no server, framework, or build step.

This approach lets Gemini interpret its own conversation instead of relying on local keyword heuristics. It adds model latency and modifies the source thread; Gemini's page structure can change, so DOM selectors are grouped in one adapter and extraction failures are reported.

## The Core Journey Through the System

PRD ref: `prd.md > The Core Journey`

1. The user opens the Gemini conversation they want to continue.
2. The content script places **Continue this conversation in new chat** outside the prompt input bar, immediately to its right and vertically aligned with the microphone control.
3. When clicked, the service worker asks the content script in that same tab to generate a snapshot. The source conversation gains the extraction request and Gemini's response.
4. The content script waits for a completed Gemini response, validates the structured snapshot, and sends it to the worker. Failure is reported without opening a destination tab.
5. The worker opens a fresh Gemini tab and temporarily stores the snapshot for delivery. The destination content script inserts it into the prompt and acknowledges success; then the worker deletes the single-use snapshot.
6. The user reviews or edits the destination prompt and chooses when to send it. The extension does not submit the continuation prompt automatically.

## Stack

- **JavaScript (Vanilla JS)** — learner-selected for V1: no framework or compile step, and direct access to Gemini's page DOM.
- **Chrome Extension Manifest V3** — learner-approved extension model and service-worker/content-script separation.
- **Chrome Extension APIs** — `chrome.storage.local` for the short-lived transfer payload; `chrome.tabs` for destination tab lifecycle and messaging; built-in content scripts for page access.
- **No third-party packages** — no dependency install or bundler is needed for the POC.

The manifest declares `storage` and `tabs` under `permissions`, and `https://gemini.google.com/*` under `host_permissions` and the content-script match patterns.

Documentation:
- [Manifest V3 overview](https://developer.chrome.com/docs/extensions/develop/migrate/what-is-mv3)
- [Content scripts](https://developer.chrome.com/docs/extensions/develop/concepts/content-scripts)
- [Extension service workers](https://developer.chrome.com/docs/extensions/develop/concepts/service-workers)
- [Chrome Storage API](https://developer.chrome.com/docs/extensions/reference/api/storage)
- [Chrome Tabs API](https://developer.chrome.com/docs/extensions/reference/api/tabs)
- [Chrome extension permissions](https://developer.chrome.com/docs/extensions/develop/concepts/declare-permissions)

Gemini's DOM is not a documented extension API. The exact selectors for chat turns, completed model responses, page title, send control, and prompt editor must be checked against the live Gemini page during the build and kept together in the DOM adapter.

## Where It Runs and How Someone Tries It

- Runs in Google Chrome on the learner's computer; no server, API key, or deployment is needed.
- The extension matches `https://gemini.google.com/*`.
- To load it during development: open `chrome://extensions`, enable **Developer mode**, choose **Load unpacked**, and select the project root folder containing `manifest.json`.
- Open an existing conversation on `https://gemini.google.com/app`, click **Continue this conversation in new chat**, and demonstrate the generated snapshot in the fresh chat before manually sending it.
- For the hackathon submission, record a short demo video and publish the repository on GitHub. Deployment is optional and not part of this extension's run path.

## Look and Feel

Implement the PRD's Google Material Design 3 direction with plain CSS: a pill-shaped **Continue this conversation in new chat** button outside the prompt input bar, immediately to its right and vertically aligned with the microphone control. Use Gemini-compatible light/dark surfaces, readable system typography, clear hover/focus/pressed states, and avoid depending on private Gemini CSS variables as the only source of styling.

PRD ref: `prd.md > Look and Feel`

## Components

### Gemini DOM Adapter

Owns the selectors and logic for detecting a chat page, reading its title, finding the composer and send control, detecting newly completed Gemini responses, and inserting editable text into the destination editor. The adapter must tolerate Gemini's single-page navigation and wait a bounded time for relevant elements. Page mutation work should be rate-limited to avoid repeatedly scanning Gemini's DOM during large renders. It must not overwrite a non-empty source composer or use a partial response.

Implements `prd.md > Gemini-Generated Snapshot Extraction` and `prd.md > Flow Context from an Open Thread`.

### Extraction Prompt and Snapshot Capture

Provides the detailed extraction prompt with the agreed four snapshot headings, instructs Gemini not to invent missing details and to use `Not specified`, and requests up to 15 recent raw turns as a compact buffer. The content script submits this prompt in the source conversation, waits for the response to finish, and captures the resulting snapshot text. The extension does not infer semantic fields from local keywords.

Implements `prd.md > Gemini-Generated Snapshot Extraction` and `prd.md > Snapshot Format`.

### Manifest V3 Service Worker

Coordinates extension messages and tab lifecycle. For **Continue this conversation in new chat**, it requests Gemini-generated extraction from the current source tab, creates a fresh Gemini destination tab, and arranges delivery of the pending payload. It keeps a destination-specific temporary snapshot in local storage until the content script confirms successful prompt insertion, then removes it. Pending data is removed on failure or destination-tab closure.

Implements `prd.md > Gemini-Generated Snapshot Extraction`, `prd.md > Flow Context from an Open Thread`, and `prd.md > States and Boundaries`.

### Gemini Prompt UI and Toasts

Mounts only **Continue this conversation in new chat** outside the prompt input bar on existing chats, aligned with the microphone control. It inserts received snapshots as editable prompt text without sending and displays an amber warning if extraction or insertion fails.

Implements `prd.md > Gemini-Generated Snapshot Extraction`, `prd.md > Flow Context from an Open Thread`, and `prd.md > States and Boundaries`.

## Data Model

All extension data is in `chrome.storage.local`; there is no remote database.

- **Extraction request and generated response** — handled in the source page; the request and Gemini response become additional turns in that conversation. The extension does not persist a separate source transcript.
- **Pending snapshot** — temporary `{ destinationTabId, sourceTitle, text }` transfer data associated with the destination tab. The worker removes it after an insertion-success acknowledgement, a delivery failure, or destination-tab closure. It is not an archive and cannot be recovered after consumption.

The service worker and content scripts exchange typed-by-convention messages with action names and payloads (for example, extract current conversation, deliver snapshot, insertion success, and failure). Validate message shape and tab identity before acting.

## File Structure

```
ai-chat-context-flow/
├── manifest.json                 # MV3 declaration, Gemini match patterns, permissions, scripts
├── background/
│   └── service-worker.js          # Message routing, tab lifecycle, one-time payload cleanup
├── content/
│   ├── content-script.js          # Gemini page entry point and SPA/page readiness
│   ├── gemini-dom.js              # Centralized selectors, chat extraction, prompt insertion
│   ├── snapshot.js                # Detailed Gemini extraction prompt and response validation
│   ├── context-ui.js              # Continue action and toast UI
│   └── styles.css                 # Material-inspired extension UI styles
├── devpost/                       # Learner planning documents; learner profile stays ignored
└── README.md                      # Load-unpacked, test, and short demo instructions
```

Files under `content/` run in the Gemini page and handle all DOM work. The service worker has no page DOM access; it only coordinates tabs, messages, and stored transfer data.

## External Services and Dependencies

- **Gemini website** (`https://gemini.google.com/*`) — receives the extraction request and conversation context through its normal UI. The extension reads Gemini's generated response and fills the destination composer; it makes no separate Gemini API call.
- **Chrome Extension APIs** — local browser APIs (`storage`, `tabs`, content scripts); no API keys, external service accounts, usage charges, or hosted components.

## Important Failure Modes

- **Gemini DOM changes, the source composer is non-empty, or the model response is incomplete** → do not overwrite a draft or use a partial response; show an amber warning and do not open a destination tab.
- **Gemini does not finish the extraction** → leave the destination prompt unchanged and show a warning.
- **Snapshot delivery or insertion fails** → leave no success-shaped state, clear pending handoff data for that destination, and tell the user to retry.

## What Was Simplified and Why

- **Gemini UI prompt rather than a separate Gemini API integration** — avoids API credentials and backend setup while using Gemini's understanding of its own thread; the tradeoff is a model round-trip, normal Gemini network processing, and added turns in the current source chat.
- **Current-conversation handoff instead of a recent-chat picker** — removes persistent chat metadata and lets the user choose the source by opening it directly.
- **One Gemini provider and one Chrome profile** instead of ChatGPT support or cross-account sync — proves the core handoff with fewer page adapters and no backend.
- **Current source tab** for extraction — keeps the operation in the conversation the user explicitly opened.
- **No framework or build pipeline** — keeps installation and iteration simple for a browser-only proof of concept.

## Decisions and Open Issues

### Decisions

- Vanilla JavaScript and Manifest V3 — accepted to keep the extension small and directly interact with Gemini's DOM.
- Content scripts own all Gemini page DOM interactions; the service worker coordinates messages, tabs, and snapshot cleanup.
- Gemini host access plus `storage` and `tabs` permissions are required for the agreed behavior.
- The extension sends no separate API request or transcript to a third-party API endpoint; it submits the extraction request through the currently open Gemini conversation. Gemini processes it under the user's normal account, and the source conversation gains the request and response.
- No chat metadata index or transcript is persisted; transfer snapshots are single-use and deleted after confirmed insertion.
- Have Gemini generate the structured snapshot, use `Not specified` for missing details, and request up to 15 recent raw turns.
- User review and manual sending remain required; the extension never sends the inserted prompt itself.

### Design Rationale

Local DOM heuristics cannot reliably infer project objectives or constraints, so snapshot generation uses a detailed prompt in the current Gemini chat and carries Gemini's structured response into the destination. This improves context interpretation at the cost of a model round-trip and additional turns in the source conversation.

### Open Issues to Verify During Build

- Gemini's live DOM selectors, send button, and response-completion behavior are undocumented and may change. Verify them on the current Gemini UI and keep them isolated in `gemini-dom.js`.
- Confirm prompt insertion into Gemini's current editor and pending-payload cleanup in Chrome.

## Sharing and Demo

- **GitHub repository:** Add the public repository URL here after it is created and verified.
- **Demo video:** Add an accessible video URL here after recording and uploading the working handoff.
- To try the extension locally, follow `Where It Runs and How Someone Tries It`; reviewers can also use the offline `app-map.html`.
