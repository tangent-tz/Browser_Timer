// background.js

let timer = {
    duration: 0,       // Total duration (in seconds)
    remaining: 0,      // Remaining time (in seconds)
    intervalId: null,  // Interval identifier
    isRunning: false   // Whether the timer is currently running
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

// Listen for messages from popup
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    console.log("Background received message:", request);
    if (request.action === "start") {
        startTimer(request.duration);
        sendResponse({ status: "Timer started" });
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
