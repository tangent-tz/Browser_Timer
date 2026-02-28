const { createChromeMock } = require('../mocks/chrome');
global.chrome = createChromeMock();
const { startTimer } = require('../src/background.js'); // Update the path if necessary
const alarmListener = chrome.alarms.onAlarm.addListener.mock.calls[0][0];

describe('startTimer', () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
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

        startTimer(timerId, tabId, tabTitle, duration);

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
        const fakeTimer = {
            timerId,
            tabId: 1,
            tabTitle: 'Test Tab',
            originalDuration: 60,
            startTime: Date.now(),
            targetTime: Date.now() + 30000, // 30 seconds remaining
            paused: false
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: fakeTimer });
        });

        pauseTimer(timerId, () => {
            const setCallArg = chrome.storage.local.set.mock.calls[0][0];
            expect(setCallArg[key]).toBeDefined();
            expect(setCallArg[key].paused).toBe(true);
            expect(setCallArg[key].remaining).toBe(30);
            expect(setCallArg[key].startTime).toBeUndefined();
            expect(setCallArg[key].targetTime).toBeUndefined();
            expect(chrome.alarms.clear).toHaveBeenCalledWith(timerId, expect.any(Function));

            done();
        });
    });
});


const { resumeTimer } = require('../src/background.js'); // Adjust the path if necessary

describe('resumeTimer', () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
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

        const pausedTimer = {
            timerId,
            tabId: 1,
            tabTitle: 'Test Tab',
            originalDuration: 60,
            paused: true,
            remaining: remainingDuration  // paused timer stores the remaining seconds
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: pausedTimer });
        });

        resumeTimer(timerId, () => {
            const setCallArg = chrome.storage.local.set.mock.calls[0][0];
            const updatedTimer = setCallArg[key];

            expect(updatedTimer).toBeDefined();
            expect(updatedTimer.paused).toBe(false);
            expect(updatedTimer.remaining).toBeUndefined();
            const currentTime = Date.now();
            expect(updatedTimer.startTime).toBe(currentTime);
            expect(updatedTimer.targetTime).toBe(currentTime + remainingDuration * 1000);
            expect(chrome.alarms.create).toHaveBeenCalledWith(
                timerId,
                { delayInMinutes: remainingDuration / 60 }
            );
            done();
        });
    });
});


const { resetTimer } = require('../src/background.js'); // Adjust the path if necessary
describe('resetTimer', () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        originalDateNow = Date.now;
        const fixedTime = 1000000; // fixed current time
        Date.now = jest.fn(() => fixedTime);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test('should reset targetTime based on originalDuration and re-schedule the alarm', (done) => {
        const timerId = 'testReset';
        const key = 'timer_' + timerId;
        const fakeTimer = {
            timerId,
            tabId: 1,
            tabTitle: 'Test Tab',
            originalDuration: 120, // seconds (2 minutes)
            startTime: Date.now() - 30000,  // started 30 seconds ago
            targetTime: Date.now() + 90000, // originally 90 seconds remaining
            paused: false
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: fakeTimer });
        });

        resetTimer(timerId, () => {
            const expectedTargetTime = Date.now() + fakeTimer.originalDuration * 1000;
            const updatedTimer = chrome.storage.local.set.mock.calls[0][0][key];

            expect(updatedTimer.timerId).toBe(timerId);
            expect(updatedTimer.originalDuration).toBe(fakeTimer.originalDuration);
            expect(updatedTimer.targetTime).toBe(expectedTargetTime);
            expect(updatedTimer.paused).toBe(false);
            expect(chrome.alarms.create).toHaveBeenCalledWith(
                timerId,
                { delayInMinutes: fakeTimer.originalDuration / 60 }
            );

            done();
        });
    });
});

const { cancelTimer } = require('../src/background.js'); // Adjust path as needed

describe('cancelTimer', () => {
    const timerId = 'testCancelTimer';
    const key = 'timer_' + timerId;

    beforeEach(() => {
        jest.clearAllMocks();

        chrome.storage.local.set({ [key]: {
                timerId,
                tabId: 1,
                tabTitle: 'Test Tab',
                originalDuration: 60,
                startTime: Date.now(),
                targetTime: Date.now() + 60000,
                paused: false
            }}, () => {});

        chrome.alarms.create(timerId, { delayInMinutes: 1 });
    });

    test('should remove timer from storage and clear associated alarm', (done) => {
        cancelTimer(timerId, () => {
            expect(chrome.storage.local.remove).toHaveBeenCalledWith(key, expect.any(Function));
            expect(chrome.alarms.clear).toHaveBeenCalledWith(timerId, expect.any(Function));

            done();
        });
    });
});

describe('alarm completion behavior', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('should notify and keep tab open in notify-only mode', () => {
        const timerId = 'notifyOnlyTimer';
        const key = 'timer_' + timerId;

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({
                [getKey]: {
                    timerId,
                    tabId: 123,
                    tabTitle: 'Test Tab',
                    targetTime: Date.now() - 1000,
                    paused: false
                }
            });
        });
        chrome.storage.sync.get.mockImplementation((getKeys, callback) => {
            callback({
                notificationsEnabled: false,
                closeTabOnExpire: false
            });
        });

        alarmListener({ name: timerId });

        expect(chrome.notifications.create).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Timer Finished'
            })
        );
        expect(chrome.tabs.remove).not.toHaveBeenCalled();
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(key, expect.any(Function));
    });

    test('should close tab without notification when close mode is enabled and notifications are disabled', () => {
        const timerId = 'closeModeTimer';
        const key = 'timer_' + timerId;

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({
                [getKey]: {
                    timerId,
                    tabId: 456,
                    tabTitle: 'Close Tab',
                    targetTime: Date.now() - 1000,
                    paused: false
                }
            });
        });
        chrome.storage.sync.get.mockImplementation((getKeys, callback) => {
            callback({
                notificationsEnabled: false,
                closeTabOnExpire: true
            });
        });

        alarmListener({ name: timerId });

        expect(chrome.notifications.create).not.toHaveBeenCalled();
        expect(chrome.tabs.remove).toHaveBeenCalledWith(456, expect.any(Function));
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(key, expect.any(Function));
    });
});
