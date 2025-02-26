// background.js

let timers = {};
// Track tabs that are in Video Mode
let videoTabs = {};

// Timer functions (used only in Timer Mode)
function startTimer(timerId) {
    if (!timers[timerId] || timers[timerId].isRunning) return;
    timers[timerId].isRunning = true;
    timers[timerId].intervalId = setInterval(() => {
        if (timers[timerId] && timers[timerId].remaining > 0) {
            timers[timerId].remaining--;
            console.log(`Timer ${timerId} - Time remaining: ${timers[timerId].remaining}s`);
            if (timers[timerId].remaining === 0) {
                clearInterval(timers[timerId].intervalId);
                timers[timerId].isRunning = false;
                console.log(`Timer ${timerId} completed!`);
                showNotification("Timer Finished", `Timer on "${timers[timerId].tabTitle}" has completed.`);
                closeTab(timers[timerId].tabId);
                delete timers[timerId];
            }
        }
    }, 1000);
}

function pauseTimer(timerId) {
    if (timers[timerId] && timers[timerId].isRunning) {
        clearInterval(timers[timerId].intervalId);
        timers[timerId].isRunning = false;
        console.log(`Timer ${timerId} paused at ${timers[timerId].remaining}s`);
    }
}

function resetTimer(timerId) {
    if (timers[timerId]) {
        clearInterval(timers[timerId].intervalId);
        timers[timerId].remaining = timers[timerId].duration;
        timers[timerId].isRunning = false;
        console.log(`Timer ${timerId} reset.`);
    }
}

function cancelTimer(timerId) {
    if (timers[timerId]) {
        clearInterval(timers[timerId].intervalId);
        delete timers[timerId];
        console.log(`Timer ${timerId} canceled.`);
    }
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: title,
        message: message
    });
}

function closeTab(tabId) {
    if (tabId) {
        chrome.tabs.remove(tabId, () => {
            if (chrome.runtime.lastError) {
                console.error("Error closing tab:", chrome.runtime.lastError.message);
            } else {
                console.log("Tab closed successfully:", tabId);
            }
        });
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "start") {
        chrome.storage.local.get("mode", (result) => {
            if (result.mode !== "timer") {
                console.log("Timer start ignored because not in Timer Mode.");
                sendResponse({ status: "Error: Not in Timer Mode" });
                return;
            }
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (tabs && tabs.length > 0) {
                    const tabId = tabs[0].id;
                    const tabTitle = tabs[0].title || `Tab ${tabId}`;
                    const timerId = Date.now();
                    const duration = request.duration;
                    timers[timerId] = {
                        id: timerId,
                        tabId: tabId,
                        tabTitle: tabTitle,
                        duration: duration,
                        remaining: duration,
                        isRunning: false,
                        intervalId: null
                    };
                    console.log(`Starting timer ${timerId} on "${tabTitle}" for ${duration} seconds`);
                    startTimer(timerId);
                    sendResponse({ status: "Timer started", timerId: timerId });
                } else {
                    console.error("No active tab found.");
                    sendResponse({ status: "Error: No active tab" });
                }
            });
        });
        return true;
    } else if (request.action === "pause") {
        const timerId = request.timerId;
        pauseTimer(timerId);
        sendResponse({ status: `Timer ${timerId} paused` });
    } else if (request.action === "reset") {
        const timerId = request.timerId;
        resetTimer(timerId);
        sendResponse({ status: `Timer ${timerId} reset` });
    } else if (request.action === "cancel") {
        const timerId = request.timerId;
        cancelTimer(timerId);
        sendResponse({ status: `Timer ${timerId} canceled` });
    } else if (request.action === "getTimers") {
        sendResponse({ timers: Object.values(timers) });
    } else if (request.action === "videoEnded") {
        // Triggered when a YouTube video ends in Video Mode.
        chrome.storage.local.get("mode", (result) => {
            if (result.mode === "video") {
                if (sender && sender.tab && sender.tab.id) {
                    console.log(`YouTube video ended on tab ${sender.tab.id} in Video Tracking Mode. Closing tab.`);
                    closeTab(sender.tab.id);
                    // Remove from videoTabs tracking
                    delete videoTabs[sender.tab.id];
                    sendResponse({ status: `Tab ${sender.tab.id} closed due to video end` });
                } else {
                    sendResponse({ status: "Error: sender tab not found." });
                }
            } else {
                console.log("VideoEnded event ignored because not in Video Mode.");
                sendResponse({ status: "Not in Video Mode." });
            }
        });
        return true;
    } else if (request.action === "videoModeActive") {
        console.log("Received videoModeActive message from content script.");
        showNotification("Video Mode", "Video Tracking Mode is active.");
        // Store the tab in videoTabs
        if (sender && sender.tab && sender.tab.id) {
            const tabId = sender.tab.id;
            const tabTitle = sender.tab.title || `Tab ${tabId}`;
            videoTabs[tabId] = { tabId, tabTitle };
            console.log("Tracking video on tab:", tabId, tabTitle);
        }
        sendResponse({ status: "Video mode active" });
    } else if (request.action === "getVideoTabs") {
        sendResponse({ videoTabs: Object.values(videoTabs) });
    }
    return true;
});
