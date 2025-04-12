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

// tests for resumeTimer() functionality

const { resumeTimer } = require('../src/background.js'); // Adjust the path if necessary

describe('resumeTimer', () => {
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

    test('should resume a paused timer by recalculating startTime and targetTime and schedule a new alarm for the remaining duration', (done) => {
        const timerId = 'testResumeTimer';
        const key = 'timer_' + timerId;
        const remainingDuration = 20; // seconds remaining when paused

        // Setup a paused timer object.
        const pausedTimer = {
            timerId,
            tabId: 1,
            tabTitle: 'Test Tab',
            originalDuration: 60,
            paused: true,
            remaining: remainingDuration  // paused timer stores the remaining seconds
        };

        // Mock chrome.storage.local.get to return our paused timer object.
        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: pausedTimer });
        });

        // Call the function under test.
        resumeTimer(timerId, () => {
            // Verify that chrome.storage.local.set was called with the updated timer object.
            const setCallArg = chrome.storage.local.set.mock.calls[0][0];
            const updatedTimer = setCallArg[key];

            expect(updatedTimer).toBeDefined();
            // The timer should no longer be paused.
            expect(updatedTimer.paused).toBe(false);
            // The remaining property should be removed.
            expect(updatedTimer.remaining).toBeUndefined();

            // Check that startTime is recalculated to be the current time.
            const currentTime = Date.now();
            expect(updatedTimer.startTime).toBe(currentTime);
            // And targetTime is the current time plus the remaining duration (converted to milliseconds)
            expect(updatedTimer.targetTime).toBe(currentTime + remainingDuration * 1000);

            // Confirm that a new alarm is scheduled with the remaining duration.
            expect(chrome.alarms.create).toHaveBeenCalledWith(
                timerId,
                { delayInMinutes: remainingDuration / 60 }
            );
            done();
        });
    });
});

