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

  if (message.action === "processImages") {
    const selector = message.selector;
    downloadImagesBySelector(selector);
  }
});

function downloadImagesBySelector(selector) {
  const images = Array.from(document.querySelectorAll(selector)).map(
    (img) => img.src
  );

  images.forEach((src) => {
    chrome.runtime.sendMessage({
      action: "downloadImage",
      url: src,
    });
  });
}
