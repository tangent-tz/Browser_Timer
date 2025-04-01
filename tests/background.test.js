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
