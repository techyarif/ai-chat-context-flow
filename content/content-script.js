(function () {
  const FLOW_BUTTON_ID = "context-flow-button";
  const PAGE_REFRESH_DELAY_MS = 150;
  let flowInProgress = false;
  let pageRefreshTimer = null;

  initialize();

  function initialize() {
    mountPageControls();
    observePage();
    tryInsertPendingContext();

    chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
      if (!message || message.type !== "GENERATE_SNAPSHOT") {
        return false;
      }
      GeminiDom.generateSnapshot(ContextSnapshot.buildExtractionPrompt())
        .then((snapshot) => sendResponse({ ok: true, snapshot }))
        .catch((error) => sendResponse({
          ok: false,
          error: error.message || "Gemini could not generate the context snapshot."
        }));
      return true;
    });
  }

  function observePage() {
    const observer = new MutationObserver(() => {
      schedulePageRefresh();
    });
    observer.observe(document.documentElement, { childList: true, subtree: true });
    window.addEventListener("popstate", () => {
      schedulePageRefresh();
    });
    window.addEventListener("hashchange", () => {
      schedulePageRefresh();
    });
  }

  function schedulePageRefresh() {
    if (pageRefreshTimer !== null) {
      return;
    }
    pageRefreshTimer = setTimeout(() => {
      pageRefreshTimer = null;
      mountPageControls();
      tryInsertPendingContext();
    }, PAGE_REFRESH_DELAY_MS);
  }

  function getChatRoute() {
    const path = window.location.pathname.replace(/\/+$/, "");
    if (path === "/app" || path === "") {
      return { kind: "new" };
    }
    if (/^\/app\/[^/]+/.test(path)) {
      return { kind: "existing", url: window.location.href };
    }
    return { kind: "other" };
  }

  function mountPageControls() {
    const editor = GeminiDom.findPromptEditor();
    if (!editor || !editor.parentElement) {
      return;
    }
    const route = getChatRoute();
    if (route.kind === "existing") {
      const buttonParent = editor.parentElement;
      if (!buttonParent) {
        return;
      }
      let flowButton = document.getElementById(FLOW_BUTTON_ID);
      if (flowButton && flowButton.dataset.sourceUrl !== route.url) {
        flowButton.remove();
        flowButton = null;
      }
      flowButton = ContextUi.createButton(
        buttonParent,
        FLOW_BUTTON_ID,
        "Continue this conversation in new chat",
        (event) => handleFlowContext(event.currentTarget)
      );
      placeButtonBesidePromptBar(editor, flowButton);
      flowButton.dataset.sourceUrl = route.url;
    } else {
      document.getElementById(FLOW_BUTTON_ID)?.remove();
    }
  }

  function placeButtonBesidePromptBar(editor, button) {
    const fieldset = editor.closest("fieldset");
    const buttonParent = fieldset?.parentElement;
    if (!fieldset || !buttonParent) {
      button.remove();
      return;
    }

    buttonParent.classList.add("context-flow-input-area");
    fieldset.classList.add("context-flow-reserved-fieldset");
    button.classList.add("context-flow-open-chat-button");
    if (button.parentElement !== buttonParent || button.previousElementSibling !== fieldset) {
      buttonParent.insertBefore(button, fieldset.nextSibling);
    }
  }

  async function handleFlowContext(button) {
    if (flowInProgress) {
      return;
    }
    flowInProgress = true;
    button.disabled = true;
    const previousLabel = button.textContent;
    button.textContent = "Preparing context…";

    try {
      const response = await chrome.runtime.sendMessage({
        type: "FLOW_CURRENT_CHAT",
        sourceTitle: document.title || "Gemini chat"
      });
      if (!response || !response.ok) {
        throw new Error(response && response.error
          ? response.error
          : "Could not generate context from this Gemini conversation.");
      }
    } catch (error) {
      showToast(error.message || "Could not generate context from this Gemini conversation.");
      flowInProgress = false;
      button.disabled = false;
      button.textContent = previousLabel;
    }
  }

  async function tryInsertPendingContext() {
    const editor = GeminiDom.findPromptEditor();
    if (!editor || editor.dataset.contextFlowPendingCheck === "true") {
      return;
    }
    editor.dataset.contextFlowPendingCheck = "true";

    try {
      const response = await chrome.runtime.sendMessage({ type: "GET_PENDING_CONTEXT" });
      if (!response || !response.ok || !response.pending) {
        return;
      }

      GeminiDom.insertText(editor, response.pending.text);
      const acknowledgement = await chrome.runtime.sendMessage({ type: "CONTEXT_INSERTED" });
      if (!acknowledgement || !acknowledgement.ok) {
        throw new Error("The context was inserted, but the one-time handoff could not be cleared.");
      }
    } catch (error) {
      try {
        const cleanup = await chrome.runtime.sendMessage({ type: "CONTEXT_INSERTION_FAILED" });
        if (!cleanup || !cleanup.ok) {
          console.error("Could not clear the failed one-time context.", cleanup && cleanup.error);
        }
      } catch (cleanupError) {
        console.error("Could not clear the failed one-time context.", cleanupError);
      }
      showToast(error.message || "Could not insert the saved context.");
    }
  }

  function showToast(message) {
    let toast = document.getElementById("context-flow-toast");
    if (!toast) {
      toast = document.createElement("div");
      toast.id = "context-flow-toast";
      toast.className = "context-flow-toast";
      toast.setAttribute("role", "status");
      toast.setAttribute("aria-live", "polite");
      document.body.appendChild(toast);
    }
    toast.textContent = message;
    clearTimeout(toast.hideTimer);
    toast.hideTimer = setTimeout(() => toast.remove(), 5000);
  }
})();
