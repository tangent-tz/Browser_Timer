const { createChromeMock } = require("../mocks/chrome");
global.chrome = createChromeMock();
const background = require("../src/background.js");

const { startTimer, pauseTimer, resumeTimer, resetTimer, cancelTimer } = background;
const alarmListener = chrome.alarms.onAlarm.addListener.mock.calls[0][0];
const runtimeMessageListener = chrome.runtime.onMessage.addListener.mock.calls[0][0];

describe("startTimer", () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        originalDateNow = Date.now;
        Date.now = jest.fn(() => 1000000);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should save timer data with default completion action and schedule alarm", () => {
        const timerId = "testTimerId";
        const tabId = 1;
        const tabTitle = "Test Tab";
        const duration = 60;
        const key = "timer_" + timerId;
        const startTime = Date.now();
        const targetTime = startTime + duration * 1000;

        startTimer(timerId, tabId, tabTitle, duration);

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                [key]: expect.objectContaining({
                    timerId,
                    tabId,
                    tabTitle,
                    originalDuration: duration,
                    startTime,
                    targetTime,
                    paused: false,
                    completionAction: "closeTab"
                })
            }),
            expect.any(Function)
        );
        expect(chrome.alarms.create).toHaveBeenCalledWith(timerId, { delayInMinutes: duration / 60 });
    });

    test("should persist notifyOnly completion action without changing notification toggle", () => {
        startTimer("notifyTimer", 1, "Test Tab", 60, "icons/timer.svg", "notifyOnly");

        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                timer_notifyTimer: expect.objectContaining({
                    completionAction: "notifyOnly"
                })
            }),
            expect.any(Function)
        );
        expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });
});

describe("pauseTimer", () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        originalDateNow = Date.now;
        Date.now = jest.fn(() => 1000000);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should update timer state to paused with correct remaining time and clear alarm", (done) => {
        const timerId = "testTimer";
        const key = "timer_" + timerId;
        const fakeTimer = {
            timerId,
            tabId: 1,
            tabTitle: "Test Tab",
            originalDuration: 60,
            startTime: Date.now(),
            targetTime: Date.now() + 30000,
            paused: false,
            completionAction: "closeTab"
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

describe("resumeTimer", () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        originalDateNow = Date.now;
        Date.now = jest.fn(() => 1000000);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should resume paused timer and schedule a new alarm", (done) => {
        const timerId = "testResumeTimer";
        const key = "timer_" + timerId;
        const remainingDuration = 20;
        const pausedTimer = {
            timerId,
            tabId: 1,
            tabTitle: "Test Tab",
            originalDuration: 60,
            paused: true,
            remaining: remainingDuration,
            completionAction: "notifyOnly"
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: pausedTimer });
        });

        resumeTimer(timerId, () => {
            const updatedTimer = chrome.storage.local.set.mock.calls[0][0][key];
            const currentTime = Date.now();
            expect(updatedTimer.paused).toBe(false);
            expect(updatedTimer.remaining).toBeUndefined();
            expect(updatedTimer.startTime).toBe(currentTime);
            expect(updatedTimer.targetTime).toBe(currentTime + remainingDuration * 1000);
            expect(chrome.alarms.create).toHaveBeenCalledWith(timerId, {
                delayInMinutes: remainingDuration / 60
            });
            done();
        });
    });
});

describe("resetTimer", () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        originalDateNow = Date.now;
        Date.now = jest.fn(() => 1000000);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should reset targetTime based on originalDuration and re-schedule alarm", (done) => {
        const timerId = "testReset";
        const key = "timer_" + timerId;
        const fakeTimer = {
            timerId,
            tabId: 1,
            tabTitle: "Test Tab",
            originalDuration: 120,
            startTime: Date.now() - 30000,
            targetTime: Date.now() + 90000,
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
            expect(chrome.alarms.create).toHaveBeenCalledWith(timerId, {
                delayInMinutes: fakeTimer.originalDuration / 60
            });
            done();
        });
    });
});

describe("cancelTimer", () => {
    const timerId = "testCancelTimer";
    const key = "timer_" + timerId;

    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should remove timer from storage and clear associated alarm", (done) => {
        cancelTimer(timerId, () => {
            expect(chrome.storage.local.remove).toHaveBeenCalledWith(key, expect.any(Function));
            expect(chrome.alarms.clear).toHaveBeenCalledWith(timerId, expect.any(Function));
            done();
        });
    });
});

