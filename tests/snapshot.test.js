const test = require("node:test");
const assert = require("node:assert/strict");
const { buildExtractionPrompt, extractSnapshot } = require("../content/snapshot.js");

test("builds a detailed extraction prompt with the agreed schema and fallbacks", () => {
  const prompt = buildExtractionPrompt();

  assert.match(prompt, /Review the full conversation above/);
  assert.match(prompt, /Do not invent missing information/);
  assert.match(prompt, /Not specified/);
  assert.match(prompt, /up to 15 turns/);
  assert.ok(prompt.indexOf("## 1. PROJECT OVERVIEW") < prompt.indexOf("## 2. ARCHITECTURAL"));
  assert.ok(prompt.indexOf("## 2. ARCHITECTURAL") < prompt.indexOf("## 3. WORK COMPLETED"));
  assert.ok(prompt.indexOf("## 3. WORK COMPLETED") < prompt.indexOf("## 4. IMMEDIATE NEXT STEP"));
});

test("extracts a complete structured snapshot from Gemini's response", () => {
  const response = [
    "Here is the handover:",
    "# [CONTEXT SNAPSHOT & HANDOVER]",
    "## 1. PROJECT OVERVIEW & CORE OBJECTIVE",
    "Build a tracker.",
    "## 2. ARCHITECTURAL & DESIGN DECISIONS",
    "Not specified",
    "## 3. WORK COMPLETED & CURRENT STATE",
    "Not specified",
    "## 4. IMMEDIATE NEXT STEP",
    "Start implementation.",
    "## RECENT CONVERSATION (up to 15 turns)",
    "..."
  ].join("\n");
  const snapshot = extractSnapshot(response);

  assert.ok(snapshot.startsWith("# [CONTEXT SNAPSHOT & HANDOVER]"));
  assert.match(snapshot, /## 4\. IMMEDIATE NEXT STEP\nStart implementation\./);
});

test("normalizes rendered headings when Gemini's DOM omits Markdown markers", () => {
  const response = [
    "Here is the requested handover:",
    "CONTEXT SNAPSHOT & HANDOVER",
    "1. Project Overview & Core Objective",
    "Build a tracker.",
    "2. Architectural & Design Decisions",
    "Not specified",
    "3. Work Completed & Current State",
    "Login is implemented.",
    "4. Immediate Next Step",
    "Add tests."
  ].join("\n");

  const snapshot = extractSnapshot(response);
  assert.match(snapshot, /^# \[CONTEXT SNAPSHOT & HANDOVER\]/);
  assert.match(snapshot, /## 1\. PROJECT OVERVIEW & CORE OBJECTIVE/);
  assert.match(snapshot, /## 4\. IMMEDIATE NEXT STEP\nAdd tests\./);
  assert.doesNotMatch(snapshot, /Here is the requested handover/);
});

test("rejects empty responses and responses missing required sections", () => {
  assert.throws(() => extractSnapshot(""), /empty extraction response/);
  assert.throws(() => extractSnapshot("I cannot summarize that."), /missing or misordering/);
  assert.throws(() => extractSnapshot("# [CONTEXT SNAPSHOT & HANDOVER]\n## 4. IMMEDIATE NEXT STEP"), /missing or misordering/);
});
