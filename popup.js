// popup.js

document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded");
    const timerInput = document.getElementById("timerInput");
    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const resetBtn = document.getElementById("resetBtn");
    const timerDisplay = document.getElementById("timerDisplay");

    if (!startBtn || !pauseBtn || !resetBtn) {
        console.error("One or more button elements are missing from the popup!");
        return;
    }

    startBtn.addEventListener("click", () => {
        const duration = parseInt(timerInput.value, 10) || 0;
        console.log("Start button clicked with duration:", duration);
        chrome.runtime.sendMessage({ action: "start", duration: duration }, (response) => {
            console.log("Response from background (start):", response);
        });
    });

    pauseBtn.addEventListener("click", () => {
        console.log("Pause button clicked");
        chrome.runtime.sendMessage({ action: "pause" }, (response) => {
            console.log("Response from background (pause):", response);
        });
    });

    resetBtn.addEventListener("click", () => {
        console.log("Reset button clicked");
        chrome.runtime.sendMessage({ action: "reset" }, (response) => {
            console.log("Response from background (reset):", response);
            timerDisplay.textContent = "Time Remaining: 0s";
        });
    });

    // Update the timer display every second by requesting the current state from background
    setInterval(() => {
        chrome.runtime.sendMessage({ action: "getState" }, (response) => {
            if (response && typeof response.remaining !== "undefined") {
                timerDisplay.textContent = `Time Remaining: ${response.remaining}s`;
            }
        });
    }, 1000);
});
