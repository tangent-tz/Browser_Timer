import Mellowtel from "mellowtel";

let mellowtel;

// Initialize Mellowtel in the background
(async () => {
    mellowtel = new Mellowtel('14b804d8');
    await mellowtel.initBackground();
})();

// On installation/update, generate and open the opt‑in link.
chrome.runtime.onInstalled.addListener(async (details) => {
    console.log("Extension Installed or Updated");
    try {
        await mellowtel.generateAndOpenOptInLink();
    } catch (error) {
        console.error("Error generating opt-in link:", error);
    }
});

chrome.tabs.onRemoved.addListener((closedTabId, removeInfo) => {
    Object.keys(timers).forEach(timerId => {
        if (timers[timerId].tabId === closedTabId) {
            clearInterval(timers[timerId].intervalId);
            delete timers[timerId];
            console.log(`Timer for tab ${closedTabId} cleared because the tab was closed manually.`);
        }
    });
});

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
    }
}

function resetTimer(timerId) {
    const timerObj = timers[timerId];
    if (timerObj) {
        clearInterval(timerObj.intervalId);
        timerObj.remaining = timerObj.duration;
        timerObj.isRunning = false;
    }
}

function cancelTimer(timerId) {
    if (timers[timerId]) {
        clearInterval(timers[timerId].intervalId);
        delete timers[timerId];
    }
}

function closeTab(tabId) {
    if (!tabId) return;
    chrome.tabs.remove(tabId, () => {
        if (chrome.runtime.lastError) {
            console.error("Error closing tab:", chrome.runtime.lastError.message);
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
// function trackThisTab(tabId, tabTitle) {
//     videoTabs[tabId] = { tabId, tabTitle };
//     showNotification("Video Tracking", `Started tracking video on '${tabTitle}'`);
// }

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

            startTimer(timerId);
            sendResponse({ status: "Timer started", timerId });
        });
        return true;

    } else if (request.action === "pauseTimer") {
        pauseTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} paused` });

    } else if (request.action === "resumeTimer") {
        startTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} resumed` });

    } else if (request.action === "resetTimer") {
        resetTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} reset` });

    } else if (request.action === "cancelTimer") {
        cancelTimer(request.timerId);
        sendResponse({ status: `Timer ${request.timerId} canceled` });

    } else if (request.action === "getTimers") {
        sendResponse({ timers: Object.values(timers) });

    }// else if (request.action === "videoEnded") {
    //     if (sender.tab && sender.tab.id) {
    //         if (videoTabs[sender.tab.id]) {
    //             closeTab(sender.tab.id);
    //             delete videoTabs[sender.tab.id];
    //             sendResponse({ status: `Tab ${sender.tab.id} closed on video end` });
    //         } else {
    //             sendResponse({ status: `Video ended on tab ${sender.tab.id}, but the tab is no longer tracked` });
    //         }
    //     } else {
    //         sendResponse({ status: "No sender tab found" });
    //     }
    //
    //  } else if (request.action === "videoModeActive") {
    //     if (sender.tab && sender.tab.id) {
    //         trackThisTab(sender.tab.id, sender.tab.title || `Tab ${sender.tab.id}`);
    //         sendResponse({ status: "Video tracking active" });
    //     }
    //
    // } else if (request.action === "getVideoTabs") {
    //     sendResponse({ videoTabs: Object.values(videoTabs) });
    //
    // } else if (request.action === "stopTrackingVideo") {
    //     const tabId = request.tabId;
    //     if (videoTabs[tabId]) {
    //         delete videoTabs[tabId];
    //     }
    //     sendResponse({ status: `Stopped tracking tab ${tabId}` });
    // }
});
