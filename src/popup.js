document.addEventListener("DOMContentLoaded", () => {
    // Tab switching logic
    const tabTimer = document.getElementById("tabTimer");
    const timerSection = document.getElementById("timerSection");
    const settingsSection = document.getElementById("settingsSection");
    const tabSettings = document.getElementById("tabSettings");

    tabTimer.addEventListener("click", () => {
        tabTimer.classList.add("active");
        tabSettings.classList.remove("active");
        // tabVideo.classList.remove("active");
        timerSection.classList.add("active");
        settingsSection.classList.remove("active");
        // videoSection.classList.remove("active");
    });

    tabSettings.addEventListener("click", () => {
        tabSettings.classList.add("active");
        tabTimer.classList.remove("active");
        settingsSection.classList.add("active");
        timerSection.classList.remove("active");
    });

    // Timer elements
    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const timersList = document.getElementById("timersList");

    // --------------------------------------------------
    // 1) TIMER: START / LIST
    // --------------------------------------------------
    startTimerBtn.addEventListener("click", () => {
        const h = parseInt(hoursInput.value, 10) || 0;
        const m = parseInt(minutesInput.value, 10) || 0;
        const s = parseInt(secondsInput.value, 10) || 0;
        const totalSeconds = h * 3600 + m * 60 + s;

        if (totalSeconds <= 0) {
            console.warn("Please enter a valid time > 0.");
            return;
        }

        chrome.runtime.sendMessage({ action: "startTimer", duration: totalSeconds }, (resp) => {
            console.log("startTimer response:", resp);
        });
    });

    function updateTimersList() {
        chrome.runtime.sendMessage({ action: "getTimers" }, (resp) => {
            if (!resp || !resp.timers) return;
            timersList.innerHTML = "";
            resp.timers.forEach(timer => {
                const div = document.createElement("div");
                div.className = "timer-entry";
                let controlButton = timer.isRunning
                    ? `<button class="pause-btn" data-timerid="${timer.id}">Pause</button>`
                    : `<button class="resume-btn" data-timerid="${timer.id}">Resume</button>`;
                div.innerHTML = `
          <div>
            <strong>Tab:</strong> ${timer.tabTitle} |
            <strong>Remaining:</strong> ${timer.remaining}s
          </div>
          ${controlButton}
          <button class="reset-btn" data-timerid="${timer.id}">Reset</button>
          <button class="cancel-btn" data-timerid="${timer.id}">Cancel</button>
        `;
                timersList.appendChild(div);
            });

            document.querySelectorAll(".pause-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = Number(btn.getAttribute("data-timerid"));
                    chrome.runtime.sendMessage({ action: "pauseTimer", timerId });
                });
            });
            document.querySelectorAll(".resume-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = Number(btn.getAttribute("data-timerid"));
                    chrome.runtime.sendMessage({ action: "resumeTimer", timerId });
                });
            });
            document.querySelectorAll(".reset-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = Number(btn.getAttribute("data-timerid"));
                    chrome.runtime.sendMessage({ action: "resetTimer", timerId });
                });
            });
            document.querySelectorAll(".cancel-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = Number(btn.getAttribute("data-timerid"));
                    chrome.runtime.sendMessage({ action: "cancelTimer", timerId });
                });
            });
        });
    }

    // --------------------------------------------------
    // 3) Periodic Updates
    // --------------------------------------------------
    setInterval(() => {
        updateTimersList();
        // updateVideoTabsList();
    }, 1000);


    const settingsBtn = document.getElementById("mellowtelSettingsBtn");
    if (settingsBtn) {
        settingsBtn.addEventListener("click", async () => {
            try {
                // Dynamically import Mellowtel
                const MellowtelModule = await import(/* webpackChunkName: "mellowtel-chunk" */ 'mellowtel');
                const Mellowtel = MellowtelModule.default;
                const mellowtel = new Mellowtel('14b804d8');
                const settingsLink = await mellowtel.generateSettingsLink();
                console.log("Generated Settings Link:", settingsLink);
                window.open(settingsLink, "_blank");
            } catch (error) {
                console.error("Error generating settings link:", error);
            }
        });
    }
});
