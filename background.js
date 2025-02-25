// background.js

let timers = {};

// Function to start a timer with a given timerId
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
                // Automatically remove the timer from the list
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
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                const tabId = tabs[0].id;
                const tabTitle = tabs[0].title || `Tab ${tabId}`;
                const timerId = Date.now(); // unique id
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
    }
    return true;
});
