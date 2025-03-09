// Initialize extension state
chrome.runtime.onInstalled.addListener(() => {
  chrome.storage.sync.get({
    enabled: false,
    fontSize: '16',
    lineHeight: '1.6',
    backgroundColor: 'white',
    textColor: 'black'
  }, (items) => {
    chrome.storage.sync.set(items);
  });
});

// Listen for tab updates to reapply reading mode if enabled
chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
  if (changeInfo.status === 'complete') {
    chrome.storage.sync.get({
      enabled: false
    }, (items) => {
      if (items.enabled) {
        chrome.tabs.sendMessage(tabId, {
          action: 'updateReadingMode',
          preferences: items
        });
      }
    });
  }
}); 