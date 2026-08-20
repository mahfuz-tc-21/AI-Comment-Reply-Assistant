// Chrome Extension Background Service Worker

chrome.runtime.onInstalled.addListener(() => {
  console.log('Programming Hero AI Reply Assistant: Service Worker Installed.');
  
  // Set default settings if not exists
  chrome.storage.local.get(['brandSettings', 'serverUrl'], (result) => {
    if (!result.serverUrl) {
      chrome.storage.local.set({ serverUrl: 'http://localhost:3000' });
    }
  });
});

// Listener for runtime messages
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Background received message:', message);

  // If a content script wants to open the sidepanel programmatically (if API supported)
  if (message.action === 'open_sidepanel') {
    if (chrome.sidePanel && sender.tab?.id) {
      chrome.sidePanel.open({ tabId: sender.tab.id })
        .then(() => sendResponse({ success: true }))
        .catch((err) => {
          console.error('Failed to open sidepanel:', err);
          sendResponse({ success: false, error: err.message });
        });
      return true; // async response
    }
  }

  // Handle messages passed between content scripts and side panel
  // Since sidepanel might be open, it can listen to storage changes or we can broadcast messages
  if (message.action === 'comments_extracted' || message.action === 'content_detected') {
    // Broadcast message to all runtime components (like the side panel)
    chrome.runtime.sendMessage(message);
    sendResponse({ success: true });
    return false;
  }
});
