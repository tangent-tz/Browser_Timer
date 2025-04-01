global.chrome = require('chrome');

describe('Chrome API Mocks', () => {
    beforeEach(() => {
        // Clear all mock calls before each test
        jest.clearAllMocks();
    });

    test('chrome.storage.local.set should be a function and call its callback', () => {
        const data = { key: 'value' };
        const callback = jest.fn();
        chrome.storage.local.set(data, callback);
        expect(typeof chrome.storage.local.set).toBe('function');
        expect(callback).toHaveBeenCalled();
    });

    test('chrome.alarms.create should be called with correct parameters', () => {
        const alarmName = 'testAlarm';
        const alarmInfo = { delayInMinutes: 1 };
        chrome.alarms.create(alarmName, alarmInfo);
        expect(chrome.alarms.create).toHaveBeenCalledWith(alarmName, alarmInfo);
    });

    test('chrome.notifications.create should create a notification', () => {
        const options = { type: 'basic', title: 'Test', message: 'This is a test', iconUrl: 'icon.png' };
        chrome.notifications.create(options);
        expect(chrome.notifications.create).toHaveBeenCalledWith(options);
    });

    test('chrome.tabs.remove should remove a tab', () => {
        const tabId = 123;
        const callback = jest.fn();
        chrome.tabs.remove(tabId, callback);
        expect(chrome.tabs.remove).toHaveBeenCalledWith(tabId, expect.any(Function));
        expect(callback).toHaveBeenCalled();
    });
});
