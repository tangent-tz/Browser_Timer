// popup.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded");

    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startBtn = document.getElementById("startBtn");
    const timersList = document.getElementById("timersList");

    if (!startBtn) {
        console.error("Start button is missing!");
        return;
    }

    startBtn.addEventListener("click", () => {
        const hours = parseInt(hoursInput.value, 10) || 0;
        const minutes = parseInt(minutesInput.value, 10) || 0;
        const seconds = parseInt(secondsInput.value, 10) || 0;
        const totalSeconds = hours * 3600 + minutes * 60 + seconds;

        console.log("Start button clicked with total seconds:", totalSeconds);

        chrome.runtime.sendMessage({ action: "start", duration: totalSeconds }, (response) => {
            console.log("Response from background (start):", response);
        });
    });

    function updateTimersList() {
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

                // Attach event listeners for pause, reset, and cancel buttons
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
    }

    // Update the timers list every second
    setInterval(updateTimersList, 1000);
});
