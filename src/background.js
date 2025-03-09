// background.js

// Helper to generate a storage key for a timer.
function getTimerKey(timerId) {
    return "timer_" + timerId;
}

// Start a new timer: store state persistently and schedule an alarm.
function startTimer(timerId, tabId, tabTitle, duration) {
    const startTime = Date.now();
    const targetTime = startTime + duration * 1000;
    const timerObj = {
        timerId,
        tabId,
        tabTitle,
        originalDuration: duration, // original full duration in seconds
        startTime,
        targetTime,
        paused: false
    };
    const key = getTimerKey(timerId);
    chrome.storage.local.set({ [key]: timerObj }, () => {
        console.log("Timer started and saved:", timerObj);
    });
    chrome.alarms.create(timerId, { delayInMinutes: duration / 60 });
    console.log(`Alarm scheduled for timer ${timerId} in ${duration} seconds`);
}

// Pause a timer: calculate remaining time and mark it as paused.
function pauseTimer(timerId, callback) {
    const key = getTimerKey(timerId);
    chrome.storage.local.get(key, (result) => {
        const timerObj = result[key];
        if (!timerObj) {
            console.log(`Timer ${timerId} not found for pause`);
            if (callback) callback();
            return;
        }
        if (timerObj.paused) {
            console.log(`Timer ${timerId} is already paused`);
            if (callback) callback();
            return;
        }
        const remaining = Math.floor((timerObj.targetTime - Date.now()) / 1000);
        timerObj.paused = true;
        timerObj.remaining = remaining; // store remaining seconds
        // Remove targetTime and startTime since it’s paused.
        delete timerObj.startTime;
        delete timerObj.targetTime;
        chrome.storage.local.set({ [key]: timerObj }, () => {
            chrome.alarms.clear(timerId, () => {
                console.log(`Timer ${timerId} paused with ${remaining} seconds remaining`);
                if (callback) callback();
            });
        });
    });
}

// Resume a paused timer: set new startTime and targetTime based on the stored remaining time.
function resumeTimer(timerId, callback) {
    const key = getTimerKey(timerId);
    chrome.storage.local.get(key, (result) => {
        const timerObj = result[key];
        if (!timerObj) {
            console.log(`Timer ${timerId} not found for resume`);
            if (callback) callback();
            return;
        }
        if (!timerObj.paused) {
            console.log(`Timer ${timerId} is not paused; cannot resume`);
            if (callback) callback();
            return;
        }
        const remaining = timerObj.remaining;
        const startTime = Date.now();
        const targetTime = startTime + remaining * 1000;
        timerObj.paused = false;
        timerObj.startTime = startTime;
        timerObj.targetTime = targetTime;
        delete timerObj.remaining;
        chrome.storage.local.set({ [key]: timerObj }, () => {
            chrome.alarms.create(timerId, { delayInMinutes: remaining / 60 });
            console.log(`Timer ${timerId} resumed with ${remaining} seconds remaining`);
            if (callback) callback();
        });
    });
}

// Reset a timer: restore it to its original duration.
function resetTimer(timerId, callback) {
    const key = getTimerKey(timerId);
    chrome.storage.local.get(key, (result) => {
        const timerObj = result[key];
        if (!timerObj) {
            console.log(`Timer ${timerId} not found for reset`);
            if (callback) callback();
            return;
        }
        const duration = timerObj.originalDuration;
        const startTime = Date.now();
        const targetTime = startTime + duration * 1000;
        timerObj.paused = false;
        timerObj.startTime = startTime;
        timerObj.targetTime = targetTime;
        delete timerObj.remaining;
        chrome.storage.local.set({ [key]: timerObj }, () => {
            chrome.alarms.create(timerId, { delayInMinutes: duration / 60 });
            console.log(`Timer ${timerId} reset to ${duration} seconds`);
            if (callback) callback();
        });
    });
}

// Cancel a timer: clear its alarm and remove its stored state.
function cancelTimer(timerId, callback) {
    const key = getTimerKey(timerId);
    chrome.alarms.clear(timerId, () => {
        chrome.storage.local.remove(key, () => {
            console.log(`Timer ${timerId} canceled and removed`);
            if (callback) callback();
        });
    });
}


// When an alarm fires, check the timer state and either expire or reschedule.
chrome.alarms.onAlarm.addListener((alarm) => {
    const timerId = alarm.name;
    const key = getTimerKey(timerId);
    console.log(`Alarm fired for timer ${timerId}`);
    chrome.storage.local.get(key, (result) => {
        const timerObj = result[key];
        if (!timerObj) {
            console.log(`No timer found for ${timerId} on alarm`);
            return;
        }
        if (timerObj.paused) {
            console.log(`Timer ${timerId} is paused; ignoring alarm`);
            return;
        }
        const remaining = Math.floor((timerObj.targetTime - Date.now()) / 1000);
        console.log(`Timer ${timerId}: remaining ${remaining} seconds`);
        if (remaining <= 0) {
            // Timer expired: close the tab.
            chrome.tabs.remove(timerObj.tabId, () => {
                if (chrome.runtime.lastError) {
                    console.error(`Error closing tab ${timerObj.tabId}:`, chrome.runtime.lastError.message);
                } else {
                    console.log(`Tab ${timerObj.tabId} closed.`);
                }
            });
            chrome.storage.local.remove(key, () => {
                console.log(`Timer ${timerId} removed after expiration`);
            });
        } else {
            // Reschedule the alarm for the remaining time.
            chrome.alarms.create(timerId, { delayInMinutes: remaining / 60 });
            console.log(`Rescheduled alarm for timer ${timerId} in ${remaining} seconds`);
        }
    });
});

// Message listener for operations from the popup UI.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startTimer") {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                sendResponse({ status: "No active tab" });
                return;
            }
            const tabId = tabs[0].id;
            const tabTitle = tabs[0].title || `Tab ${tabId}`;
            const duration = request.duration; // in seconds
            const timerId = Date.now().toString();
            // Optionally: Remove any existing timer for this tab.
            startTimer(timerId, tabId, tabTitle, duration);
            sendResponse({ status: "Timer started", timerId });
        });
        return true;
    } else if (request.action === "pauseTimer") {
        pauseTimer(request.timerId, () => {
            sendResponse({ status: `Timer ${request.timerId} paused` });
        });
        return true;
    } else if (request.action === "resumeTimer") {
        resumeTimer(request.timerId, () => {
            sendResponse({ status: `Timer ${request.timerId} resumed` });
        });
        return true;
    } else if (request.action === "resetTimer") {
        resetTimer(request.timerId, () => {
            sendResponse({ status: `Timer ${request.timerId} reset` });
        });
        return true;
    } else if (request.action === "cancelTimer") {
        cancelTimer(request.timerId, () => {
            sendResponse({ status: `Timer ${request.timerId} canceled` });
        });
        return true;
    } else if (request.action === "getTimers") {
        // Retrieve all timer objects stored with keys starting with "timer_".
        chrome.storage.local.get(null, (items) => {
            const timers = [];
            for (let key in items) {
                if (key.startsWith("timer_")) {
                    timers.push(items[key]);
                }
            }
            sendResponse({ timers });
        });
        return true;
    }
});
