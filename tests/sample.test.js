const { createChromeMock } = require('../mocks/chrome');
global.chrome = createChromeMock();

describe('Chrome API Mocks', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    test('chrome.storage.local.set should be a function and call its callback', () => {
        const data = { key: 'value' };
        const callback = jest.fn();
        chrome.storage.local.set(data, callback);
        expect(typeof chrome.storage.local.set).toBe('function');
        expect(callback).toHaveBeenCalled();
    });

    test('chrome.storage.local.get should call its callback with default value', () => {
        const callback = jest.fn();
        chrome.storage.local.get('someKey', callback);
        expect(callback).toHaveBeenCalledWith({});
    });

    test('chrome.storage.sync.get should call callback with default value', () => {
        const callback = jest.fn();
        chrome.storage.sync.get('someKey', callback);
        expect(callback).toHaveBeenCalledWith({});
    });

    test('chrome.storage.sync.set should be a function and call its callback', () => {
        const data = { key: 'value' };
        const callback = jest.fn();
        chrome.storage.sync.set(data, callback);
        expect(typeof chrome.storage.sync.set).toBe('function');
        expect(callback).toHaveBeenCalled();
    });

    test('chrome.alarms.create should be called with correct parameters', () => {
        const alarmName = 'testAlarm';
        const alarmInfo = { delayInMinutes: 1 };
        chrome.alarms.create(alarmName, alarmInfo);
        expect(chrome.alarms.create).toHaveBeenCalledWith(alarmName, alarmInfo);
    });

    test('chrome.alarms.clear should call callback with true', () => {
        const callback = jest.fn();
        chrome.alarms.clear('alarmId', callback);
        expect(callback).toHaveBeenCalledWith(true);
    });

    test('chrome.notifications.create should create a notification', () => {
        const options = { type: 'basic', title: 'Test', message: 'This is a test', iconUrl: 'icon.png' };
        chrome.notifications.create(options);
        expect(chrome.notifications.create).toHaveBeenCalledWith(options);
    });

    test('chrome.tabs.remove should remove a tab and call its callback', () => {
        const tabId = 123;
        const callback = jest.fn();
        chrome.tabs.remove(tabId, callback);
        expect(chrome.tabs.remove).toHaveBeenCalledWith(tabId, expect.any(Function));
        expect(callback).toHaveBeenCalled();
    });

    test('chrome.runtime.sendMessage should be a function', () => {
        expect(typeof chrome.runtime.sendMessage).toBe('function');
        // Optionally, you can call it with a test message
        const callback = jest.fn();
        chrome.runtime.sendMessage({ action: 'test' }, callback);
        // Note: In our mock, sendMessage may not trigger callback unless we manually call it.
        // So here we just check that it was called.
        expect(chrome.runtime.sendMessage).toHaveBeenCalledWith({ action: 'test' }, callback);
    });

    test('chrome.runtime.onMessage.addListener should be a function', () => {
        expect(typeof chrome.runtime.onMessage.addListener).toBe('function');
        const listener = jest.fn();
        chrome.runtime.onMessage.addListener(listener);
        expect(chrome.runtime.onMessage.addListener).toHaveBeenCalledWith(listener);
    });
});