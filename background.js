const DEFAULT_MAX_TABS = 10;

// Get current maxTabs setting
function getMaxTabs(callback) {
  chrome.storage.sync.get(
    { maxTabs: DEFAULT_MAX_TABS },
    (items) => {
      callback(items.maxTabs || DEFAULT_MAX_TABS);
    }
  );
}

// Enforce tab limit whenever a new tab is created
chrome.tabs.onCreated.addListener((tab) => {
  getMaxTabs((maxTabs) => {
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > maxTabs) {
        // Try to close the newly created tab
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            // Some tabs (like chrome://) cannot be closed programmatically.
            // In that case, try closing the oldest normal tab.
            closeOldestUserTab(maxTabs);
          }
        });
      }
    });
  });
});

// Helper to close the oldest normal tab if needed
function closeOldestUserTab(maxTabs) {
  chrome.tabs.query({}, (tabs) => {
    if (tabs.length <= maxTabs) return;

    // Filter out special tabs if you want to be safer
    const normalTabs = tabs.filter(
      (t) =>
        t.url &&
        !t.url.startsWith("chrome://") &&
        !t.url.startsWith("edge://") &&
        !t.url.startsWith("chrome-extension://")
    );

    if (normalTabs.length === 0) return;

    // Find the oldest tab by ID, or you could sort by 'index'
    const oldestTab = normalTabs.reduce((oldest, current) => {
      return current.id < oldest.id ? current : oldest;
    });

    chrome.tabs.remove(oldestTab.id);
  });
}
