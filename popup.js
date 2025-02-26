// popup.js

document.addEventListener("DOMContentLoaded", () => {
    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const timersList = document.getElementById("timersList");

    const trackVideoBtn = document.getElementById("trackVideoBtn");
    const videoTabsList = document.getElementById("videoTabsList");

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
                div.innerHTML = `
          <div>
            <strong>Tab:</strong> ${timer.tabTitle} |
            <strong>Remaining:</strong> ${timer.remaining}s
          </div>
          <button class="pause-btn" data-timerid="${timer.id}">Pause</button>
          <button class="reset-btn" data-timerid="${timer.id}">Reset</button>
          <button class="cancel-btn" data-timerid="${timer.id}">Cancel</button>
        `;
                timersList.appendChild(div);
            });

            // Pause/Reset/Cancel listeners
            document.querySelectorAll(".pause-btn").forEach(btn => {
                btn.addEventListener("click", () => {
                    const timerId = Number(btn.getAttribute("data-timerid"));
                    chrome.runtime.sendMessage({ action: "pauseTimer", timerId });
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
    // 2) TRACK VIDEO ON CURRENT TAB
    // --------------------------------------------------
    trackVideoBtn.addEventListener("click", () => {
        // Send a message to the content script on the active tab to start tracking
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;
            const tabId = tabs[0].id;
            // Send message to that tab's content script
            chrome.tabs.sendMessage(tabId, { action: "startTrackingVideo" }, (response) => {
                console.log("startTrackingVideo response:", response);
            });
        });
    });

    function updateVideoTabsList() {
        chrome.runtime.sendMessage({ action: "getVideoTabs" }, (resp) => {
            if (!resp || !resp.videoTabs) return;
            videoTabsList.innerHTML = "<h3>Tracked Videos</h3>";
            if (resp.videoTabs.length === 0) {
                videoTabsList.innerHTML += "<p>No videos currently tracked.</p>";
            } else {
                resp.videoTabs.forEach(tab => {
                    const div = document.createElement("div");
                    div.textContent = `Tab: ${tab.tabTitle} (ID: ${tab.tabId})`;
                    videoTabsList.appendChild(div);
                });
            }
        });
    }

    // --------------------------------------------------
    // 3) Periodic Updates
    // --------------------------------------------------
    setInterval(() => {
        updateTimersList();
        updateVideoTabsList();
    }, 1000);
});
