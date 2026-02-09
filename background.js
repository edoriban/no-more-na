/**
 * No More NA - Background Service Worker
 * Manages toggle state and badge.
 */

// Set initial state on install
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.local.get('enabled', (result) => {
    if (chrome.runtime.lastError) return;
    const isEnabled = result.enabled !== false;
    chrome.storage.local.set({ enabled: isEnabled });
    updateBadge(isEnabled);
  });
});

// Restore badge when browser starts
chrome.runtime.onStartup.addListener(() => {
  chrome.storage.local.get('enabled', (result) => {
    if (chrome.runtime.lastError) return;
    updateBadge(result.enabled !== false);
  });
});

function updateBadge(isEnabled) {
  chrome.action.setBadgeText({ text: isEnabled ? 'ON' : 'OFF' });
  chrome.action.setBadgeBackgroundColor({
    color: isEnabled ? '#006847' : '#888888'
  });
}

// Listen for messages from popup
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  // Only accept messages from our own extension
  if (sender.id !== chrome.runtime.id) return;

  if (message.type === 'getState') {
    chrome.storage.local.get('enabled', (result) => {
      if (chrome.runtime.lastError) {
        sendResponse({ enabled: true });
        return;
      }
      sendResponse({ enabled: result.enabled !== false });
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'toggle') {
    const newState = Boolean(message.enabled);
    chrome.storage.local.set({ enabled: newState }, () => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false });
        return;
      }
      updateBadge(newState);

      // Notify content scripts in eligible tabs
      chrome.tabs.query({}, (tabs) => {
        for (const tab of tabs) {
          if (!tab.id || tab.id === chrome.tabs.TAB_ID_NONE) continue;
          if (tab.url && (
            tab.url.startsWith('chrome://') ||
            tab.url.startsWith('chrome-extension://') ||
            tab.url.startsWith('edge://') ||
            tab.url.startsWith('about:')
          )) continue;

          chrome.tabs.sendMessage(tab.id, {
            type: 'toggle',
            enabled: newState
          }).catch(() => {});
        }
      });

      sendResponse({ success: true });
    });
    return true;
  }
});
