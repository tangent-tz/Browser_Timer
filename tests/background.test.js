// tests/background.test.js
global.chrome = require('../mocks/chrome'); // Adjust if your mocks folder is named differently

const { startTimer } = require('../src/background.js'); // Update the path if necessary

describe('startTimer', () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        // Override Date.now() for predictable timing
        originalDateNow = Date.now;
        const fakeTime = 1000000;
        Date.now = jest.fn(() => fakeTime);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test('should save timer data to storage and schedule an alarm correctly', () => {
        const timerId = 'testTimerId';
        const tabId = 1;
        const tabTitle = 'Test Tab';
        const duration = 60; // seconds
        const startTime = Date.now();
        const targetTime = startTime + duration * 1000;
        const key = 'timer_' + timerId;

        // Call the function under test
        startTimer(timerId, tabId, tabTitle, duration);

        // Verify that chrome.storage.local.set was called with a timer object containing the correct properties
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                [key]: expect.objectContaining({
                    timerId: timerId,
                    tabId: tabId,
                    tabTitle: tabTitle,
                    originalDuration: duration,
                    startTime:startTime,
                    targetTime:targetTime,
                    paused: false,
                }),
            }),
            expect.any(Function)
        );

        // Verify that chrome.alarms.create was called with the correct timerId and delay (in minutes)
        expect(chrome.alarms.create).toHaveBeenCalledWith(
            timerId,
            { delayInMinutes: duration / 60 }
        );
    });
});

const { pauseTimer } = require('../src/background.js');

describe('pauseTimer', () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        // Fix the current time for predictable results.
        originalDateNow = Date.now;
        const fakeTime = 1000000;
        Date.now = jest.fn(() => fakeTime);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test('should update timer state to paused with correct remaining time and clear the alarm', (done) => {
        const timerId = 'testTimer';
        const key = 'timer_' + timerId;
        // Set up a fake active timer with targetTime 30 seconds in the future.
        const fakeTimer = {
            timerId,
            tabId: 1,
            tabTitle: 'Test Tab',
            originalDuration: 60,
            startTime: Date.now(),
            targetTime: Date.now() + 30000, // 30 seconds remaining
            paused: false
        };

        // Override chrome.storage.local.get to return our fake timer.
        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: fakeTimer });
        });

        // Call pauseTimer and verify its behavior in the callback.
        pauseTimer(timerId, () => {
            // Check that chrome.storage.local.set was called with the updated timer object.
            const setCallArg = chrome.storage.local.set.mock.calls[0][0];
            expect(setCallArg[key]).toBeDefined();
            expect(setCallArg[key].paused).toBe(true);
            expect(setCallArg[key].remaining).toBe(30);
            // Ensure that startTime and targetTime have been removed.
            expect(setCallArg[key].startTime).toBeUndefined();
            expect(setCallArg[key].targetTime).toBeUndefined();

            // Verify that chrome.alarms.clear was called with the timerId.
            expect(chrome.alarms.clear).toHaveBeenCalledWith(timerId, expect.any(Function));

            done();
        });
    });
});
