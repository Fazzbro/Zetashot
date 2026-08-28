// OpenShot UI Camera - Background Service Worker (Manifest V3)

chrome.runtime.onInstalled.addListener(() => {
  console.log('OpenShot UI Camera extension installed.');
});

// Listen for messages from popup or content script
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.type === 'CAPTURE_VISIBLE_TAB') {
    chrome.tabs.captureVisibleTab({ format: 'png' }, (dataUrl) => {
      if (chrome.runtime.lastError) {
        sendResponse({ success: false, error: chrome.runtime.lastError.message });
      } else {
        sendResponse({ success: true, dataUrl });
      }
    });
    return true; // Keep channel open for async response
  }

  if (message.type === 'OPEN_STUDIO') {
    chrome.tabs.create({ url: chrome.runtime.getURL('index.html') });
    sendResponse({ success: true });
    return true;
  }
});
