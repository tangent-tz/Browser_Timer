function createStorageLocalMock() {
    return {
        set: jest.fn((data, callback) => callback && callback()),
        get: jest.fn((key, callback) => callback && callback({})),
        remove: jest.fn((key, callback) => callback && callback())
    };
}

function createStorageSyncMock() {
    return {
        get: jest.fn((key, callback) => callback && callback({})),
        set: jest.fn((data, callback) => callback && callback())
    };
}

function createAlarmsMock() {
    return {
        create: jest.fn(),
        clear: jest.fn((id, callback) => callback && callback(true)),
        onAlarm: {
            addListener: jest.fn()
        }
    };
}

function createNotificationsMock() {
    return {
        create: jest.fn()
    };
}

function createTabsMock() {
    return {
        remove: jest.fn((tabId, callback) => callback && callback()),
        onRemoved: {
            addListener: jest.fn()
        },
        onActivated: {
            addListener: jest.fn()
        }
    };
}

function createRuntimeMock() {
    return {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        }
    };
}

function createChromeMock() {
    return {
        storage: {
            local: createStorageLocalMock(),
            sync: createStorageSyncMock()
        },
        alarms: createAlarmsMock(),
        notifications: createNotificationsMock(),
        tabs: createTabsMock(),
        runtime: createRuntimeMock()
    };
}

module.exports = { createChromeMock };
