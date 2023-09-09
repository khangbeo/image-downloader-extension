// const maxRetries = 5; // Define a maximum number of retry attempts
// const retryDelay = 5000; // Delay between retries (5 seconds)

// // Uncaught SyntaxError: Identifier 'url' has already been declared
// // chrome.downloads.download({ url }, (downloadId) => {
// function downloadImageWithRetry(url, retryCount = 0) {
//   let filename = "DownloadedImages/" + new URL(url).pathname.split("/").pop();

//   chrome.downloads.download({ url: url, filename: filename }, (downloadId) => {
//     if (chrome.runtime.lastError) {
//       if (retryCount < maxRetries) {
//         setTimeout(() => {
//           downloadImageWithRetry(url, retryCount + 1);
//         }, retryDelay);
//       } else {
//         console.error(
//           `Failed to download ${url} after ${maxRetries} attempts.`
//         );
//       }
//       return;
//     }

//     // Monitor download item for failure
//     chrome.downloads.onChanged.addListener(({ id, state }) => {
//       if (
//         id === downloadId &&
//         state &&
//         state.current === "interrupted" &&
//         retryCount < maxRetries
//       ) {
//         setTimeout(() => {
//           downloadImageWithRetry(url, retryCount + 1);
//         }, retryDelay);
//       }
//     });
//   });
// }

// chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
//   if (message.action === "downloadImage") {
//     downloadImageWithRetry(message.url);
//   }
// });
