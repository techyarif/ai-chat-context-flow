const GEMINI_HOME = "https://gemini.google.com/app";
const PENDING_CONTEXT_KEY = "pendingContext";
const LEGACY_INDEXED_CHATS_KEY = "indexedChats";
const MAX_TAB_READY_MS = 20000;
const MESSAGE_RETRY_MS = 300;

chrome.storage.local.remove(LEGACY_INDEXED_CHATS_KEY).catch((error) => {
  console.error("Could not remove the unused recent-chat index.", error);
});

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (!message || typeof message.type !== "string") {
    return false;
  }

  if (message.type === "FLOW_CURRENT_CHAT") {
    handleFlowCurrentChat(message, sender)
      .then((tab) => sendResponse({ ok: true, tabId: tab.id }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "GET_PENDING_CONTEXT") {
    getPendingContext(sender)
      .then((pending) => sendResponse({ ok: true, pending }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "CONTEXT_INSERTED") {
    clearPendingContext(sender)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  if (message.type === "CONTEXT_INSERTION_FAILED") {
    clearPendingContext(sender)
      .then(() => sendResponse({ ok: true }))
      .catch((error) => sendResponse({ ok: false, error: error.message }));
    return true;
  }

  return false;
});

async function handleFlowCurrentChat(_message, sender) {
  if (!sender.tab || typeof sender.tab.id !== "number") {
    throw new Error("The source Gemini tab could not be identified.");
  }

  const destinationTabId = sender.tab && sender.tab.id;
  normalizeGeminiConversationUrl(sender.tab.url);
  if (sender.tab.status && sender.tab.status !== "complete") {
    await waitForTabComplete(sender.tab.id, MAX_TAB_READY_MS);
  }
  const snapshot = await requestSnapshot(sender.tab.id, sender.tab.title);
  const destination = await chrome.tabs.create({ url: "about:blank", active: true });
  if (typeof destination.id !== "number") {
    throw new Error("Chrome did not create a destination tab.");
  }

  if (destination.id === destinationTabId) {
    throw new Error("The destination must be a new Gemini tab.");
  }

  try {
    const payload = {
      destinationTabId: destination.id,
      sourceTitle: snapshot.sourceTitle,
      text: snapshot.text,
      createdAt: Date.now()
    };
    await chrome.storage.local.set({ [PENDING_CONTEXT_KEY]: payload });
    return await chrome.tabs.update(destination.id, { url: GEMINI_HOME });
  } catch (error) {
    await chrome.storage.local.remove(PENDING_CONTEXT_KEY).catch((cleanupError) => {
      console.error("Could not clear the failed handoff data.", cleanupError);
    });
    await chrome.tabs.remove(destination.id).catch((cleanupError) => {
      console.error("Could not close the failed destination tab.", cleanupError);
    });
    throw error;
  }
}

function normalizeGeminiConversationUrl(value) {
  if (typeof value !== "string") {
    throw new Error("The selected Gemini conversation URL is invalid.");
  }
  let url;
  try {
    url = new URL(value);
  } catch {
    throw new Error("The selected Gemini conversation URL is invalid.");
  }
  if (url.origin !== "https://gemini.google.com" || !/^\/app\/[^/]+/.test(url.pathname)) {
    throw new Error("Choose an existing Gemini conversation, not the new-chat page.");
  }
  return url.href;
}

async function requestSnapshot(sourceTabId, sourceTitle) {
  if (typeof sourceTabId !== "number") {
    throw new Error("The source Gemini tab could not be identified.");
  }
  const result = await sendExtractionRequest(sourceTabId);
  return {
    sourceTitle: typeof sourceTitle === "string" ? sourceTitle : "Gemini conversation",
    text: result.snapshot
  };
}

function waitForTabComplete(tabId, timeoutMs) {
  return new Promise((resolve, reject) => {
    const timeout = setTimeout(() => {
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(new Error("The selected Gemini chat did not finish loading in time."));
    }, timeoutMs);

    function onUpdated(updatedTabId, changeInfo) {
      if (updatedTabId === tabId && changeInfo.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }
    chrome.tabs.onUpdated.addListener(onUpdated);
    chrome.tabs.get(tabId).then((tab) => {
      if (tab.status === "complete") {
        clearTimeout(timeout);
        chrome.tabs.onUpdated.removeListener(onUpdated);
        resolve();
      }
    }).catch((error) => {
      clearTimeout(timeout);
      chrome.tabs.onUpdated.removeListener(onUpdated);
      reject(error);
    });
  });
}

async function sendExtractionRequest(tabId) {
  const startedAt = Date.now();
  let lastError;
  while (Date.now() - startedAt < MAX_TAB_READY_MS) {
    try {
      const response = await chrome.tabs.sendMessage(tabId, { type: "GENERATE_SNAPSHOT" });
      if (!response || !response.ok || typeof response.snapshot !== "string") {
        throw new Error(response && response.error ? response.error : "Gemini could not generate the snapshot.");
      }
      return response;
    } catch (error) {
      if (!String(error.message).includes("Receiving end does not exist")) {
        throw error;
      }
      lastError = error;
      await new Promise((resolve) => setTimeout(resolve, MESSAGE_RETRY_MS));
    }
  }
  throw new Error(lastError
    ? "The context extractor did not become ready in the selected Gemini chat."
    : "The extraction request timed out.");
}

async function getPendingContext(sender) {
  const tabId = sender.tab && sender.tab.id;
  if (typeof tabId !== "number") {
    return null;
  }

  const stored = await chrome.storage.local.get(PENDING_CONTEXT_KEY);
  const pending = stored[PENDING_CONTEXT_KEY];

  if (!pending || pending.destinationTabId !== tabId) {
    return null;
  }

  return pending;
}

async function clearPendingContext(sender) {
  const tabId = sender.tab && sender.tab.id;
  if (typeof tabId !== "number") {
    throw new Error("The destination Gemini tab could not be identified.");
  }

  const stored = await chrome.storage.local.get(PENDING_CONTEXT_KEY);
  const pending = stored[PENDING_CONTEXT_KEY];
  if (pending && pending.destinationTabId === tabId) {
    await chrome.storage.local.remove(PENDING_CONTEXT_KEY);
  }
}

chrome.tabs.onRemoved.addListener((tabId) => {
  chrome.storage.local.get(PENDING_CONTEXT_KEY).then((stored) => {
    const pending = stored[PENDING_CONTEXT_KEY];
    if (pending && pending.destinationTabId === tabId) {
      return chrome.storage.local.remove(PENDING_CONTEXT_KEY);
    }
    return undefined;
  }).catch((error) => {
    console.error("Could not clean up pending context after tab close.", error);
  });
});