describe("alarm completion behavior", () => {
    let originalDateNow;

    beforeEach(() => {
        jest.clearAllMocks();
        originalDateNow = Date.now;
        Date.now = jest.fn(() => 1000000);
    });

    afterEach(() => {
        Date.now = originalDateNow;
    });

    test("should close tab and clean timer when completion action is closeTab", () => {
        const timerId = "alarmClose";
        const key = "timer_" + timerId;
        const timerObj = {
            timerId,
            tabId: 444,
            tabTitle: "Close Tab Timer",
            targetTime: Date.now() - 1000,
            paused: false,
            completionAction: "closeTab"
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: timerObj });
        });
        chrome.storage.sync.get.mockImplementation((storageKey, callback) => {
            callback({ notificationsEnabled: true });
        });

        alarmListener({ name: timerId });

        expect(chrome.tabs.remove).toHaveBeenCalledWith(444, expect.any(Function));
        expect(chrome.notifications.create).toHaveBeenCalled();
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(key, expect.any(Function));
        expect(chrome.storage.sync.set).not.toHaveBeenCalled();
    });

    test("should not close tab and always notify for notifyOnly", () => {
        const timerId = "alarmNotify";
        const key = "timer_" + timerId;
        const timerObj = {
            timerId,
            tabId: 555,
            tabTitle: "Notify Timer",
            targetTime: Date.now() - 1000,
            paused: false,
            completionAction: "notifyOnly"
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: timerObj });
        });
        chrome.storage.sync.get.mockImplementation((storageKey, callback) => {
            callback({ notificationsEnabled: false });
        });

        alarmListener({ name: timerId });

        expect(chrome.tabs.remove).not.toHaveBeenCalled();
        expect(chrome.storage.sync.set).not.toHaveBeenCalled();
        expect(chrome.notifications.create).toHaveBeenCalled();
        expect(chrome.storage.local.remove).toHaveBeenCalledWith(key, expect.any(Function));
    });

    test("should default legacy timers without action to closeTab", () => {
        const timerId = "alarmLegacy";
        const timerObj = {
            timerId,
            tabId: 666,
            tabTitle: "Legacy Timer",
            targetTime: Date.now() - 1000,
            paused: false
        };

        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: timerObj });
        });
        chrome.storage.sync.get.mockImplementation((storageKey, callback) => {
            callback({ notificationsEnabled: true });
        });

        alarmListener({ name: timerId });

        expect(chrome.tabs.remove).toHaveBeenCalledWith(666, expect.any(Function));
    });
});

describe("runtime message actions", () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test("should update timer completion action through setTimerCompletionAction message", () => {
        const timerId = "1";
        const key = "timer_" + timerId;
        const timerObj = {
            timerId,
            tabId: 123,
            tabTitle: "Test Tab",
            completionAction: "closeTab"
        };
        chrome.storage.local.get.mockImplementation((getKey, callback) => {
            callback({ [getKey]: timerObj });
        });
        chrome.storage.sync.get.mockImplementation((storageKey, callback) => {
            callback({ notificationsEnabled: false });
        });

        const sendResponse = jest.fn();
        const returned = runtimeMessageListener(
            { action: "setTimerCompletionAction", timerId, completionAction: "notifyOnly" },
            {},
            sendResponse
        );

        expect(returned).toBe(true);
        expect(chrome.storage.sync.set).toHaveBeenCalledWith(
            { notificationsEnabled: true },
            expect.any(Function)
        );
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                [key]: expect.objectContaining({ completionAction: "notifyOnly" })
            }),
            expect.any(Function)
        );
        expect(sendResponse).toHaveBeenCalledWith(
            expect.objectContaining({
                status: "Timer 1 action set",
                timer: expect.objectContaining({ completionAction: "notifyOnly" })
            })
        );
    });

    test("should preserve existing completion action when startTimer updates an existing timer", () => {
        const timerId = "existing1";
        const key = "timer_" + timerId;
        const existingTimer = {
            timerId,
            tabId: 123,
            tabTitle: "Test Tab",
            tabFavicon: "icons/timer.svg",
            originalDuration: 30,
            startTime: 900000,
            targetTime: 930000,
            paused: false,
            completionAction: "notifyOnly"
        };
        chrome.storage.local.get.mockImplementation((requestedKey, callback) => {
            if (requestedKey === null) {
                callback({ [key]: existingTimer });
                return;
            }
            if (requestedKey === key) {
                callback({ [key]: existingTimer });
                return;
            }
            callback({});
        });

        const sendResponse = jest.fn();
        const returned = runtimeMessageListener(
            { action: "startTimer", duration: 120, completionAction: "closeTab" },
            {},
            sendResponse
        );

        expect(returned).toBe(true);
        expect(chrome.storage.local.set).toHaveBeenCalledWith(
            expect.objectContaining({
                [key]: expect.objectContaining({
                    originalDuration: 120,
                    completionAction: "notifyOnly"
                })
            }),
            expect.any(Function)
        );
        expect(sendResponse).toHaveBeenCalledWith({ status: "Timer updated", timerId });
    });
});
