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
        create: jest.fn((createProperties, callback) => callback && callback({ id: 456 })),
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
        getManifest: jest.fn(() => ({ version: "1.3.0" })),
        getURL: jest.fn((path) => path),
        onMessage: {
            addListener: jest.fn()
        },
        onInstalled: {
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
        onboardingInstallTitle: "Welcome to Auto Tab Timer",
        onboardingInstallSubtitle: "Set timers on active tabs, then relax while Auto Tab Timer handles the cleanup.",
        onboardingUpdateTitle: "What's New in 1.3.0",
        onboardingUpdateSubtitle: "Auto Tab Timer now includes a guided update page and developer recommendations.",
        whatsNew130Heading: "Highlights in 1.3.0",
        whatsNew130Item1: "New install onboarding page with quick-start guidance.",
        whatsNew130Item2: "New one-time update page for users upgrading into 1.3.0.",
        whatsNew130Item3: "Developer extension recommendations are now available in onboarding.",
        whatsNew130Item4: "New install onboarding and one-time 1.3.0 update page are now live.",
        whatsNew130Item5: "No new permissions are required, and existing workflows continue as before.",
        promoSectionTitle: "More extensions from this developer",
        promoSectionSubtitle: "Discover other tools you may want to install.",
        promoOpenChromeStore: "Open in Chrome Web Store",
        promoOpenEdgeStore: "Open in Edge Add-ons",
        promoDeveloperProfileLink: "View all extensions",
        promoUnavailableFallback: "Promotion cards are currently unavailable.",
        promoExt1Title: "Placeholder Extension One",
        promoExt1Description: "TODO: Replace with final extension title and description before release.",
        promoExt2Title: "Placeholder Extension Two",
        promoExt2Description: "TODO: Replace with final extension title and description before release.",
        promoExt3Title: "Placeholder Extension Three",
        promoExt3Description: "TODO: Replace with final extension title and description before release.",
        installGuideHeading: "Quick Start for First-Time Installers",
        installGuideIntro: "Follow these steps to set up your first timer and understand key controls.",
        installGuideStep1: "Pin Auto Tab Timer to your toolbar so it is always one click away.",
        installGuideStep2: "Open the tab you want to manage, then open the extension popup.",
        installGuideStep3: "Enter hours, minutes, and seconds, then click Start Timer.",
        installGuideStep4: "Choose completion action: Close tab or Notify me only.",
        installGuideStep5: "Use Pause, Resume, Reset, or Cancel from the active timer card as needed.",
        installGuideStep6: "Open Settings to choose your default completion action and notification behavior.",
        installGuideTipsHeading: "Practical Tips",
        installGuideTip1: "00:00:00 is invalid. The extension shows an inline error and prevents start.",
        installGuideTip2: "Minutes and seconds are normalized to 0..59, and hours are normalized to 0..999.",
        installGuideTip3: "Notify me only always sends a notification and keeps the tab open.",
        installGuideTip4: "Close tab action can send notifications based on your notification toggle.",
        installGuidePrivacy: "No account is required. Settings and timer state are stored in your browser extension storage.",
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
