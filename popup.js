const DEFAULT_MAX_TABS = 10;

document.addEventListener("DOMContentLoaded", () => {
  const openTabsEl = document.getElementById("openTabs");
  const limitEl = document.getElementById("limit");
  const barInner = document.getElementById("barInner");
  const hintEl = document.getElementById("hint");
  const openOptionsButton = document.getElementById("openOptions");

  function updateUI(openTabs, limit) {
    openTabsEl.textContent = openTabs.toString();
    limitEl.textContent = limit.toString();

    const ratio = Math.min(openTabs / limit, 1);
    barInner.style.width = (ratio * 100).toFixed(0) + "%";

    if (openTabs > limit) {
      hintEl.textContent = "Limit exceeded. New tabs will be closed.";
    } else if (ratio > 0.85) {
      hintEl.textContent = "You are close to the limit.";
    } else {
      hintEl.textContent = "You are within the limit.";
    }
  }

  // Load current limit from storage
  chrome.storage.sync.get({ maxTabs: DEFAULT_MAX_TABS }, (items) => {
    const limit = items.maxTabs || DEFAULT_MAX_TABS;

    chrome.tabs.query({}, (tabs) => {
      const openTabs = tabs.length;
      updateUI(openTabs, limit);
    });
  });

  openOptionsButton.addEventListener("click", () => {
    if (chrome.runtime.openOptionsPage) {
      chrome.runtime.openOptionsPage();
    } else {
      window.open(chrome.runtime.getURL("options.html"));
    }
  });
});
