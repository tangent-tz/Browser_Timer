function getTimerKey(timerId) {
    return "timer_" + timerId;
}

const COMPLETION_ACTION_CLOSE_TAB = "closeTab";
const COMPLETION_ACTION_NOTIFY_ONLY = "notifyOnly";
const WHATS_NEW_VERSION = "1.3.0";
const ONBOARDING_PAGE_PATH = "onboarding.html";

function parseSemver(version) {
    if (typeof version !== "string") {
        return null;
    }
    const match = version.trim().match(/^(\d+)\.(\d+)\.(\d+)(?:\.\d+)?$/);
    if (!match) {
        return null;
    }
    return {
        major: Number(match[1]),
        minor: Number(match[2]),
        patch: Number(match[3])
    };
}

function isVersionLessThan(versionA, versionB) {
    const a = parseSemver(versionA);
    const b = parseSemver(versionB);
    if (!a || !b) {
        return false;
    }
    if (a.major !== b.major) {
        return a.major < b.major;
    }
    if (a.minor !== b.minor) {
        return a.minor < b.minor;
    }
    return a.patch < b.patch;
}

function openOnboardingPage(mode, previousVersion, currentVersion) {
    const params = new URLSearchParams();
    const normalizedMode = mode === "update" ? "update" : "install";
    params.set("mode", normalizedMode);

    if (normalizedMode === "update") {
        if (previousVersion) {
            params.set("from", previousVersion);
        }
        if (currentVersion) {
            params.set("to", currentVersion);
        }
    }

    const onboardingBaseUrl = chrome.runtime && typeof chrome.runtime.getURL === "function"
        ? chrome.runtime.getURL(ONBOARDING_PAGE_PATH)
        : ONBOARDING_PAGE_PATH;

    chrome.tabs.create({
        url: `${onboardingBaseUrl}?${params.toString()}`,
        active: true
    });
}

function normalizeCompletionAction(action) {
    if (action === COMPLETION_ACTION_NOTIFY_ONLY) {
        return COMPLETION_ACTION_NOTIFY_ONLY;
    }
    return COMPLETION_ACTION_CLOSE_TAB;
}

function ensureNotificationsEnabled(callback) {
    chrome.storage.sync.get("notificationsEnabled", (data) => {
        if (data.notificationsEnabled === false) {
            chrome.storage.sync.set({ notificationsEnabled: true }, () => {
                if (callback) callback();
            });
            return;
        }
        if (callback) callback();
    });
}

function createNotification(title, message) {
    chrome.notifications.create({
        type: "basic",
        iconUrl: "icons/icon48.png",
        title: title,
        message: message
    });
}

