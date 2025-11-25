const DEFAULT_MAX_TABS = 10;
let lastNotificationTime = 0;
const NOTIFICATION_COOLDOWN_MS = 4000; // 4 seconds

// Get current maxTabs setting
function getMaxTabs(callback) {
  chrome.storage.sync.get(
    { maxTabs: DEFAULT_MAX_TABS },
    (items) => {
      callback(items.maxTabs || DEFAULT_MAX_TABS);
    }
  );
}

// Show notification when a tab is blocked
function showBlockedNotification(maxTabs) {
  const now = Date.now();
  if (now - lastNotificationTime < NOTIFICATION_COOLDOWN_MS) {
    return; // avoid spamming notifications
  }
  lastNotificationTime = now;

  chrome.notifications.create({
    type: "basic",
    iconUrl: "icon128.png",
    title: "Tab limit reached",
    message: `You are limited to ${maxTabs} tab${maxTabs === 1 ? "" : "s"}. The new tab was closed.`
  });
}

// Enforce tab limit whenever a new tab is created
chrome.tabs.onCreated.addListener((tab) => {
  getMaxTabs((maxTabs) => {
    chrome.tabs.query({}, (tabs) => {
      if (tabs.length > maxTabs) {
        // Notify before closing
        showBlockedNotification(maxTabs);

        // Try to close the newly created tab
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            // Some tabs like chrome:// cannot be closed.
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

    const normalTabs = tabs.filter(
      (t) =>
        t.url &&
        !t.url.startsWith("chrome://") &&
        !t.url.startsWith("edge://") &&
        !t.url.startsWith("chrome-extension://")
    );

    if (normalTabs.length === 0) return;

    const oldestTab = normalTabs.reduce((oldest, current) => {
      return current.id < oldest.id ? current : oldest;
    });

    chrome.tabs.remove(oldestTab.id);
  });
}
