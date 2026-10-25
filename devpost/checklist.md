---
doc: checklist
status: approved
---

# Build Checklist

Build mode: learn

## Slices

- [x] **1. Flow a current Gemini chat into a fresh, editable handoff**
  Becomes usable: On an open Gemini conversation, the user can trigger **Flow Context**; the extension automatically sends the extraction request in that source chat, waits for Gemini's completed structured snapshot, then opens a fresh Gemini tab with the result ready for review.
  Why now: This delivers the context-handoff kernel immediately while testing the highest-risk assumption—Gemini's live composer, send control, and response-completion DOM—before building the history chooser around it.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Gemini-Generated Snapshot Extraction`, `prd.md > Flow Context from an Open Thread`, `prd.md > Snapshot Format`
  Spec ref: `spec.md > Stack`, `spec.md > Components > Gemini DOM Adapter`, `spec.md > Components > Extraction Prompt and Snapshot Capture`, `spec.md > Components > Manifest V3 Service Worker`, `spec.md > Data Model`, `spec.md > File Structure`, `spec.md > Important Failure Modes`
  Build: Replace local heuristic formatting with a detailed extraction prompt and response validation; submit it automatically only when the source composer is empty; detect and capture the completed Gemini response; then open the destination, insert the snapshot, and clear the one-time payload after acknowledgement. Keep the destination prompt unsent and add built-in Node tests for prompt structure and response validation.
  Verify (mechanical): Run `node --check` on every JavaScript file; run `node --test` for prompt/response tests; parse `manifest.json` and assert MV3, service-worker, Gemini match patterns, and required storage/tabs permissions; inspect the changed-file diff before staging.
  Learner check: Load the extension unpacked, reload it on `chrome://extensions`, then refresh the existing Gemini source tab so the updated content script is injected. Open a conversation with an empty composer and click **Flow Context**. Confirm an extraction request and Gemini response are added to the source thread, then a fresh tab receives an editable snapshot which is not sent automatically; confirm the original source tab remains open.
  Commit: `Add Gemini-generated Flow Context handoff`

- [x] **2. Keeping the current-chat handoff as the only extension action**
  Becomes usable: The existing-chat **Continue this conversation in new chat** button is the only extension action. It requests a snapshot in the open source conversation and opens a fresh chat with editable, unsent context.
  Why now: The learner chose a direct current-chat handoff instead of a fresh-chat selector; removing the unused picker and history index keeps the core action clear and avoids background indexing work.
  PRD ref: `prd.md > The Core Journey`, `prd.md > Gemini-Generated Snapshot Extraction`, `prd.md > Flow Context from an Open Thread`
  Spec ref: `spec.md > The Core Journey Through the System`, `spec.md > Components > Gemini DOM Adapter`, `spec.md > Components > Manifest V3 Service Worker`, `spec.md > Data Model`, `spec.md > Important Failure Modes`
  Build: Remove the fresh-chat selector, dropdown, clipboard-import menu, chat index, and closed-chat selection route. Keep the existing-chat action beside the microphone, request extraction only from its current tab, and deliver the completed snapshot to a fresh tab for review.
  Verify (mechanical): Run `node --check` on every JavaScript file; run all `node --test` extraction tests; parse `manifest.json` and assert MV3, worker/content-script paths, Gemini match patterns, and storage/tabs permissions; search source files for selector/index/import message handlers; inspect `git diff --check`.
  Learner check: Reload the unpacked extension and refresh an existing Gemini conversation. Confirm there is no selector on a fresh chat and only **Continue this conversation in new chat** appears on an existing chat. Click it and verify the source request/response and fresh-chat snapshot handoff still work.
  Commit: `Keep only current-chat handoff`

