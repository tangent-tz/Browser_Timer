document.addEventListener("DOMContentLoaded", () => {
    // Tab switching logic:
    const tabTimer = document.getElementById("tabTimer");
    const tabSettings = document.getElementById("tabSettings");
    const timerSection = document.getElementById("timerSection");
    const settingsSection = document.getElementById("settingsSection");
    const notificationsToggle = document.getElementById("notificationsToggle");

    // Initialize notifications toggle state:
    chrome.storage.sync.get("notificationsEnabled", (data) => {
        notificationsToggle.checked = data.notificationsEnabled !== false;
    });
    notificationsToggle.addEventListener("change", () => {
        chrome.storage.sync.set({ notificationsEnabled: notificationsToggle.checked });
    });

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
        if (totalSeconds <= 0) {
            console.warn("Please enter a valid time greater than 0.");
            return;
        }
        chrome.runtime.sendMessage({ action: "startTimer", duration: totalSeconds }, (response) => {
            console.log("Timer started:", response);
        });
    });

    // Update the timers list UI every second.
    function updateTimersList() {
        chrome.runtime.sendMessage({ action: "getTimers" }, (resp) => {
            if (!resp || !resp.timers) return;
            timersList.innerHTML = "";
            resp.timers.forEach(timer => {
                let remaining;
                if (timer.paused && timer.remaining !== undefined) {
                    remaining = timer.remaining;
                } else if (timer.targetTime) {
                    remaining = Math.max(0, Math.floor((timer.targetTime - Date.now()) / 1000));
                } else {
                    remaining = timer.originalDuration;
                }
                const div = document.createElement("div");
                div.className = "timer-entry";
                let controlButton = "";
                if (!timer.paused) {
                    controlButton = `<button class="pause-btn" data-timerid="${timer.timerId}">Pause</button>`;
                } else {
                    controlButton = `<button class="resume-btn" data-timerid="${timer.timerId}">Resume</button>`;
                }
                div.innerHTML = `
          <div>
            <strong>Tab:</strong> ${timer.tabTitle} |
            <strong>Remaining:</strong> ${remaining}s
          </div>
          ${controlButton}
          <button class="reset-btn" data-timerid="${timer.timerId}">Reset</button>
          <button class="cancel-btn" data-timerid="${timer.timerId}">Cancel</button>
        `;
                timersList.appendChild(div);
            });

            // Attach event listeners for timer controls.
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
