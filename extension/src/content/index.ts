import { detectPlatform } from './platformDetector';
import { PlatformAdapter } from './adapterInterface';
import { YouTubeAdapter } from './youtube/YouTubeAdapter';
import { MetaAdapter } from './meta/MetaAdapter';
import { MockAdapter } from './mock/MockAdapter';

console.log('Programming Hero AI Reply Assistant content script loaded.');

let adapter: PlatformAdapter | null = null;
const platform = detectPlatform(window.location.href);

if (platform === 'youtube') {
  adapter = new YouTubeAdapter();
  console.log('PH AI Reply Assistant: YouTube Adapter active.');
} else if (platform === 'meta') {
  adapter = new MetaAdapter();
  console.log('PH AI Reply Assistant: Meta Adapter active.');
} else if (platform === 'mock') {
  adapter = new MockAdapter();
  console.log('PH AI Reply Assistant: Mock Sandbox Adapter active.');
} else {
  console.log('PH AI Reply Assistant: No supported platform detected for URL:', window.location.href);
}

// Listen to messages from popup or sidepanel
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log('Content script received message:', message);
  
  if (!adapter) {
    sendResponse({ success: false, error: 'Platform not supported or adapter not loaded.' });
    return false;
  }
  
  if (message.action === 'detect_platform') {
    sendResponse({ success: true, platform });
    return false;
  }
  
  if (message.action === 'get_current_content') {
    adapter.getCurrentContent()
      .then((content) => {
        sendResponse({ success: true, content });
      })
      .catch((err) => {
        console.error('Failed to get content:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true; // Keep message channel open for async response
  }
  
  if (message.action === 'get_comments') {
    const limit = message.limit || 5;
    adapter.getComments(limit)
      .then((comments) => {
        sendResponse({ success: true, comments });
      })
      .catch((err) => {
        console.error('Failed to get comments:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
  
  if (message.action === 'insert_reply') {
    const { commentId, replyText } = message;
    if (!commentId || !replyText) {
      sendResponse({ success: false, error: 'Missing commentId or replyText' });
      return false;
    }
    
    adapter.insertReply(commentId, replyText)
      .then((success) => {
        sendResponse({ success });
      })
      .catch((err) => {
        console.error('Failed to insert reply:', err);
        sendResponse({ success: false, error: err.message });
      });
    return true;
  }
});
