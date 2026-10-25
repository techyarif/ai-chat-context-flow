(function (root) {
  const PROMPT_SELECTORS = [
    "div[contenteditable='true'][role='textbox']",
    "div[contenteditable='true']",
    "textarea"
  ];
  const RESPONSE_SELECTORS = [
    "model-response",
    "[data-message-author-role='assistant']"
  ];
  const SEND_SELECTORS = [
    "button[aria-label*='Send']",
    "button[aria-label*='send']",
    "button[title*='Send']",
    "button[title*='send']",
    "button[data-testid*='send']",
    "button.send-button",
    "button[class*='send-button']"
  ];
  const STOP_SELECTORS = [
    "button[aria-label*='Stop']",
    "button[aria-label*='stop']"
  ];
  const RESPONSE_TIMEOUT_MS = 120000;
  const RESPONSE_STABLE_MS = 1500;

  function findPromptEditor() {
    for (const selector of PROMPT_SELECTORS) {
      const editor = document.querySelector(selector);
      if (editor && isVisible(editor)) {
        return editor;
      }
    }
    return null;
  }

  function findSendButton(editor) {
    let area = editor;
    for (let depth = 0; area && depth < 12; depth += 1, area = area.parentElement) {
      const button = findSendButtonIn(area);
      if (button) {
        return button;
      }
    }

    return findSendButtonIn(document);
  }

  function findSendButtonIn(area) {
    for (const selector of SEND_SELECTORS) {
      const button = area.querySelector(selector);
      if (button && isVisible(button) && !button.disabled) {
        return button;
      }
    }
    return null;
  }

  function waitForSendButton(editor, timeoutMs) {
    const current = findSendButton(editor);
    if (current) {
      return Promise.resolve(current);
    }

    return new Promise((resolve) => {
      const startedAt = Date.now();
      const interval = setInterval(() => {
        const button = findSendButton(editor);
        if (button || Date.now() - startedAt >= timeoutMs) {
          clearInterval(interval);
          resolve(button);
        }
      }, 100);
    });
  }

  function getModelResponses() {
    const selectors = RESPONSE_SELECTORS.join(",");
    const nodes = Array.from(document.querySelectorAll(selectors)).filter(isVisible);
    return nodes.filter((node) => !nodes.some((other) => other !== node && other.contains(node)));
  }

  function getResponseText(node) {
    return (node.innerText || node.textContent || "").trim();
  }

  function isGenerating() {
    return STOP_SELECTORS.some((selector) => {
      const button = document.querySelector(selector);
      return button && isVisible(button);
    });
  }

  function isVisible(element) {
    return Boolean(element.getClientRects().length);
  }

  function waitForPrompt(timeoutMs) {
    const current = findPromptEditor();
    if (current) {
      return Promise.resolve(current);
    }

    return new Promise((resolve, reject) => {
      const observer = new MutationObserver(() => {
        const editor = findPromptEditor();
        if (editor) {
          clearTimeout(timeout);
          observer.disconnect();
          resolve(editor);
        }
      });
      const timeout = setTimeout(() => {
        observer.disconnect();
        reject(new Error("Gemini's prompt editor did not become available."));
      }, timeoutMs);
      observer.observe(document.documentElement, { childList: true, subtree: true });
    });
  }

  async function generateSnapshot(extractionPrompt) {
    const editor = await waitForPrompt(15000);
    const existingText = readEditorText(editor);
    if (existingText.trim()) {
      throw new Error("Clear the source chat's prompt box before requesting a context snapshot.");
    }

    const beforeResponses = getModelResponses();
    const previousCount = beforeResponses.length;
    const previousText = beforeResponses.length
      ? getResponseText(beforeResponses[beforeResponses.length - 1])
      : "";

    insertText(editor, extractionPrompt);
    const sendButton = await waitForSendButton(editor, 3000);
    if (!sendButton) {
      const enterEvent = new KeyboardEvent("keydown", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true,
        cancelable: true
      });
      editor.dispatchEvent(enterEvent);
      editor.dispatchEvent(new KeyboardEvent("keyup", {
        key: "Enter",
        code: "Enter",
        keyCode: 13,
        which: 13,
        bubbles: true
      }));
    } else {
      sendButton.click();
    }

    try {
      const responseText = await waitForCompletedResponse(previousCount, previousText);
      return ContextSnapshot.extractSnapshot(responseText);
    } catch (error) {
      if (readEditorText(editor).trim() === extractionPrompt.trim()) {
        clearEditor(editor);
      }
      throw error;
    }
  }

  function waitForCompletedResponse(previousCount, previousText) {
    return new Promise((resolve, reject) => {
      let lastText = "";
      let stableSince = 0;
      const startedAt = Date.now();
      const interval = setInterval(() => {
        const responses = getModelResponses();
        const latest = responses.length ? getResponseText(responses[responses.length - 1]) : "";
        const isNew = responses.length > previousCount || (latest && latest !== previousText);

        if (isNew && latest && latest === lastText && !isGenerating()) {
          if (!stableSince) {
            stableSince = Date.now();
          } else if (Date.now() - stableSince >= RESPONSE_STABLE_MS) {
            cleanup();
            resolve(latest);
            return;
          }
        } else {
          stableSince = 0;
        }

        lastText = latest;
        if (Date.now() - startedAt >= RESPONSE_TIMEOUT_MS) {
          cleanup();
          reject(new Error("Gemini did not finish the context extraction in time."));
        }
      }, 400);

      function cleanup() {
        clearInterval(interval);
      }
    });
  }

  function readEditorText(editor) {
    return editor instanceof HTMLTextAreaElement
      ? editor.value
      : editor.innerText || editor.textContent || "";
  }

  function insertText(editor, text) {
    let targetEditor = editor;
    if (!targetEditor.isConnected) {
      targetEditor = findPromptEditor();
    }
    if (!targetEditor || !targetEditor.isConnected) {
      throw new Error("Gemini's prompt editor was replaced before the context could be inserted.");
    }
    if (readEditorText(targetEditor).trim()) {
      throw new Error("The prompt box is not empty; refusing to replace its contents.");
    }

    targetEditor.focus();
    if (!targetEditor.isConnected) {
      targetEditor = findPromptEditor();
    }
    if (!targetEditor || !targetEditor.isConnected) {
      throw new Error("Gemini's prompt editor was replaced while preparing the context.");
    }
    if (readEditorText(targetEditor).trim()) {
      throw new Error("The prompt box is not empty; refusing to replace its contents.");
    }

    if (targetEditor instanceof HTMLTextAreaElement) {
      const setter = Object.getOwnPropertyDescriptor(
        HTMLTextAreaElement.prototype,
        "value"
      ).set;
      setter.call(targetEditor, text);
    } else {
      const ownerDocument = targetEditor.ownerDocument;
      const selection = ownerDocument.getSelection();
      if (!selection || !targetEditor.isConnected) {
        throw new Error("Gemini's prompt editor is not attached to the active document.");
      }
      try {
        selection.collapse(targetEditor, targetEditor.childNodes.length);
      } catch (error) {
        throw new Error("Gemini replaced its prompt editor while the context was being inserted.");
      }
      if (!targetEditor.isConnected) {
        throw new Error("Gemini replaced its prompt editor while the context was being inserted.");
      }
      if (!ownerDocument.execCommand("insertText", false, text)) {
        throw new Error("Gemini did not accept the text in its prompt editor.");
      }
    }

    targetEditor.dispatchEvent(new InputEvent("input", {
      bubbles: true,
      inputType: "insertText",
      data: text
    }));
    targetEditor.focus();
  }

  function clearEditor(editor) {
    if (editor instanceof HTMLTextAreaElement) {
      editor.value = "";
    } else {
      editor.replaceChildren();
    }
    editor.dispatchEvent(new InputEvent("input", { bubbles: true, inputType: "deleteContent" }));
  }

  root.GeminiDom = { findPromptEditor, generateSnapshot, insertText, waitForPrompt };
})(globalThis);