function startTimer(timerId, tabId, tabTitle, duration, tabFavicon, completionAction) {
    const startTime = Date.now();
    const targetTime = startTime + duration * 1000;
    const normalizedAction = normalizeCompletionAction(completionAction);
    const timerObj = {
        timerId,
        tabId,
        tabTitle,
        tabFavicon,
        originalDuration: duration,
        startTime,
        targetTime,
        paused: false,
        completionAction: normalizedAction
    };

    // notifyOnly timers always fire a notification — no need to modify the toggle

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

function setTimerCompletionAction(timerId, completionAction, callback) {
    const key = getTimerKey(timerId);
    chrome.storage.local.get(key, (result) => {
        const timerObj = result[key];
        if (!timerObj) {
            if (callback) callback("Timer not found");
            return;
        }

        const nextAction = normalizeCompletionAction(completionAction);
        timerObj.completionAction = nextAction;

        const persistAction = () => {
            chrome.storage.local.set({ [key]: timerObj }, () => {
                if (callback) callback(null, timerObj);
            });
        };

        if (nextAction === COMPLETION_ACTION_NOTIFY_ONLY) {
            ensureNotificationsEnabled(persistAction);
            return;
        }
        persistAction();
    });
}

// Show a notification with the given title and message.

function showNotification(title, message) {
    chrome.storage.sync.get("notificationsEnabled", (data) => {
        if (data.notificationsEnabled === false) return;
        createNotification(title, message);
    });
}

function showNotificationEnsuringEnabled(title, message) {
    ensureNotificationsEnabled(() => {
        createNotification(title, message);
    });
}

chrome.runtime.onInstalled.addListener((details) => {
    if (!details || !details.reason) {
        return;
    }

    if (details.reason === "install") {
        openOnboardingPage("install");
        return;
    }

    if (details.reason !== "update") {
        return;
    }

    const currentVersion = chrome.runtime.getManifest().version;
    const previousVersion = details.previousVersion;

    if (
        currentVersion === WHATS_NEW_VERSION
        && parseSemver(previousVersion)
        && isVersionLessThan(previousVersion, WHATS_NEW_VERSION)
    ) {
        openOnboardingPage("update", previousVersion, currentVersion);
    }
});


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
            const completionAction = normalizeCompletionAction(timerObj.completionAction);
            // Get localized notification strings
            const notifTitle = chrome.i18n.getMessage("notificationTitle");
            const notifMessage = chrome.i18n.getMessage("notificationMessage", [timerObj.tabTitle]);

            if (completionAction === COMPLETION_ACTION_NOTIFY_ONLY) {
                // Always notify regardless of the toggle — this action IS the notification
                createNotification(notifTitle, notifMessage);
            } else {
                // Close tab: notify only if the toggle is on
                showNotification(notifTitle, notifMessage);
                // Timer expired: close the tab.
                chrome.tabs.remove(timerObj.tabId, () => {
                    if (chrome.runtime.lastError) {
                        console.error(`Error closing tab ${timerObj.tabId}:`, chrome.runtime.lastError.message);
                    } else {
                        console.log(`Tab ${timerObj.tabId} closed.`);
                    }
                });
            }

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
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                sendResponse({ status: "No active tab" });
                return;
            }
            const tab = tabs[0];
            const tabId = tab.id;
            const tabTitle = tab.title || `Tab ${tabId}`;
            const tabFavicon = tab.favIconUrl || "icons/timer.svg";

            chrome.storage.local.get(null, (items) => {
                let activeTimerKey = null;
                for (const key in items) {
                    if (key.startsWith("timer_")) {
                        const timer = items[key];
                        if (timer.tabId === tabId) {
                            activeTimerKey = key;
                            break;
                        }
                    }
                }
                if (activeTimerKey) {
                    // Update the existing timer with the new duration.
                    const activeTimer = items[activeTimerKey];
                    updateTimer(activeTimer.timerId, request.duration, () => {
                        sendResponse({ status: "Timer updated", timerId: activeTimer.timerId });
                    });
                } else {
                    // No active timer found for this tab: start a new one.
                    const timerId = Date.now().toString();
                    startTimer(
                        timerId,
                        tabId,
                        tabTitle,
                        request.duration,
                        tabFavicon,
                        request.completionAction
                    );
                    sendResponse({ status: "Timer started", timerId });
                }
            });
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
    } else if (request.action === "setTimerCompletionAction") {
        setTimerCompletionAction(request.timerId, request.completionAction, (error, timerObj) => {
            if (error) {
                sendResponse({ status: error });
                return;
            }
            sendResponse({
                status: `Timer ${request.timerId} action set`,
                timer: timerObj
            });
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

// Listener for manual tab closures and clear the associated timer
chrome.tabs.onRemoved.addListener((tabId, removeInfo) => {
    chrome.storage.local.get(null, (items) => {
        for (const key in items) {
            if (key.startsWith("timer_")) {
                const timerObj = items[key];
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
    chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        if (!tabs || tabs.length === 0) return;
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
                if (remaining > 0) {
                    let badgeText = "";
                    if (remaining >= 3600) {
                        const hours = Math.floor(remaining / 3600);
                        const minutes = Math.floor((remaining % 3600) / 60);
                        const h = hours.toString().padStart(2, "0");
                        const m = minutes.toString().padStart(2, "0");
                        // Use localized badge format (stays ≤4 chars: HH:MM)
                        badgeText = chrome.i18n.getMessage("badgeHours", [h, m]) || `${h}:${m}`;
                    }
                    else if (remaining < 3600) {
                        const minutes = Math.floor(remaining / 60);
                        const seconds = remaining % 60;
                        const m = minutes.toString().padStart(2, "0");
                        const s = seconds.toString().padStart(2, "0");
                        // Use localized badge format (stays ≤4 chars: MM:SS)
                        badgeText = chrome.i18n.getMessage("badgeMinutes", [m, s]) || `${m}:${s}`;
                    }
                    else {
                        badgeText = `${remaining}s`;
                    }
                    chrome.action.setBadgeText({ text: badgeText, tabId: activeTabId });
                } else {
                    chrome.action.setBadgeText({ text: "", tabId: activeTabId });
                }
            } else {
                chrome.action.setBadgeText({ text: "", tabId: activeTabId });
            }
        });
    });
}

setInterval(updateBadge, 1000);
chrome.tabs.onActivated.addListener(() => {
    updateBadge();
});

function updateTimer(timerId, newDuration, callback) {
    const key = getTimerKey(timerId);
    chrome.storage.local.get(key, (result) => {
        const timerObj = result[key];
        if (!timerObj) {
            console.log(`Timer ${timerId} not found for update`);
            if (callback) callback("Timer not found");
            return;
        }
        const newStartTime = Date.now();
        const newTargetTime = newStartTime + newDuration * 1000;
        // Update the timer object with the new duration and times.
        timerObj.originalDuration = newDuration;
        timerObj.startTime = newStartTime;
        timerObj.targetTime = newTargetTime;
        timerObj.paused = false;
        if (!timerObj.completionAction) {
            timerObj.completionAction = COMPLETION_ACTION_CLOSE_TAB;
        }
        if (timerObj.remaining) {
            delete timerObj.remaining;
        }
        // Clear the existing alarm, update storage, then create a new alarm.
        chrome.alarms.clear(timerId, () => {
            chrome.storage.local.set({ [key]: timerObj }, () => {
                chrome.alarms.create(timerId, { delayInMinutes: newDuration / 60 });
                console.log(`Timer ${timerId} updated to new duration: ${newDuration} seconds`);
                if (callback) callback(null, timerObj);
            });
        });
    });
}
chrome.runtime.onStartup.addListener(() => {
    chrome.tabs.query({}, (tabs) => {
        const openTabIds = tabs.map(tab => tab.id);
        chrome.storage.local.get(null, (items) => {
            Object.keys(items).forEach(key => {
                if (key.startsWith("timer_")) {
                    const timer = items[key];
                    if (!openTabIds.includes(timer.tabId)) {
                        chrome.storage.local.remove(key, () => {
                            console.log(`Removed stale timer for tab ${timer.tabId}`);
                        });
                    }
                }
            });
        });
    });
});

chrome.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
    if (changeInfo.title) {
        chrome.storage.local.get(null, (items) => {
            for (const key in items) {
                if (key.startsWith("timer_") && items[key].tabId === tabId) {
                    let timer = items[key];
                    timer.tabTitle = tab.title;
                    timer.tabFavicon = tab.favIconUrl || "icons/timer.svg";
                    chrome.storage.local.set({ [key]: timer }, () => {
                        console.log(`Updated timer ${timer.timerId} with new title: ${tab.title}`);
                    });
                }
            }
        });
    }
});

// Export functions for testing.
module.exports = {
    parseSemver,
    isVersionLessThan,
    startTimer,
    pauseTimer,
    resumeTimer,
    resetTimer,
    cancelTimer,
    setTimerCompletionAction,
    updateBadge
};
