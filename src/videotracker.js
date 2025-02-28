// // videotracker.js
// // Content script injected into YouTube pages.
//
// function attachVideoListeners(video) {
//     if (!video.dataset.listenerAttached) {
//         video.addEventListener("ended", () => {
//             chrome.runtime.sendMessage({ action: "videoEnded" }, () => {});
//         });
//         video.dataset.listenerAttached = "true";
//     }
// }
//
// function initVideoTracking() {
//     // Attach listeners to any existing <video> elements
//     const videos = document.querySelectorAll("video");
//     videos.forEach(video => attachVideoListeners(video));
//
//     // Use a MutationObserver to handle dynamically added videos
//     const observer = new MutationObserver(mutations => {
//         mutations.forEach(mutation => {
//             mutation.addedNodes.forEach(node => {
//                 if (node.nodeType === Node.ELEMENT_NODE) {
//                     if (node.tagName && node.tagName.toLowerCase() === "video") {
//                         attachVideoListeners(node);
//                     } else {
//                         const nestedVideos = node.querySelectorAll?.("video");
//                         nestedVideos?.forEach(v => attachVideoListeners(v));
//                     }
//                 }
//             });
//         });
//     });
//     observer.observe(document.body, { childList: true, subtree: true });
//
//     // Let background.js know we've activated video tracking
//     chrome.runtime.sendMessage({ action: "videoModeActive" }, () => {});
// }
//
// // Listen for the popup's "startTrackingVideo" message
// chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
//     if (request.action === "startTrackingVideo") {
//         initVideoTracking();
//         sendResponse({ status: "Tracking initiated on this tab." });
//     }
// });
