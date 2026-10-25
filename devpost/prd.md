---
doc: prd
status: approved
---

# AI Chat Context Flow — Product Requirements

A Chrome extension for Gemini that lets a user carry context from an open conversation into a fresh one with one button, turning a long messy thread into a clean continuation without manual copy-paste and summary prompting.
Source: `scope.md > The Core Loop`, `scope.md > The Unique Kernel`, `scope.md > What "Working" Looks Like`

## The Core Journey

1. A user opens the Gemini conversation they want to continue.
2. Outside the prompt input bar, beside the microphone, they click **Continue this conversation in new chat**.
3. The extension sends its built-in detailed extraction prompt in that same conversation. Gemini generates a `[CONTEXT SNAPSHOT]` response there.
4. The extension reads the completed snapshot and opens a fresh Gemini chat with the snapshot in its prompt box.
5. The user reviews or edits the snapshot, then sends it manually.
6. The fresh chat continues from the project state, decisions, and next step established in the source thread.
7. If extraction or insertion fails, the user gets a warning instead of a broken prompt payload.

## Screens and Layout

The product is a single handoff button attached to an existing Gemini conversation.

- On an existing chat, the **Continue this conversation in new chat** button sits outside the prompt input bar, immediately to its right and vertically aligned with Gemini's microphone icon.
- The fresh Gemini tab is opened only after a snapshot has been generated; its prompt contains editable, unsent text.
- Error state: an amber toast explains extraction or insertion failure.

## Look and Feel

The extension follows a Google Material Design 3 style to match Gemini's native UI.

- **Continue this conversation in new chat**: pill-shaped, full-label button outside the prompt input bar and aligned with the microphone icon
- Type: Gemini-style typography with readable weight and spacing
- States: hover highlight transitions, subtle focus ring, consistent Material hover/pressed motion
- The design should feel native and minimal, not like a custom app bolted onto the page

## Features and Behavior

### Gemini-Generated Snapshot Extraction

When the user clicks the handoff button in an existing Gemini conversation, the extension asks Gemini for the currently available context in that same thread.

- The extension sends its detailed, built-in extraction prompt as a new message in the currently open source Gemini conversation. This modifies that conversation by adding the request and Gemini's response.
- Gemini generates a structured `[CONTEXT SNAPSHOT & HANDOVER]` response covering project objective, architectural/design decisions, work completed/current state, and immediate next step.
- The extraction prompt instructs Gemini to use `Not specified` for details not present in the conversation and to include a sliding window of the latest 10–15 raw turns where useful.
- The extension waits for the response to finish, reads the generated snapshot from the live page DOM, and does not synthesize snapshot fields locally.
- The structured snapshot is inserted into the fresh prompt box as editable text.
- The cursor is focused on the inserted text so the user can inspect or tweak it before sending.

### Flow Context from an Open Thread

The user can trigger the same flow from within an existing conversation.

- On an open chat page, the **Continue this conversation in new chat** button is placed outside the prompt input bar, immediately to its right and vertically aligned with Gemini's microphone icon.
- Clicking it sends the built-in extraction prompt to the current conversation and lets Gemini generate the snapshot in that thread.
- The extraction request and generated response are appended to the source conversation; the user has accepted this side effect for V1.
- After the response completes, the extension stores its snapshot temporarily and opens a fresh Gemini tab.
- The fresh tab detects the pending snapshot and fills it into the prompt box for review.
- The snapshot is a single-use payload and is deleted from local storage after successful insertion.

### Snapshot Format

The built-in extraction prompt asks Gemini to create a clean handoff payload with a consistent structure.

- `# [CONTEXT SNAPSHOT & HANDOVER]`
- `## 1. PROJECT OVERVIEW & CORE OBJECTIVE`
- `## 2. ARCHITECTURAL & DESIGN DECISIONS`
- `## 3. WORK COMPLETED & CURRENT STATE`
- `## 4. IMMEDIATE NEXT STEP`
- Missing or uncertain details use `Not specified`.
- The response includes up to the most recent 15 raw conversation turns as a compact context buffer.

## States and Boundaries

- **Existing source conversation** — the handoff button is available beside the microphone.
- **Successful extraction** — a fresh chat opens with the prompt populated; the user can edit or send it.
- **Failed extraction** — warning toast appears and no destination tab or incomplete snapshot is delivered.
- **Failed rename** — warning toast explains that Gemini could not apply the continuation title.
- **Unreadable or unavailable thread** — the extension fails safely and tells the user to retry.

## Product Decisions

- Gemini-first proof of concept — keeps scope small and avoids spreading the first build across multiple vendors.
- Current-chat handoff — the user starts from the existing Gemini conversation they want to continue; there is no chat picker or persistent chat index.
- Gemini-generated snapshot — the extension sends the extraction prompt in the currently open Gemini conversation and reads Gemini's response. The request and response become additional turns in that source conversation, and normal Gemini processing/network behavior applies.
- Automatic extraction — clicking the existing-chat action submits the detailed extraction request. The resulting continuation prompt in the new chat remains user-reviewed and manually sent.
- User review before send — the prompt is auto-filled but not auto-sent, keeping the user in control of the final message.
- Nothing is guessed when parsing fails — unknown fields are marked clearly rather than invented.

## What We're Building

The proof of concept includes all behaviors needed to demonstrate the core value:

- A Gemini-only Chrome extension
- **Continue this conversation in new chat** on an existing Gemini conversation
- Gemini-generated structured context snapshot from that open conversation
- Automatic opening of a fresh Gemini chat with an editable, unsent snapshot
- Error handling that prevents broken prompt injection

## Deferred From the POC

- ChatGPT support in v2
- Multi-account or cross-user context sync
- Cloud storage or backend services
- Separate Gemini API integration, API key, or external backend
- Automatic sending with no review step
- More advanced context ranking or semantic matching

## Possible Later Enhancements

- Add ChatGPT support and a shared context model
- Support for saved snapshot history with explicit naming
- Better detection of relevant context sections based on topic and workflow tags

## Non-Goals

- Building a full AI assistant or replacing Gemini itself
- Supporting complex multi-account collaboration in the proof of concept
- Creating a separate Gemini API integration or external backend
- Automatically sending the imported context without user confirmation
