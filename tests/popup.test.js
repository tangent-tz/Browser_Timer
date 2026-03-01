const { createChromeMock } = require("../mocks/chrome");
global.chrome = createChromeMock();
require("../src/popup.js");

function mountPopup() {
    document.body.innerHTML = '<div id="root"></div>';
    document.dispatchEvent(new Event("DOMContentLoaded"));
}

describe("Popup - Start Timer functionality", () => {
    beforeEach(() => {
        jest.clearAllMocks();
        mountPopup();
    });

    test("should send startTimer message with default completion action", () => {
        const hoursInput = document.getElementById("hoursInput");
        const minutesInput = document.getElementById("minutesInput");
        const secondsInput = document.getElementById("secondsInput");
        const startTimerBtn = document.getElementById("startTimerBtn");

        hoursInput.value = "1";
        minutesInput.value = "2";
        secondsInput.value = "3";
        hoursInput.dispatchEvent(new Event("input", { bubbles: true }));
        minutesInput.dispatchEvent(new Event("input", { bubbles: true }));
        secondsInput.dispatchEvent(new Event("input", { bubbles: true }));

        startTimerBtn.click();

        const startCall = chrome.runtime.sendMessage.mock.calls.find(([msg]) => msg.action === "startTimer");
        expect(startCall).toBeDefined();
        expect(startCall[0]).toEqual({
            action: "startTimer",
            duration: 3723,
            tabFavicon: "icons/timer.svg",
            tabTitle: "Test Tab",
            tabId: 123,
            completionAction: "closeTab"
        });
    });

    test("should send notifyOnly when start action dropdown is changed", () => {
        const hoursInput = document.getElementById("hoursInput");
        const completionActionSelect = document.getElementById("completionActionSelect");
        const startTimerBtn = document.getElementById("startTimerBtn");

        hoursInput.value = "1";
        hoursInput.dispatchEvent(new Event("input", { bubbles: true }));
        completionActionSelect.value = "notifyOnly";
        completionActionSelect.dispatchEvent(new Event("change", { bubbles: true }));

        startTimerBtn.click();

        const startCall = chrome.runtime.sendMessage.mock.calls.find(([msg]) => msg.action === "startTimer");
        expect(startCall).toBeDefined();
        expect(startCall[0].completionAction).toBe("notifyOnly");
    });
});

describe("Popup Timer List Rendering", () => {
    let originalDateNow;

    beforeEach(() => {
        originalDateNow = Date.now;
        const fixedTime = 1000000;
        Date.now = jest.fn(() => fixedTime);
        jest.clearAllMocks();
        mountPopup();
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should render timer action dropdown and update timer completion action from card", (done) => {
        const fakeNow = Date.now();
        const activeTimer = {
            timerId: "1",
            tabTitle: "Active Tab",
            originalDuration: 120,
            startTime: fakeNow,
            targetTime: fakeNow + 60 * 1000,
            paused: false
        };

        const pausedTimer = {
            timerId: "2",
            tabTitle: "Paused Tab",
            originalDuration: 300,
            paused: true,
            remaining: 100,
            completionAction: "notifyOnly"
        };

        jest.spyOn(chrome.runtime, "sendMessage").mockImplementation((msg, callback) => {
            if (msg.action === "getTimers") {
                callback({ timers: [activeTimer, pausedTimer] });
                return;
            }
            callback({ status: "ok" });
        });

        setTimeout(() => {
            const timersList = document.getElementById("timersList");
            const timerEntries = timersList.querySelectorAll(".timer-card");
            expect(timerEntries.length).toBe(2);

            const firstActionSelect = timerEntries[0].querySelector(".timer-action-select");
            const secondActionSelect = timerEntries[1].querySelector(".timer-action-select");
            expect(firstActionSelect.value).toBe("closeTab");
            expect(secondActionSelect.value).toBe("notifyOnly");

            firstActionSelect.value = "notifyOnly";
            firstActionSelect.dispatchEvent(new Event("change", { bubbles: true }));
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: "setTimerCompletionAction", timerId: "1", completionAction: "notifyOnly" },
                expect.any(Function)
            );

            const pauseButton = timerEntries[0].querySelector(".pause-btn");
            pauseButton.click();
            expect(chrome.runtime.sendMessage).toHaveBeenCalledWith(
                { action: "pauseTimer", timerId: "1" },
                expect.any(Function)
            );

            done();
        }, 1100);
    });
});

