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
    clear: jest.fn((id, callback) => callback && callback(true))
};

const notifications = {
    create: jest.fn()
};

const tabs = {
    remove: jest.fn((tabId, callback) => callback && callback())
};

module.exports = {
    storage: {
        local: storageLocal,
        sync: storageSync
    },
    alarms,
    notifications,
    tabs,
    runtime: {
        onMessage: {
            addListener: jest.fn()
        }
    }
};
