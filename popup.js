document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded");

    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startBtn = document.getElementById("startBtn");
    const timersList = document.getElementById("timersList");
    const modeRadios = document.querySelectorAll('input[name="mode"]');
    const inputGroup = document.querySelector(".input-group");

    // Function to toggle timer input visibility
    function toggleInputGroup(mode) {
        if (mode === "video") {
            inputGroup.style.display = "none";
        } else {
            inputGroup.style.display = "flex";
        }
    }

    // Attach change event for mode radios
    modeRadios.forEach(radio => {
        radio.addEventListener("change", (e) => {
            const mode = e.target.value;
            toggleInputGroup(mode);  // Hide/show inputs based on mode
            chrome.storage.local.set({ mode: mode }, () => {
                console.log("Mode set to", mode);
                chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
                    if (tabs && tabs.length > 0) {
                        chrome.tabs.reload(tabs[0].id);
                    }
                });
            });
        });
    });

    // On load, set mode and toggle inputs accordingly
    chrome.storage.local.get("mode", (result) => {
        const mode = result.mode || "timer";
        const radioToSelect = document.querySelector(`input[name="mode"][value="${mode}"]`);
        if (radioToSelect) radioToSelect.checked = true;
        toggleInputGroup(mode);
    });

    startBtn.addEventListener("click", () => {
        chrome.storage.local.get("mode", (result) => {
            if (result.mode !== "timer") {
                console.log("Timer functionality is disabled in Video Tracking Mode.");
                return;
            }
            const hours = parseInt(hoursInput.value, 10) || 0;
            const minutes = parseInt(minutesInput.value, 10) || 0;
            const seconds = parseInt(secondsInput.value, 10) || 0;
            const totalSeconds = hours * 3600 + minutes * 60 + seconds;
            console.log("Start button clicked with total seconds:", totalSeconds);
            chrome.runtime.sendMessage({ action: "start", duration: totalSeconds }, (response) => {
                console.log("Response from background (start):", response);
            });
        });
    });

    function updateTimersList() {
        chrome.storage.local.get("mode", (result) => {
            if (result.mode !== "timer") {
                timersList.innerHTML = "";
                return;
            }
            chrome.runtime.sendMessage({ action: "getTimers" }, (response) => {
                if (response && response.timers) {
                    timersList.innerHTML = "";
                    response.timers.forEach(timer => {
                        const timerDiv = document.createElement("div");
                        timerDiv.className = "timer-entry";
                        timerDiv.innerHTML = `
                            <div>
                              <strong>Tab:</strong> ${timer.tabTitle} | 
                              <strong>Remaining:</strong> ${timer.remaining}s
                            </div>
                            <button data-timerid="${timer.id}" class="pause-btn">Pause</button>
                            <button data-timerid="${timer.id}" class="reset-btn">Reset</button>
                            <button data-timerid="${timer.id}" class="cancel-btn">Cancel</button>
                        `;
                        timersList.appendChild(timerDiv);
                    });
                    document.querySelectorAll(".pause-btn").forEach(button => {
                        button.addEventListener("click", () => {
                            const timerId = Number(button.getAttribute("data-timerid"));
                            chrome.runtime.sendMessage({ action: "pause", timerId: timerId }, (response) => {
                                console.log(response.status);
                            });
                        });
                    });
                    document.querySelectorAll(".reset-btn").forEach(button => {
                        button.addEventListener("click", () => {
                            const timerId = Number(button.getAttribute("data-timerid"));
                            chrome.runtime.sendMessage({ action: "reset", timerId: timerId }, (response) => {
                                console.log(response.status);
                            });
                        });
                    });
                    document.querySelectorAll(".cancel-btn").forEach(button => {
                        button.addEventListener("click", () => {
                            const timerId = Number(button.getAttribute("data-timerid"));
                            chrome.runtime.sendMessage({ action: "cancel", timerId: timerId }, (response) => {
                                console.log(response.status);
                            });
                        });
                    });
                }
            });
        });
    }

    setInterval(updateTimersList, 1000);
});
