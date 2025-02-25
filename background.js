// background.js

let timer = {
    duration: 0,       // Total duration (in seconds)
    remaining: 0,      // Remaining time (in seconds)
    intervalId: null,  // Interval identifier for timer updates
    isRunning: false,  // Timer state
    tabId: null        // ID of the tab where the timer was started
};

function startTimer(duration) {
    if (timer.isRunning) return;
    timer.duration = duration;
    timer.remaining = duration;
    timer.isRunning = true;

    timer.intervalId = setInterval(() => {
        if (timer.remaining > 0) {
            timer.remaining--;
            console.log("Time remaining:", timer.remaining, "seconds");
        } else {
            clearInterval(timer.intervalId);
            timer.isRunning = false;
            console.log("Timer completed!");
            showNotification("Timer Finished", "Your timer has completed.");
            closeStartedTab();
        }
    }, 1000);
}

function pauseTimer() {
    if (!timer.isRunning) return;
    clearInterval(timer.intervalId);
    timer.isRunning = false;
    console.log("Timer paused at", timer.remaining, "seconds remaining.");
}

function resetTimer() {
    clearInterval(timer.intervalId);
    timer.remaining = 0;
    timer.isRunning = false;
    console.log("Timer reset.");
}

function showNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: title,
        message: message
    });
}

function closeStartedTab() {
    if (timer.tabId) {
        console.log("Attempting to close tab with id:", timer.tabId);
        chrome.tabs.remove(timer.tabId, () => {
            if (chrome.runtime.lastError) {
                console.error("Error closing tab:", chrome.runtime.lastError.message);
            } else {
                console.log("Tab closed successfully.");
            }
            timer.tabId = null;
        });
    } else {
        console.error("No stored tab id found.");
    }
}

chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received message:", request);

    if (request.action === "start") {
        // Use chrome.tabs.query to reliably get the active tab
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (tabs && tabs.length > 0) {
                timer.tabId = tabs[0].id;
                console.log("Timer started from tab id:", timer.tabId);
            } else {
                console.error("No active tab found.");
            }
            startTimer(request.duration);
            sendResponse({ status: "Timer started" });
        });
        return true; // Keep the message channel open for asynchronous sendResponse
    } else if (request.action === "pause") {
        pauseTimer();
        sendResponse({ status: "Timer paused" });
    } else if (request.action === "reset") {
        resetTimer();
        sendResponse({ status: "Timer reset" });
    } else if (request.action === "getState") {
        sendResponse({
            remaining: timer.remaining,
            isRunning: timer.isRunning
        });
    }
    return true;
});
