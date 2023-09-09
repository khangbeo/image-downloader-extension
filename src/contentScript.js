console.log("content script is running");
chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message.action === "getImages") {
    const selector = message.selector;
    const images = Array.from(document.querySelectorAll(selector)).map(
      (img) => img.src
    );

    sendResponse(images);
    return true; // Keeps the message channel open for async operations
  }
});
