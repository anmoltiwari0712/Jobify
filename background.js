// background.js Handles messaging between popup and content script

chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "fillForm") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: "fillForm",
            profile: message.profile,
          },
          (response) => {
            sendResponse(response || { success: false, filled: 0 });
          },
        );
      }
    });

    return true; // keep channel open for async response
  }

  if (message.action === "scanForm") {
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
      if (tabs[0]) {
        chrome.tabs.sendMessage(
          tabs[0].id,
          {
            action: "scanForm",
          },
          (response) => {
            sendResponse(response || { fields: [] });
          },
        );
      }
    });

    return true; // keep channel open for async response
  }
});
