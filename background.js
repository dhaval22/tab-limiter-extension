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

/**
 * Update the badge text + color to show "used / limit".
 * Recommended: keep it short; we'll show just the count and color by ratio.
 */
function refreshBadge() {
  getMaxTabs((maxTabs) => {
    chrome.tabs.query({}, (tabs) => {
      const openTabs = tabs.length;

      // Badge text: just the number of open tabs
      const text = String(openTabs);
      chrome.action.setBadgeText({ text });

      // Badge color according to how close we are to the limit
      const ratio = maxTabs > 0 ? openTabs / maxTabs : 0;

      let color; // RGB array or hex
      if (openTabs >= maxTabs) {
        // Over limit: red
        color = [239, 68, 68, 255]; // red-500
      } else if (ratio >= 0.8) {
        // Near limit: amber
        color = [245, 158, 11, 255]; // amber-500
      } else {
        // Safe: green
        color = [16, 185, 129, 255]; // emerald-500
      }

      chrome.action.setBadgeBackgroundColor({ color });
    });
  });
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
      const currentCount = tabs.length;

      // Update badge on every creation
      refreshBadge();

      if (currentCount > maxTabs) {
        // Notify before closing
        showBlockedNotification(maxTabs);

        // Try to close the newly created tab
        chrome.tabs.remove(tab.id, () => {
          if (chrome.runtime.lastError) {
            // Some tabs like chrome:// cannot be closed.
            // In that case, try closing the oldest normal tab.
            closeOldestUserTab(maxTabs);
          } else {
            // After actually closing, refresh badge again
            refreshBadge();
          }
        });
      }
    });
  });
});

// When a tab is removed, just refresh the badge
chrome.tabs.onRemoved.addListener(() => {
  refreshBadge();
});

// Helper to close the oldest normal tab if needed
function closeOldestUserTab(maxTabs) {
  chrome.tabs.query({}, (tabs) => {
    if (tabs.length <= maxTabs) {
      refreshBadge();
      return;
    }

    const normalTabs = tabs.filter(
      (t) =>
        t.url &&
        !t.url.startsWith("chrome://") &&
        !t.url.startsWith("edge://") &&
        !t.url.startsWith("chrome-extension://")
    );

    if (normalTabs.length === 0) {
      refreshBadge();
      return;
    }

    const oldestTab = normalTabs.reduce((oldest, current) => {
      return current.id < oldest.id ? current : oldest;
    });

    chrome.tabs.remove(oldestTab.id, () => {
      // After closing, update badge
      refreshBadge();
    });
  });
}

// Refresh badge when extension starts or is installed
chrome.runtime.onInstalled.addListener(() => {
  refreshBadge();
});

chrome.runtime.onStartup.addListener(() => {
  refreshBadge();
});

// Refresh badge if the user changes the limit in Options
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === "sync" && changes.maxTabs) {
    refreshBadge();
  }
});
