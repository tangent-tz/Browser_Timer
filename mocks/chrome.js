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
        query: jest.fn((queryInfo, callback) => {
            callback && callback([{ id: 123, title: "Test Tab", favIconUrl: "icons/timer.svg" }]);
        }),
        remove: jest.fn((tabId, callback) => callback && callback()),
        onRemoved: {
            addListener: jest.fn()
        },
        onActivated: {
            addListener: jest.fn()
        },
        onUpdated: {
            addListener: jest.fn()
        },
    };
}

function createRuntimeMock() {
    return {
        sendMessage: jest.fn(),
        onMessage: {
            addListener: jest.fn()
        },
        onStartup: {
            addListener: jest.fn()
        },
        lastError: undefined
    };
}

function createI18nMock() {
    // English locale messages for testing
    const messages = {
        extensionName: "Auto Tab Timer",
        extensionDescription: "Automatically closes tabs after a countdown.",
        extensionTitle: "Auto Tab Timer",
        tabTimer: "Timer",
        tabSettings: "Settings",
        hoursLabel: "Hours",
        minutesLabel: "Minutes",
        secondsLabel: "Seconds",
        startTimerButton: "Start Timer",
        completionActionLabel: "Default action on completion",
        actionCloseTab: "Close tab",
        actionNotifyOnly: "Notify me only",
        timerActionLabel: "Action",
        enableNotifications: "Notify on action completion",
        statusLabel: "Status:",
        statusRunning: "Running",
        statusPaused: "Paused",
        remainingLabel: "Remaining:",
        pauseButton: "Pause",
        resumeButton: "Resume",
        resetButton: "Reset",
        cancelButton: "Cancel",
        notificationTitle: "Timer Finished",
        notificationMessage: "Timer on \"$1\" completed.",
        timerAltIcon: "Timer Icon",
        settingsAltIcon: "Settings Icon",
        tabAltIcon: "Tab Icon",
        timerInputError: "Enter a time greater than 00:00:00.",
        notifyOnlyHint: "\"Notify me only\" always sends a notification when the timer ends. It ignores the toggle above and leaves the tab open.",
        timersCount_one: "$1 timer active",
        timersCount_other: "$1 timers active",
        badgeHours: "$1:$2",
        badgeMinutes: "$1:$2"
    };

    return {
        getMessage: jest.fn((key, substitutions) => {
            let message = messages[key] || "";
            if (substitutions) {
                substitutions.forEach((sub, index) => {
                    message = message.replace(`$${index + 1}`, sub);
                });
            }
            return message;
        })
    };
}

function createActionMock() {
    return {
        setBadgeText: jest.fn()
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
        runtime: createRuntimeMock(),
        i18n: createI18nMock(),
        action: createActionMock()
    };
}

module.exports = { createChromeMock };
