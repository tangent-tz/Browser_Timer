const { createChromeMock } = require('../mocks/chrome');
global.chrome = createChromeMock();
const { updateBadge } = require('../src/background.js');
const fixedTime = 1000000;

describe('Badge Update Logic', () => {
    beforeEach(() => {
        jest.spyOn(Date, 'now').mockReturnValue(fixedTime);
        global.chrome.tabs.query = jest.fn((query, cb) => {
            cb([{ id: 1 }]);
        });

        global.chrome.action = {
            setBadgeText: jest.fn()
        };
    });

    afterEach(() => {
        jest.restoreAllMocks();
    });

    test('displays the correct remaining time on the badge for an active timer', (done) => {
        const timer = {
            timerId: "test_timer",
            tabId: 1,
            tabTitle: "Active Tab",
            originalDuration: 120,
            startTime: fixedTime,
            targetTime: fixedTime + 120 * 1000,
            paused: false
        };

        global.chrome.storage.local.get = jest.fn((key, cb) => {
            cb({ "timer_test_timer": timer });
        });
        updateBadge();
        expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "02:00", tabId: 1 });
        done();
    });

    test('clears the badge when no active timer is found for the active tab', (done) => {
        global.chrome.storage.local.get = jest.fn((key, cb) => {
            cb({});
        });
        updateBadge();
        expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId: 1 });
        done();
    });

    test('updates the badge when the active tab changes', (done) => {
        const timer = {
            timerId: "test_timer",
            tabId: 1,
            tabTitle: "Active Tab",
            originalDuration: 120,
            startTime: fixedTime,
            targetTime: fixedTime + 120 * 1000,
            paused: false
        };
        global.chrome.storage.local.get = jest.fn((key, cb) => {
            cb({ "timer_test_timer": timer });
        });

        global.chrome.tabs.query = jest.fn((query, cb) => {
            cb([{ id: 1 }]);
        });
        global.chrome.action.setBadgeText = jest.fn();

        updateBadge();
        expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "02:00", tabId: 1 });

        global.chrome.tabs.query.mockImplementation((query, cb) => {
            cb([{ id: 2 }]);
        });
        global.chrome.storage.local.get.mockImplementation((key, cb) => {
            cb({});
        });
        updateBadge();
        expect(global.chrome.action.setBadgeText).toHaveBeenCalledWith({ text: "", tabId: 2 });
        done();
    });
});