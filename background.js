// background.js

let timers = {};    // Store active timers
let videoTabs = {}; // Track which tabs have active video listeners

// ------------------- Timer Functions -------------------
function startTimer(timerId) {
    const timerObj = timers[timerId];
    if (!timerObj || timerObj.isRunning) return;

    timerObj.isRunning = true;
    timerObj.intervalId = setInterval(() => {
        if (timers[timerId]) {
            timerObj.remaining--;
            console.log(`Timer ${timerId} - Remaining: ${timerObj.remaining}s`);
            if (timerObj.remaining <= 0) {
                clearInterval(timerObj.intervalId);
                timerObj.isRunning = false;
                showNotification("Timer Finished", `Timer on "${timerObj.tabTitle}" completed.`);
                closeTab(timerObj.tabId);
                delete timers[timerId];
            }
        }
    }, 1000);
}

function pauseTimer(timerId) {
    const timerObj = timers[timerId];
    if (timerObj && timerObj.isRunning) {
        clearInterval(timerObj.intervalId);
        timerObj.isRunning = false;
        console.log(`Timer ${timerId} paused at ${timerObj.remaining}s`);
    }
}

function resetTimer(timerId) {
    const timerObj = timers[timerId];
    if (timerObj) {
        clearInterval(timerObj.intervalId);
        timerObj.remaining = timerObj.duration;
        timerObj.isRunning = false;
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

function closeTab(tabId) {
    if (!tabId) return;
    chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
            console.error("Error closing tab:", chrome.runtime.lastError.message);
        } else {
            console.log("Tab closed:", tabId);
        }
    });
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: title,
        message: message
    });
}

// ------------------- Video Tracking -------------------
function trackThisTab(tabId, tabTitle) {
    // Mark this tab as "tracked"
    videoTabs[tabId] = { tabId, tabTitle };
    console.log("Now tracking video on tab:", tabId, tabTitle);
    showNotification("Video Tracking", `Started tracking video on '${tabTitle}'`);
}

// ------------------- Message Listener -------------------
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startTimer") {
        // Start a new timer for the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                sendResponse({ status: "No active tab" });
                return;
            }
            const tabId = tabs[0].id;
            const tabTitle = tabs[0].title || `Tab ${tabId}`;
            const duration = request.duration;
            const timerId = Date.now();

            timers[timerId] = {
                id: timerId,
                tabId,
                tabTitle,
                duration,
                remaining: duration,
                isRunning: false,
                intervalId: null
            };

            console.log(`Starting timer ${timerId} on "${tabTitle}" for ${duration} seconds`);
            startTimer(timerId);
            sendResponse({ status: "Timer started", timerId });
        });
        return true;

    } else if (request.action === "pauseTimer") {
        pauseTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} paused` });

    } else if (request.action === "resetTimer") {
        resetTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} reset` });

    } else if (request.action === "cancelTimer") {
        cancelTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} canceled` });

    } else if (request.action === "getTimers") {
        sendResponse({ timers: Object.values(timers) });

    } else if (request.action === "videoEnded") {
        // Close the tab only if it's still in videoTabs (i.e., still being tracked).
        if (sender.tab && sender.tab.id) {
            console.log("Video ended on tab", sender.tab.id);
            if (videoTabs[sender.tab.id]) {
                closeTab(sender.tab.id);
                delete videoTabs[sender.tab.id];
                sendResponse({ status: `Tab ${sender.tab.id} closed on video end` });
            } else {
                console.log(`Video ended on tab ${sender.tab.id}, but it's no longer tracked. Doing nothing.`);
                sendResponse({ status: `Video ended on tab ${sender.tab.id}, but the tab is no longer tracked` });
            }
        } else {
            sendResponse({ status: "No sender tab found" });
        }

    } else if (request.action === "videoModeActive") {
        // The content script tells us it's now tracking video for this tab
        if (sender.tab && sender.tab.id) {
            trackThisTab(sender.tab.id, sender.tab.title || `Tab ${sender.tab.id}`);
            sendResponse({ status: "Video tracking active" });
        }

    } else if (request.action === "getVideoTabs") {
        // Return the array of tracked video tabs
        sendResponse({ videoTabs: Object.values(videoTabs) });

    } else if (request.action === "stopTrackingVideo") {
        // Remove the tab from videoTabs, so it won't be closed if the video ends
        const tabId = request.tabId;
        if (videoTabs[tabId]) {
            delete videoTabs[tabId];
            console.log(`Stopped tracking video on tab ${tabId}.`);
        }
        sendResponse({ status: `Stopped tracking tab ${tabId}` });
    }
});

