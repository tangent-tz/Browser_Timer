const React = require("react");
const { createRoot } = require("react-dom/client");
const { flushSync } = require("react-dom");

const { useEffect, useState } = React;
const h = React.createElement;

const COMPLETION_ACTION_CLOSE_TAB = "closeTab";
const COMPLETION_ACTION_NOTIFY_ONLY = "notifyOnly";

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

function parseInputValue(rawValue) {
    const parsed = parseInt(rawValue, 10);
    if (Number.isNaN(parsed)) {
        return 0;
    }
    return parsed;
}

function parseDurationInputs(hoursRaw, minutesRaw, secondsRaw) {
    const hours = parseInputValue(hoursRaw);
    const minutes = parseInputValue(minutesRaw);
    const seconds = parseInputValue(secondsRaw);
    return {
        hours,
        minutes,
        seconds,
        totalSeconds: hours * 3600 + minutes * 60 + seconds
    };
}

function openOnboardingTab(mode) {
    const url = chrome.runtime.getURL(`onboarding.html?mode=${mode}`);
    chrome.tabs.create({ url, active: true });
}

function TimerCard(props) {
    const { timer, onControl, onActionChange } = props;
    const remaining = getRemainingSeconds(timer);
    const percentage = getProgressPercentage(timer, remaining);
    const completionAction = timer.completionAction || COMPLETION_ACTION_CLOSE_TAB;
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
            h("span", { className: "timer-title" }, timer.tabTitle),
            h(
                "select",
                {
                    id: `timerActionSelect-${timer.timerId}`,
                    className: "timer-action-select",
                    value: completionAction,
                    "data-timerid": timer.timerId,
                    onChange: (event) => {
                        onActionChange(timer.timerId, event.target.value);
                    }
                },
                h("option", { value: COMPLETION_ACTION_CLOSE_TAB }, getLocalizedMessage("actionCloseTab")),
                h("option", { value: COMPLETION_ACTION_NOTIFY_ONLY }, getLocalizedMessage("actionNotifyOnly"))
            )
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
    const [startCompletionAction, setStartCompletionAction] = useState(COMPLETION_ACTION_CLOSE_TAB);
    const [inputError, setInputError] = useState("");

    const refreshTimers = () => {
        chrome.runtime.sendMessage({ action: "getTimers" }, (resp) => {
            if (!resp || !Array.isArray(resp.timers)) {
                return;
            }
            setTimers(resp.timers);
        });
    };

    useEffect(() => {
        chrome.storage.sync.get(["notificationsEnabled", "defaultCompletionAction"], (data) => {
            setNotificationsEnabled(data.notificationsEnabled !== false);
            if (data.defaultCompletionAction) {
                setStartCompletionAction(data.defaultCompletionAction);
            }
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

    const onDurationInputWheel = (event) => {
        event.preventDefault();
        const input = event.currentTarget;
        const current = parseInputValue(input.value);
        const delta = event.deltaY < 0 ? 1 : -1;
        const next = Math.max(0, current + delta);
        input.value = next.toString();
    };

    const startTimer = () => {
        const hoursInput = document.getElementById("hoursInput");
        const minutesInput = document.getElementById("minutesInput");
        const secondsInput = document.getElementById("secondsInput");
        const parsed = parseDurationInputs(
            hoursInput ? hoursInput.value : "0",
            minutesInput ? minutesInput.value : "0",
            secondsInput ? secondsInput.value : "0"
        );

        if (parsed.totalSeconds <= 0) {
            setInputError(getLocalizedMessage("timerInputError"));
            return;
        }

        setInputError("");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) {
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
                    duration: parsed.totalSeconds,
                    tabFavicon: tab.favIconUrl || "icons/timer.svg",
                    tabTitle: tab.title || `Tab ${tab.id}`,
                    tabId: tab.id,
                    completionAction: startCompletionAction
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

    const onTimerActionChange = (timerId, completionAction) => {
        chrome.runtime.sendMessage(
            {
                action: "setTimerCompletionAction",
                timerId,
                completionAction
            },
            () => {
                refreshTimers();
            }
        );
    };

    const onNotificationsChange = (event) => {
        const enabled = event.target.checked;
        setNotificationsEnabled(enabled);
        chrome.storage.sync.set({ notificationsEnabled: enabled });
    };

    const onDefaultActionChange = (event) => {
        const action = event.target.value;
        setStartCompletionAction(action);
        chrome.storage.sync.set({ defaultCompletionAction: action });
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
                        min: "0",
                        onWheel: onDurationInputWheel
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
                        min: "0",
                        onWheel: onDurationInputWheel
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
                        min: "0",
                        onWheel: onDurationInputWheel
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
            inputError &&
                h(
                    "div",
                    {
                        id: "timerInputError",
                        className: "input-error-message",
                        role: "alert"
                    },
                    inputError
                ),
            h(
                "div",
                { id: "timersList" },
                timers.map((timer) =>
                    h(TimerCard, {
                        key: timer.timerId,
                        timer,
                        onControl,
                        onActionChange: onTimerActionChange
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
                { className: "settings-item settings-action-row" },
                h("span", { className: "settings-toggle-label" }, getLocalizedMessage("enableNotifications")),
                h(
                    "label",
                    { className: "toggle-switch" },
                    h("input", {
                        type: "checkbox",
                        id: "notificationsToggle",
                        checked: notificationsEnabled,
                        onChange: onNotificationsChange
                    }),
                    h("span", { className: "toggle-slider" })
                )
            ),
            h(
                "div",
                { className: "settings-item settings-action-row" },
                h("label", { htmlFor: "defaultActionSelect" }, getLocalizedMessage("completionActionLabel")),
                h(
                    "select",
                    {
                        id: "defaultActionSelect",
                        className: "completion-action-select",
                        value: startCompletionAction,
                        onChange: onDefaultActionChange
                    },
                    h("option", { value: COMPLETION_ACTION_CLOSE_TAB }, getLocalizedMessage("actionCloseTab")),
                    h("option", { value: COMPLETION_ACTION_NOTIFY_ONLY }, getLocalizedMessage("actionNotifyOnly"))
                )
            ),
            h(
                "div",
                { className: "settings-item settings-link-row" },
                h("span", { className: "settings-toggle-label" }, getLocalizedMessage("settingsViewGettingStarted")),
                h("button", { className: "settings-open-btn", onClick: () => openOnboardingTab("install") }, "›")
            ),
            h(
                "div",
                { className: "settings-item settings-link-row" },
                h("span", { className: "settings-toggle-label" }, getLocalizedMessage("settingsViewWhatsNew")),
                h("button", { className: "settings-open-btn", onClick: () => openOnboardingTab("update") }, "›")
            ),
            startCompletionAction === COMPLETION_ACTION_NOTIFY_ONLY && h(
                "div",
                { className: "settings-info-box" },
                h("span", null, getLocalizedMessage("notifyOnlyHint"))
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
    parseDurationInputs,
    formatTime,
    mountPopup
};
