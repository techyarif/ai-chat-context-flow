---
doc: scope
status: approved
---

# AI Chat Context Flow

A Chrome extension that helps someone continue an open Gemini conversation in a fresh chat.

## The Unique Kernel
From an open Gemini conversation, click one button and have Gemini generate a detailed handoff snapshot from that conversation using a built-in extraction prompt. The extension carries that snapshot into a fresh chat, avoiding repeated manual prompting and copying.

## Who It's For
People who use AI heavily for coding, project architecture, research, or other ongoing work, and find that long chats become sluggish, messy, or hit context limits.

## The Core Loop
Open the Gemini conversation to continue, click **Continue this conversation in new chat**, let the extension request a snapshot in that conversation, and review Gemini's generated snapshot in the new chat before sending it.

## Inspiration & Identity
Focused on a fast, practical handoff: a few clicks to move from a cluttered long conversation to a clean chat that can continue the work.

## Why This Matters
A concise handoff helps preserve goals, decisions, and current work when continuing an ongoing AI-assisted project or research conversation in a fresh chat.

## What "Working" Looks Like
In a short demo, click **Continue this conversation in new chat** inside an existing Gemini conversation, show the extension request a structured context snapshot in that chat, then carry Gemini's response into a fresh chat for review. The snapshot should cover the project objective, decisions, work/current state, and next step, using `Not specified` when information is missing.

## The POC Boundary
- Build for Gemini first, as a Chrome extension.
- On an existing conversation, provide one **Continue this conversation in new chat** button.
- Ask Gemini in that open source conversation to generate the structured context snapshot, then extract its response from the DOM.
- Carry the snapshot into the fresh chat so the user can continue the work.

## Later
- Add ChatGPT support in v2.

## Explicitly Cut

- ChatGPT support in this proof of concept, to keep the first implementation focused on Gemini.
- Fresh-chat conversation picker, persistent chat index, and clipboard-import action; the user starts the handoff from the source conversation instead.