- [x] **3. Finishing current-chat handoff feedback and Gemini UI**
  Becomes usable: The user receives clear amber warnings for extraction or insertion failures, and the single handoff button remains usable with keyboard focus and Gemini's light/dark appearance.
  Why now: Once the core flow and single-action scope are settled, this adds resilience and final UI polish without reintroducing alternate context-selection paths.
  PRD ref: `prd.md > Look and Feel`, `prd.md > Flow Context from an Open Thread`, `prd.md > States and Boundaries`
  Spec ref: `spec.md > Look and Feel`, `spec.md > Components > Gemini Prompt UI and Toasts`, `spec.md > External Services and Dependencies`, `spec.md > Important Failure Modes`
  Build: Finish accessible amber extraction/insertion warnings, responsive light/dark styling, focus/keyboard behavior, and integrated transfer cleanup.
  Verify (mechanical): Run `node --check` on every JavaScript file; run all `node --test` tests; validate manifest permissions and content-script declarations; inspect staged diffs for unintended files, learner-private context, or credentials before committing.
  Learner check: Try the current-chat handoff and an awkward case such as a non-empty source prompt. Confirm the draft is not overwritten, a useful warning appears when appropriate, and the fresh-chat prompt remains unsent for review.
  Commit: `Polish current-chat handoff UI`

## Hands-on Checkpoints

- [x] Early usable behavior explored — after slice 1, especially automatic extraction in the source chat and prompt insertion into the fresh chat. Learner confirmed the flow worked after reloading the extension and refreshing the Gemini tab.
- [x] Final kick-the-tires exploration and feedback completed — learner reloaded the extension and confirmed the handoff is working as expected; no further changes requested.

## Final Review

- [x] Final review complete — final handoff and UI review had no requested changes; learner explicitly confirms the proof of concept is ready to ship.

## Code Tour and App Map

- [x] Learning activity complete — evidence-based recap of a verified planning/implementation decision, with the reference route in the app map.
- [x] Optional edit and transfer reflection addressed — no optional code edit was needed; transfer reflection was offered and left blank.
- [x] `devpost/app-map.html` generated from finished code and checked; shown as an offline reference map with a project-grounded practice to reuse.

Activity and evidence: Recap of the plan-first verification decision: keep the continuation editable and unsent, check snapshot structure with `node --test`, and have the learner verify the actual handoff in Gemini. The learner confirmed both the earlier handoff behavior and the final polished experience.
Route and stops: Reference map routes through `content/content-script.js > handleFlowContext / tryInsertPendingContext`, `background/service-worker.js > handleFlowCurrentChat`, and `content/snapshot.js > buildExtractionPrompt / extractSnapshot`, with tests in `tests/snapshot.test.js`.
Edit outcome: No optional code edit; the learner explicitly chose to remove continuation-title renaming and retain the existing handoff.
Reflection: Optional transfer reflection offered with the final ship-readiness confirmation and left blank.
Activity mode: Evidence-based recap; no additional code-tour exercise was needed after the hands-on build checks.

## Revisions

- Replaced local heuristic snapshot generation with an automatically submitted detailed prompt in the selected Gemini source chat; Gemini's response becomes the handoff snapshot. The learner explicitly accepted that the source conversation gains the request and response. This adds model latency and normal Gemini processing, so the first slice now verifies composer/send/response handling before history selection.
- Renamed the existing-chat button to **Continue this conversation in new chat** and placed it outside the prompt input bar, immediately to its right and vertically aligned with the microphone control, following learner feedback.
- Restored the fresh-chat selector to **Select Context** near the prompt composer at the learner's request; the existing-chat action retains its separate position beside the microphone.
- Removed the fresh-chat selector and all related functionality at the learner's request: recent-chat indexing/selection, menu UI, clipboard import, and the URL-based extraction route. The existing-chat handoff button is the sole extension action.
- Fixed the worker startup failure by removing its runtime import of the chat-index content script and keeping the metadata validation/cap logic in the worker. Changed prompt insertion to focus the current editor and collapse its selection directly instead of attaching a DOM Range, which Gemini could invalidate during editor replacement.
- Rate-limited content-script page refresh work to one pass per 150 ms while Gemini's DOM changes, reducing repeated full-page DOM checks during initial rendering. Learner confirmed Gemini is no longer lagging.
- Dropped the proposed continuation-title rename after Gemini's current-conversation actions were unavailable during the learner check and the learner asked to keep the existing handoff behavior only.
- Slice 2 learner check completed: learner reloaded the extension and confirmed the current-chat handoff works as expected, with the destination prompt editable and unsent. Mechanical syntax, four extraction tests, manifest checks, and `git diff --check` passed.
- Slice 3 verified with all JavaScript syntax checks, four snapshot tests, MV3 manifest/script/permission validation, no selector/index/import or rename functionality remaining, and `git show --check`; learner confirmed the final handoff UI and behavior were good. No further revisions requested.
