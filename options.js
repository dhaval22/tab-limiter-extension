const DEFAULT_MAX_TABS = 10;

document.addEventListener("DOMContentLoaded", () => {
  const range = document.getElementById("maxTabsRange");
  const numberInput = document.getElementById("maxTabsInput");
  const saveButton = document.getElementById("save");
  const resetButton = document.getElementById("reset");
  const status = document.getElementById("status");
  const currentValue = document.getElementById("currentValue");

  function setUIValue(value) {
    range.value = value;
    numberInput.value = value;
    currentValue.textContent = `Currently set to: ${value} tab${value === 1 ? "" : "s"}.`;
  }

  function showStatus(msg, isError = false) {
    status.textContent = msg;
    status.classList.toggle("error", isError);

    if (!isError && msg) {
      setTimeout(() => {
        status.textContent = "";
      }, 2500);
    }
  }

  // Load saved value
  chrome.storage.sync.get({ maxTabs: DEFAULT_MAX_TABS }, (items) => {
    const value = items.maxTabs || DEFAULT_MAX_TABS;
    setUIValue(value);
  });

  // Slider -> number
  range.addEventListener("input", () => {
    numberInput.value = range.value;
    currentValue.textContent = `Currently set to: ${range.value} tabs.`;
  });

  // Number -> slider
  numberInput.addEventListener("input", () => {
    let value = parseInt(numberInput.value, 10);

    if (isNaN(value)) {
      showStatus("Please enter a valid number.", true);
      return;
    }

    if (value < 1) value = 1;
    if (value > 999) value = 999; // hard upper bound

    numberInput.value = value;

    // Clamp range visually (3–50) but keep real value in storage on save
    if (value < parseInt(range.min, 10)) {
      range.value = range.min;
    } else if (value > parseInt(range.max, 10)) {
      range.value = range.max;
    } else {
      range.value = value;
    }

    currentValue.textContent = `Currently set to: ${value} tabs.`;
    status.textContent = "";
  });

  // Save to storage
  saveButton.addEventListener("click", () => {
    let value = parseInt(numberInput.value, 10);

    if (isNaN(value) || value < 1) {
      showStatus("Please enter a number ≥ 1.", true);
      return;
    }

    chrome.storage.sync.set({ maxTabs: value }, () => {
      showStatus("Saved. New tabs beyond this limit will be closed automatically.", false);
      setUIValue(value);
    });
  });

  // Reset to default
  resetButton.addEventListener("click", () => {
    chrome.storage.sync.set({ maxTabs: DEFAULT_MAX_TABS }, () => {
      setUIValue(DEFAULT_MAX_TABS);
      showStatus("Reset to default (10 tabs).", false);
    });
  });
});
