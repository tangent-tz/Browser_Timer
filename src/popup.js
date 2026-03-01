const React = require("react");
const { createRoot } = require("react-dom/client");
const { flushSync } = require("react-dom");

const { useEffect, useState } = React;
const h = React.createElement;

function getLocalizedMessage(key, substitutions) {
    if (!chrome || !chrome.i18n || typeof chrome.i18n.getMessage !== "function") {
        return "";
    }
    const message = chrome.i18n.getMessage(key, substitutions);
    return message || "";
}

function formatTime(seconds) {
    const safeSeconds = Math.max(0, Number(seconds) || 0);
    const hVal = Math.floor(safeSeconds / 3600);
    const mVal = Math.floor((safeSeconds % 3600) / 60);
    const sVal = safeSeconds % 60;
    return `${hVal.toString().padStart(2, "0")}:${mVal.toString().padStart(2, "0")}:${sVal
        .toString()
        .padStart(2, "0")}`;
}

function getRemainingSeconds(timer) {
    if (timer.paused && timer.remaining !== undefined) {
        return Math.max(0, timer.remaining);
    }
    if (timer.targetTime) {
        return Math.max(0, Math.floor((timer.targetTime - Date.now()) / 1000));
    }
    return Math.max(0, timer.originalDuration || 0);
}

function getProgressPercentage(timer, remaining) {
    const original = Math.max(1, timer.originalDuration || 1);
    const elapsed = original - remaining;
    return Math.min(100, Math.max(0, (elapsed / original) * 100));
}

function TimerCard(props) {
    const { timer, onControl } = props;
    const remaining = getRemainingSeconds(timer);
    const percentage = getProgressPercentage(timer, remaining);
    const statusText = timer.paused
        ? getLocalizedMessage("statusPaused")
        : getLocalizedMessage("statusRunning");
    const pauseResumeClassName = timer.paused ? "resume-btn" : "pause-btn";
    const pauseResumeText = timer.paused
        ? getLocalizedMessage("resumeButton")
        : getLocalizedMessage("pauseButton");

    return h(
        "div",
        { className: "timer-card" },
        h(
            "div",
            { className: "timer-card-header" },
            h("img", {
                src: timer.tabFavicon || "icons/timer.svg",
                alt: getLocalizedMessage("tabAltIcon"),
                className: "timer-thumbnail"
            }),
            h("span", { className: "timer-title" }, timer.tabTitle)
        ),
        h(
            "div",
            { className: "timer-status-row" },
            h("span", { className: "status-label" }, getLocalizedMessage("statusLabel")),
            h("span", { className: "status-text" }, statusText)
        ),
        h(
            "div",
            { className: "timer-progress" },
            h("div", {
                className: "progress-bar",
                style: { width: `${percentage}%` }
            })
        ),
        h(
            "div",
            { className: "timer-remaining-row" },
            h("span", { className: "remaining-label" }, getLocalizedMessage("remainingLabel")),
            h("span", { className: "remaining-value" }, formatTime(remaining))
        ),
        h(
            "div",
            { className: "timer-controls" },
            h(
                "button",
                {
                    className: pauseResumeClassName,
                    "data-timerid": timer.timerId,
                    onClick: () => {
                        onControl(timer.paused ? "resumeTimer" : "pauseTimer", timer.timerId);
                    }
                },
                pauseResumeText
            ),
            h(
                "button",
                {
                    className: "reset-btn",
                    "data-timerid": timer.timerId,
                    onClick: () => {
                        onControl("resetTimer", timer.timerId);
                    }
                },
                getLocalizedMessage("resetButton")
            ),
            h(
                "button",
                {
                    className: "cancel-btn",
                    "data-timerid": timer.timerId,
                    onClick: () => {
                        onControl("cancelTimer", timer.timerId);
                    }
                },
                getLocalizedMessage("cancelButton")
            )
        )
    );
}

