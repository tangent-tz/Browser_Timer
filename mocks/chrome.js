const storageLocal = {
    set: jest.fn((data, callback) => callback && callback()),
    get: jest.fn((key, callback) => callback && callback({})),
    remove: jest.fn((key, callback) => callback && callback())
};

const storageSync = {
    get: jest.fn((key, callback) => callback && callback({})),
    set: jest.fn((data, callback) => callback && callback())
};

const alarms = {
    create: jest.fn(),
    clear: jest.fn((id, callback) => callback && callback(true)),
    onAlarm: {
        addListener: jest.fn()
    }
};

const notifications = {
    create: jest.fn()
};

const tabs = {
    remove: jest.fn((tabId, callback) => callback && callback()),
    onRemoved: {
        addListener: jest.fn()
    }
};

module.exports = {
    storage: {
        sync: {
            get: jest.fn((key, callback) => callback({ notificationsEnabled: true })),
            set: jest.fn(),
        },
    },
    alarms,
    notifications,
    tabs,
    runtime: {
        sendMessage: jest.fn(),  // mock the sendMessage function
        onMessage: {
            addListener: jest.fn(),
        },
    }
};
