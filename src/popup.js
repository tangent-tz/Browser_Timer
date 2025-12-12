// Localize all elements with data-i18n attributes before first paint
function localizeStaticContent() {
    // Localize text content
    document.querySelectorAll('[data-i18n]').forEach(element => {
        const key = element.getAttribute('data-i18n');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.textContent = message;
        }
    });

    // Localize alt attributes
    document.querySelectorAll('[data-i18n-alt]').forEach(element => {
        const key = element.getAttribute('data-i18n-alt');
        const message = chrome.i18n.getMessage(key);
        if (message) {
            element.alt = message;
        }
    });
}

// Helper to get localized message with substitutions
function getLocalizedMessage(key, substitutions) {
    return chrome.i18n.getMessage(key, substitutions);
}

// Helper for explicit plural selection
function getPluralMessage(baseKey, count) {
    const pluralKey = count === 1 ? `${baseKey}_one` : `${baseKey}_other`;
    return chrome.i18n.getMessage(pluralKey, [count.toString()]);
}

document.addEventListener("DOMContentLoaded", () => {
    // Apply all static localizations immediately
    localizeStaticContent();

    // Tab switching logic:
    const tabTimer = document.getElementById("tabTimer");
    const tabSettings = document.getElementById("tabSettings");
    const timerSection = document.getElementById("timerSection");
    const settingsSection = document.getElementById("settingsSection");
    const notificationsToggle = document.getElementById("notificationsToggle");

    // Initialize notifications toggle state:
    if (notificationsToggle) {
        chrome.storage.sync.get("notificationsEnabled", (data) => {
            if (!data) return;
            const toggle = document.getElementById("notificationsToggle");
            if (toggle) {
                toggle.checked = data.notificationsEnabled !== false;
            }
        });
        notificationsToggle.addEventListener("change", () => {
            const toggle = document.getElementById("notificationsToggle");
            if (toggle) {
                chrome.storage.sync.set({ notificationsEnabled: toggle.checked });
            }
        });
    }

    tabTimer.addEventListener("click", () => {
        tabTimer.classList.add("active");
        tabSettings.classList.remove("active");
        timerSection.classList.add("active");
        settingsSection.classList.remove("active");
    });
    tabSettings.addEventListener("click", () => {
        tabSettings.classList.add("active");
        tabTimer.classList.remove("active");
        settingsSection.classList.add("active");
        timerSection.classList.remove("active");
    });

    // Timer elements:
    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const timersList = document.getElementById("timersList");

    // Start a new timer when button is clicked.
    startTimerBtn.addEventListener("click", () => {
        const h = parseInt(hoursInput.value, 10) || 0;
        const m = parseInt(minutesInput.value, 10) || 0;
        const s = parseInt(secondsInput.value, 10) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;
        startTimerForDuration(totalSeconds);
    });

    document.querySelectorAll('.preset-btn').forEach(btn => {
        btn.addEventListener('click', () => {
            const presetSeconds = parseInt(btn.getAttribute('data-preset'), 10);
            startTimerForDuration(presetSeconds);
        });
    });


    function startTimerForDuration(totalSeconds) {
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
            const tabId = tab.id;
            const tabUrl = tab.url;
            const tabTitle = tab.title || `Tab ${tabId}`;
            const tabFavicon = tab.favIconUrl || "icons/timer.svg";
            if (tabUrl === "chrome://newtab/" || tabUrl === "edge://newtab/") {
                return;
            }
            chrome.runtime.sendMessage({
                action: "startTimer",
                duration: totalSeconds,
                tabFavicon,
                tabTitle,
                tabId
            }, (response) => {
                console.log("Timer started:", response);
            });
        });
    }


    function formatTime(seconds) {
        const h = Math.floor(seconds / 3600);
        const m = Math.floor((seconds % 3600) / 60);
        const s = seconds % 60;
        return `${h.toString().padStart(2, "0")}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    }

    function createTimerCard(timer) {
        // Determine the remaining time.
        let remaining;
        if (timer.paused && timer.remaining !== undefined) {
            remaining = timer.remaining;
        } else if (timer.targetTime) {
            remaining = Math.max(0, Math.floor((timer.targetTime - Date.now()) / 1000));
        } else {
            remaining = timer.originalDuration;
        }

        // Calculate progress as a percentage.
        const elapsed = timer.originalDuration - remaining;
        const percentage = (elapsed / timer.originalDuration) * 100;

        // Create the card container.
        const card = document.createElement("div");
        card.className = "timer-card";

        // 1) Header: Icon, tab title.
        const header = document.createElement("div");
        header.className = "timer-card-header";
        const icon = document.createElement("img");
        // Use the stored tab favicon; if missing, default to your timer icon.
        icon.src = timer.tabFavicon || "icons/timer.svg";
        icon.alt = getLocalizedMessage("tabAltIcon");
        icon.className = "timer-thumbnail";
        const titleSpan = document.createElement("span");
        titleSpan.className = "timer-title";
        titleSpan.textContent = timer.tabTitle;
        header.appendChild(icon);
        header.appendChild(titleSpan);
        card.appendChild(header);

        // 2) Status row: Label and Running/Paused text
        const statusRow = document.createElement("div");
        statusRow.className = "timer-status-row";
        const statusLabel = document.createElement("span");
        statusLabel.className = "status-label";
        statusLabel.textContent = getLocalizedMessage("statusLabel");
        const statusText = document.createElement("span");
        statusText.className = "status-text";
        statusText.textContent = timer.paused
            ? getLocalizedMessage("statusPaused")
            : getLocalizedMessage("statusRunning");
        statusRow.appendChild(statusLabel);
        statusRow.appendChild(statusText);
        card.appendChild(statusRow);

        // 3) Progress bar.
        const progressContainer = document.createElement("div");
        progressContainer.className = "timer-progress";
        const progressBar = document.createElement("div");
        progressBar.className = "progress-bar";
        progressBar.style.width = percentage + "%";
        progressContainer.appendChild(progressBar);
        card.appendChild(progressContainer);

        // 4) Remaining time row.
        const remainingRow = document.createElement("div");
        remainingRow.className = "timer-remaining-row";
        const remainingLabel = document.createElement("span");
        remainingLabel.className = "remaining-label";
        remainingLabel.textContent = getLocalizedMessage("remainingLabel");
        const remainingValue = document.createElement("span");
        remainingValue.className = "remaining-value";
        remainingValue.textContent = formatTime(remaining);
        remainingRow.appendChild(remainingLabel);
        remainingRow.appendChild(remainingValue);
        card.appendChild(remainingRow);

        // 5) Control buttons: Pause/Resume, Reset, Cancel.
        const controls = document.createElement("div");
        controls.className = "timer-controls";
        const pauseResumeBtn = document.createElement("button");
        pauseResumeBtn.setAttribute("data-timerid", timer.timerId);
        if (timer.paused) {
            pauseResumeBtn.className = "resume-btn";
            pauseResumeBtn.textContent = getLocalizedMessage("resumeButton");
        } else {
            pauseResumeBtn.className = "pause-btn";
            pauseResumeBtn.textContent = getLocalizedMessage("pauseButton");

        }
        const resetBtn = document.createElement("button");
        resetBtn.className = "reset-btn";
        resetBtn.textContent = getLocalizedMessage("resetButton");
        resetBtn.setAttribute("data-timerid", timer.timerId);
        const cancelBtn = document.createElement("button");
        cancelBtn.className = "cancel-btn";
        cancelBtn.textContent = getLocalizedMessage("cancelButton");
        cancelBtn.setAttribute("data-timerid", timer.timerId);

        controls.appendChild(pauseResumeBtn);
        controls.appendChild(resetBtn);
        controls.appendChild(cancelBtn);
        card.appendChild(controls);

        return card;
    }
    // Update the timers list UI every second.
    function updateTimersList() {
        chrome.runtime.sendMessage({ action: "getTimers" }, (resp) => {
            if (!resp || !resp.timers) return;
            timersList.innerHTML = "";
            resp.timers.forEach(timer => {
                const timerCard = createTimerCard(timer);
                timersList.appendChild(timerCard);
            });

            // Reassign event listeners for control buttons.
            document.querySelectorAll(".pause-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "pauseTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
            document.querySelectorAll(".resume-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "resumeTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
            document.querySelectorAll(".reset-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "resetTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
            document.querySelectorAll(".cancel-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = btn.getAttribute("data-timerid");
                    chrome.runtime.sendMessage({ action: "cancelTimer", timerId }, (resp) => {
                        console.log(resp.status);
                    });
                });
            });
        });
    }
    setInterval(updateTimersList, 1000);
});