function PopupApp() {
    const [activeTab, setActiveTab] = useState("timer");
    const [timers, setTimers] = useState([]);
    const [notificationsEnabled, setNotificationsEnabled] = useState(true);

    const refreshTimers = () => {
        chrome.runtime.sendMessage({ action: "getTimers" }, (resp) => {
            if (!resp || !Array.isArray(resp.timers)) {
                return;
            }
            setTimers(resp.timers);
        });
    };

    useEffect(() => {
        chrome.storage.sync.get("notificationsEnabled", (data) => {
            setNotificationsEnabled(data.notificationsEnabled !== false);
        });
    }, []);

    useEffect(() => {
        refreshTimers();
        const intervalId = setInterval(() => {
            refreshTimers();
        }, 1000);
        return () => {
            clearInterval(intervalId);
        };
    }, []);

    const startTimer = () => {
        const hoursInput = document.getElementById("hoursInput");
        const minutesInput = document.getElementById("minutesInput");
        const secondsInput = document.getElementById("secondsInput");
        const hVal = parseInt(hoursInput ? hoursInput.value : "0", 10) || 0;
        const mVal = parseInt(minutesInput ? minutesInput.value : "0", 10) || 0;
        const sVal = parseInt(secondsInput ? secondsInput.value : "0", 10) || 0;
        const totalSeconds = hVal * 3600 + mVal * 60 + sVal;

        if (totalSeconds <= 0) {
            console.warn("Please enter a valid time greater than 0.");
            return;
        }

        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
                console.warn("No active tab found");
                return;
            }
            const tab = tabs[0];
            const tabUrl = tab.url;
            if (tabUrl === "chrome://newtab/" || tabUrl === "edge://newtab/") {
                return;
            }

            chrome.runtime.sendMessage(
                {
                    action: "startTimer",
                    duration: totalSeconds,
                    tabFavicon: tab.favIconUrl || "icons/timer.svg",
                    tabTitle: tab.title || `Tab ${tab.id}`,
                    tabId: tab.id
                },
                () => {
                    refreshTimers();
                }
            );
        });
    };

    const onControl = (action, timerId) => {
        chrome.runtime.sendMessage({ action, timerId }, () => {
            refreshTimers();
        });
    };

    const onNotificationsChange = (event) => {
        const enabled = event.target.checked;
        setNotificationsEnabled(enabled);
        chrome.storage.sync.set({ notificationsEnabled: enabled });
    };

    return h(
        "div",
        { className: "container" },
        h("h1", null, getLocalizedMessage("extensionTitle")),
        h(
            "div",
            { className: "tabs" },
            h(
                "button",
                {
                    id: "tabTimer",
                    className: `tab${activeTab === "timer" ? " active" : ""}`,
                    onClick: () => {
                        setActiveTab("timer");
                    }
                },
                h("img", {
                    src: "icons/timer.svg",
                    alt: getLocalizedMessage("timerAltIcon"),
                    className: "tab-icon"
                }),
                h("span", null, getLocalizedMessage("tabTimer"))
            ),
            h(
                "button",
                {
                    id: "tabSettings",
                    className: `tab${activeTab === "settings" ? " active" : ""}`,
                    onClick: () => {
                        setActiveTab("settings");
                    }
                },
                h("img", {
                    src: "icons/settings.svg",
                    alt: getLocalizedMessage("settingsAltIcon"),
                    className: "tab-icon"
                }),
                h("span", null, getLocalizedMessage("tabSettings"))
            )
        ),
        h(
            "div",
            {
                id: "timerSection",
                className: `tab-content${activeTab === "timer" ? " active" : ""}`
            },
            h(
                "div",
                { className: "input-group" },
                h(
                    "div",
                    { className: "input-field" },
                    h("label", { htmlFor: "hoursInput" }, getLocalizedMessage("hoursLabel")),
                    h("input", {
                        type: "number",
                        id: "hoursInput",
                        defaultValue: "0",
                        min: "0"
                    })
                ),
                h(
                    "div",
                    { className: "input-field" },
                    h("label", { htmlFor: "minutesInput" }, getLocalizedMessage("minutesLabel")),
                    h("input", {
                        type: "number",
                        id: "minutesInput",
                        defaultValue: "0",
                        min: "0"
                    })
                ),
                h(
                    "div",
                    { className: "input-field" },
                    h("label", { htmlFor: "secondsInput" }, getLocalizedMessage("secondsLabel")),
                    h("input", {
                        type: "number",
                        id: "secondsInput",
                        defaultValue: "0",
                        min: "0"
                    })
                )
            ),
            h(
                "button",
                {
                    id: "startTimerBtn",
                    onClick: startTimer
                },
                getLocalizedMessage("startTimerButton")
            ),
            h(
                "div",
                { id: "timersList" },
                timers.map((timer) =>
                    h(TimerCard, {
                        key: timer.timerId,
                        timer,
                        onControl
                    })
                )
            )
        ),
        h(
            "div",
            {
                id: "settingsSection",
                className: `tab-content${activeTab === "settings" ? " active" : ""}`
            },
            h(
                "div",
                { className: "settings-item" },
                h(
                    "label",
                    null,
                    h("input", {
                        type: "checkbox",
                        id: "notificationsToggle",
                        checked: notificationsEnabled,
                        onChange: onNotificationsChange
                    }),
                    h("span", null, getLocalizedMessage("enableNotifications"))
                )
            )
        )
    );
}

let popupRoot = null;
let popupRootContainer = null;

function mountPopup() {
    const rootContainer = document.getElementById("root");
    if (!rootContainer) {
        return;
    }

    if (popupRoot && popupRootContainer !== rootContainer) {
        popupRoot.unmount();
        popupRoot = null;
        popupRootContainer = null;
    }

    if (!popupRoot) {
        popupRoot = createRoot(rootContainer);
        popupRootContainer = rootContainer;
    }

    flushSync(() => {
        popupRoot.render(h(PopupApp));
    });
}

document.addEventListener("DOMContentLoaded", mountPopup);
if (document.readyState !== "loading") {
    mountPopup();
}

module.exports = {
    formatTime,
    mountPopup
};
