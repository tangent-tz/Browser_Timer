const { createChromeMock } = require('../mocks/chrome');
global.chrome = createChromeMock();
describe('Popup - Start Timer functionality', () => {
    beforeEach(() => {
        document.body.innerHTML = '<div id="root"></div>';

        jest.clearAllMocks();
        require('../src/popup.js');

        document.dispatchEvent(new Event('DOMContentLoaded'));
    });

    test('should send correct timer start message when valid time is provided', () => {
        const hoursInput = document.getElementById('hoursInput');
        const minutesInput = document.getElementById('minutesInput');
        const secondsInput = document.getElementById('secondsInput');
        const startTimerBtn = document.getElementById('startTimerBtn');

        hoursInput.value = '1';
        minutesInput.value = '2';
        secondsInput.value = '3';
        hoursInput.dispatchEvent(new Event('input', { bubbles: true }));
        minutesInput.dispatchEvent(new Event('input', { bubbles: true }));
        secondsInput.dispatchEvent(new Event('input', { bubbles: true }));

        const expectedDuration = 3723;

        const sendMessageSpy = jest.spyOn(chrome.runtime, 'sendMessage');

        startTimerBtn.click();

        expect(sendMessageSpy).toHaveBeenCalledWith(
            { action: 'startTimer', duration: expectedDuration, tabFavicon: "icons/timer.svg", tabTitle: "Test Tab", tabId: 123 },
            expect.any(Function)
        );
    });
});


describe("Popup Timer List Rendering", () => {
    let originalDateNow;

    beforeEach(() => {
        // Set a fixed time for predictable output.
        originalDateNow = Date.now;
        const fixedTime = 1000000;
        Date.now = jest.fn(() => fixedTime);

        // Set up the popup HTML structure.
        document.body.innerHTML = '<div id="root"></div>';
        jest.clearAllMocks();
        require('../src/popup.js');
        document.dispatchEvent(new Event("DOMContentLoaded"));
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should render timer entries with correct tab title, remaining time, and control buttons", (done) => {
        const fakeNow = Date.now();
        const activeTimer = {
            timerId: "1",
            tabTitle: "Active Tab",
            originalDuration: 120,
            startTime: fakeNow,
            targetTime: fakeNow + 60 * 1000,  // 60 seconds remaining
            paused: false
        };

        const pausedTimer = {
            timerId: "2",
            tabTitle: "Paused Tab",
            originalDuration: 300,
            paused: true,
            remaining: 100  // 100 seconds remaining directly provided
        };

        jest.spyOn(chrome.runtime, 'sendMessage').mockImplementation((msg, callback) => {
            if (msg.action === "getTimers") {
                callback({ timers: [activeTimer, pausedTimer] });
            } else {
                // For control messages, simply call the callback.
                callback({ status: "ok" });
            }
        });

        setTimeout(() => {
            const timersList = document.getElementById("timersList");
            const timerEntries = timersList.querySelectorAll(".timer-card");
            expect(timerEntries.length).toBe(2);

            // Verify active timer entry.
            const activeEntry = timerEntries[0].innerHTML;
            expect(activeEntry).toContain("Active Tab");
            expect(activeEntry).toContain("00:01:00");
            expect(activeEntry).toContain("pause-btn");

            // Verify paused timer entry.
            const pausedEntry = timerEntries[1].innerHTML;
            expect(pausedEntry).toContain("Paused Tab");
            expect(pausedEntry).toContain("00:01:40");
            expect(pausedEntry).toContain("resume-btn");

            // Both entries should contain reset and cancel button markers.
            expect(activeEntry).toContain("reset-btn");
            expect(activeEntry).toContain("cancel-btn");
            expect(pausedEntry).toContain("reset-btn");
            expect(pausedEntry).toContain("cancel-btn");

            // Simulate a click on the active timer's pause button.
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

