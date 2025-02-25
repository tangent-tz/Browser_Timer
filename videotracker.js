// videoTracker.js

console.log("videoTracker.js loaded on YouTube page");

function attachVideoListeners(video) {
    if (!video.dataset.listenerAttached) {
        video.addEventListener("ended", () => {
            console.log("YouTube video ended, sending message to background.");
            chrome.runtime.sendMessage({ action: "videoEnded" }, (response) => {
                console.log("Response from background on videoEnded:", response);
            });
        });
        video.dataset.listenerAttached = "true";
    }
}

function initVideoTracking() {
    const videos = document.querySelectorAll("video");
    videos.forEach(video => attachVideoListeners(video));
}

chrome.storage.local.get("mode", (result) => {
    if (result.mode === "video") {
        console.log("Video Tracking Mode enabled for YouTube. Attaching video listeners.");
        chrome.runtime.sendMessage({ action: "videoModeActive" }, (response) => {
            console.log("Background response:", response);
        });
        initVideoTracking();

        const observer = new MutationObserver(mutations => {
            mutations.forEach(mutation => {
                mutation.addedNodes.forEach(node => {
                    if (node.nodeType === Node.ELEMENT_NODE) {
                        if (node.tagName.toLowerCase() === "video") {
                            attachVideoListeners(node);
                        } else {
                            const videos = node.querySelectorAll("video");
                            videos.forEach(video => attachVideoListeners(video));
                        }
                    }
                });
            });
        });
        observer.observe(document.body, { childList: true, subtree: true });
    } else {
        console.log("Video Tracking Mode not enabled. Skipping video listener attachment on YouTube.");
    }
});
