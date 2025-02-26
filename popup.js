document.addEventListener("DOMContentLoaded", () => {
    // Tab switching logic
    const tabTimer = document.getElementById("tabTimer");
    const tabVideo = document.getElementById("tabVideo");
    const timerSection = document.getElementById("timerSection");
    const videoSection = document.getElementById("videoSection");

    tabTimer.addEventListener("click", () => {
        tabTimer.classList.add("active");
        tabVideo.classList.remove("active");
        timerSection.classList.add("active");
        videoSection.classList.remove("active");
    });

    tabVideo.addEventListener("click", () => {
        tabVideo.classList.add("active");
        tabTimer.classList.remove("active");
        videoSection.classList.add("active");
        timerSection.classList.remove("active");
    });

    // Timer elements
    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startTimerBtn = document.getElementById("startTimerBtn");
    const timersList = document.getElementById("timersList");

    // Video elements
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
    // 2) VIDEO TRACKING
    // --------------------------------------------------
    trackVideoBtn.addEventListener("click", () => {
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
            if (!tabs[0]) return;
            const tabId = tabs[0].id;
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
                    div.className = "video-entry";

                    div.innerHTML = `
            <div>
              <strong>Tab:</strong> ${tab.tabTitle}
            </div>
            <button class="stop-tracking-btn" data-tabid="${tab.tabId}">Stop Tracking</button>
          `;
                    videoTabsList.appendChild(div);
                });

                document.querySelectorAll(".stop-tracking-btn").forEach(btn => {
                    btn.addEventListener("click", () => {
                        const tabId = Number(btn.getAttribute("data-tabid"));
                        chrome.runtime.sendMessage({ action: "stopTrackingVideo", tabId });
                    });
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
