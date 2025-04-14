function getTimerKey(timerId) {
    return "timer_" + timerId;
}

// Start a new timer: store state persistently and schedule an alarm.
function startTimer(timerId, tabId, tabTitle, duration, tabFavicon) {
    const startTime = Date.now();
    const targetTime = startTime + duration * 1000;
    const timerObj = {
        timerId,
        tabId,
        tabTitle,
        tabFavicon,  // Store the favicon URL
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

// Show a notification with the given title and message.

function showNotification(title, message) {
    chrome.storage.sync.get("notificationsEnabled", (data) => {
        if (data.notificationsEnabled === false) return;
        chrome.notifications.create({
            type: "basic",
            iconUrl: "icons/icon48.png",
            title: title,
            message: message
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
            showNotification("Timer Finished", `Timer on "${timerObj.tabTitle}" completed.`);
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
            chrome.alarms.create(timerId, { delayInMinutes: remaining / 60 });
            console.log(`Rescheduled alarm for timer ${timerId} in ${remaining} seconds`);
        }
    });
});

// Message listener for operations from the popup UI.
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    if (request.action === "startTimer") {
        // Use provided tab details if available
        if (request.tabId && request.tabTitle) {
            const timerId = Date.now().toString();
            startTimer(timerId, request.tabId, request.tabTitle, request.duration, request.tabFavicon);
            sendResponse({ status: "Timer started", timerId });
        } else {
            // Fallback to querying active tab if not provided
            chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                if (!tabs[0]) {
                    sendResponse({ status: "No active tab" });
                    return;
                }
                const tab = tabs[0];
                const tabId = tab.id;
                const tabTitle = tab.title || `Tab ${tabId}`;
                const tabFavicon = tab.favIconUrl || "icons/timer.svg";
                const timerId = Date.now().toString();
                startTimer(timerId, tabId, tabTitle, request.duration, tabFavicon);
                sendResponse({ status: "Timer started", timerId });
            });
        }
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

// Listen for manual tab closures and clear the associated timer
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.get(null, (items) => {
        // Loop through all stored timer objects
        for (const key in items) {
            if (key.startsWith("timer_")) {
                const timerObj = items[key];
                // If the closed tab matches the timer's tab
                if (timerObj.tabId === tabId) {
                    chrome.alarms.clear(timerObj.timerId, () => {
                        chrome.storage.local.remove(key, () => {
                            console.log(`Timer ${timerObj.timerId} cleared due to manual closure of tab ${tabId}`);
                        });
                    });
                }
            }
        }
    });
});

function updateBadge() {
    // Query for the active tab in the current window.
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return; // No active tab found.
        const activeTab = tabs[0];
        const activeTabId = activeTab.id;

        chrome.storage.local.get(null, (items) => {
            let activeTimer = null;
            for (const key in items) {
                if (key.startsWith("timer_")) {
                    const timer = items[key];
                    // Select the timer if it belongs to the active tab and is not paused.
                    if (timer.tabId === activeTabId && !timer.paused) {
                        activeTimer = timer;
                        break;
                    }
                }
            }
            if (activeTimer) {
                const remaining = activeTimer.targetTime
                    ? Math.max(0, Math.floor((activeTimer.targetTime - Date.now()) / 1000))
                    : activeTimer.remaining || 0;
                // Update the badge if time is remaining; otherwise, clear it.
                if (remaining > 0) {
                    chrome.action.setBadgeText({ text: remaining.toString(), tabId: activeTabId });
                } else {
                    chrome.action.setBadgeText({ text: "", tabId: activeTabId });
                }
            } else {
                // No active timer for this tab – clear the badge.
                chrome.action.setBadgeText({ text: "", tabId: activeTabId });
            }
        });
    });
}

setInterval(updateBadge, 1000);

chrome.tabs.onActivated.addListener(() => {
    updateBadge();
});

// Export functions for testing.
module.exports = {
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    cancelTimer,
    updateBadge
};
