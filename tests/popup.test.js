const { createChromeMock } = require("../mocks/chrome");

global.chrome = createChromeMock();
require("../src/popup.js");

function mountPopup() {
    document.body.innerHTML = '<div id="root"></div>';
    document.dispatchEvent(new Event("DOMContentLoaded"));
}

function getStartTimerCall() {
    return chrome.runtime.sendMessage.mock.calls.find(([msg]) => msg.action === "startTimer");
}

describe("Popup - Start Timer behavior", () => {
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
        startTimerBtn.click();

        const startCall = getStartTimerCall();
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

    test("should persist notifyOnly as default action and use it for startTimer", () => {
        const tabSettings = document.getElementById("tabSettings");
        const defaultActionSelect = document.getElementById("defaultActionSelect");
        const hoursInput = document.getElementById("hoursInput");
        const startTimerBtn = document.getElementById("startTimerBtn");

        tabSettings.click();
        defaultActionSelect.value = "notifyOnly";
        defaultActionSelect.dispatchEvent(new Event("change", { bubbles: true }));

        expect(chrome.storage.sync.set).toHaveBeenCalledWith(
            { defaultCompletionAction: "notifyOnly" },
            undefined
        );

        hoursInput.value = "1";
        startTimerBtn.click();

        const startCall = getStartTimerCall();
        expect(startCall).toBeDefined();
        expect(startCall[0].completionAction).toBe("notifyOnly");
    });

    test("should reject zero duration and show localized inline error", () => {
        const hoursInput = document.getElementById("hoursInput");
        const minutesInput = document.getElementById("minutesInput");
        const secondsInput = document.getElementById("secondsInput");
        const startTimerBtn = document.getElementById("startTimerBtn");

        hoursInput.value = "0";
        minutesInput.value = "0";
        secondsInput.value = "0";
        startTimerBtn.click();

        expect(getStartTimerCall()).toBeUndefined();
        const inputError = document.getElementById("timerInputError");
        expect(inputError).not.toBeNull();
        expect(inputError.textContent).toBe("Enter a time greater than 00:00:00.");
    });

    test("should clamp out-of-range input values before starting timer", () => {
        const hoursInput = document.getElementById("hoursInput");
        const minutesInput = document.getElementById("minutesInput");
        const secondsInput = document.getElementById("secondsInput");
        const startTimerBtn = document.getElementById("startTimerBtn");

        hoursInput.value = "-5";
        minutesInput.value = "120";
        secondsInput.value = "99";
        startTimerBtn.click();

        const startCall = getStartTimerCall();
        expect(startCall).toBeDefined();
        expect(startCall[0].duration).toBe(3599);
        expect(hoursInput.value).toBe("0");
        expect(minutesInput.value).toBe("59");
        expect(secondsInput.value).toBe("59");
    });

    test("should clear inline error after a valid start", () => {
        const hoursInput = document.getElementById("hoursInput");
        const startTimerBtn = document.getElementById("startTimerBtn");

        hoursInput.value = "0";
        startTimerBtn.click();
        expect(document.getElementById("timerInputError")).not.toBeNull();

        hoursInput.value = "1";
        startTimerBtn.click();
        expect(document.getElementById("timerInputError")).toBeNull();
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
