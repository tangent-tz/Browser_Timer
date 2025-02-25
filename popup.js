document.addEventListener("DOMContentLoaded", () => {
    console.log("Popup script loaded");

    const hoursInput = document.getElementById("hoursInput");
    const minutesInput = document.getElementById("minutesInput");
    const secondsInput = document.getElementById("secondsInput");
    const startBtn = document.getElementById("startBtn");
    const pauseBtn = document.getElementById("pauseBtn");
    const resetBtn = document.getElementById("resetBtn");
    const timerDisplay = document.getElementById("timerDisplay");

    if (!startBtn || !pauseBtn || !resetBtn) {
        console.error("One or more button elements are missing from the popup!");
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

    // Periodically update the timer display from the background state
    setInterval(() => {
        chrome.runtime.sendMessage({ action: "getState" }, (response) => {
            if (response && typeof response.remaining !== "undefined") {
                timerDisplay.textContent = `Time Remaining: ${response.remaining}s`;
            }
        });
    }, 1000);
});
