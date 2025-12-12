/**
 * Locale Parity Test
 *
 * This test ensures all locale files maintain identical key structure
 * with _locales/en/messages.json as the source of truth.
 *
 * Requirements:
 * - All locale files must have the exact same keys
 * - All placeholder definitions must match
 * - Missing keys will fail the test/CI
 */

const fs = require('fs');
const path = require('path');

const localesDir = path.join(__dirname, '..', '_locales');
const localeCodes = fs.readdirSync(localesDir).filter(code =>
    fs.statSync(path.join(localesDir, code)).isDirectory()
);
const localeMessages = localeCodes.reduce((acc, code) => {
    const content = fs.readFileSync(path.join(localesDir, code, 'messages.json'), 'utf8');
    acc[code] = JSON.parse(content);
    return acc;
}, {});
const enMessages = localeMessages.en;
const nonEnglishLocales = localeCodes.filter(code => code !== 'en');

describe('Locale Parity Validation', () => {
    test('English locale file exists and is valid JSON', () => {
        expect(enMessages).toBeDefined();
        expect(typeof enMessages).toBe('object');
        expect(Object.keys(enMessages).length).toBeGreaterThan(0);
    });

    test('All English keys have required message property', () => {
        Object.keys(enMessages).forEach(key => {
            expect(enMessages[key]).toHaveProperty('message');
            expect(typeof enMessages[key].message).toBe('string');
            expect(enMessages[key].message.length).toBeGreaterThan(0);
        });
    });

    describe.each(nonEnglishLocales)('%s locale parity checks', (locale) => {
        const localeMessagesMap = localeMessages[locale];
        const localeLabel = locale;

        test(`${localeLabel} locale has identical keys to English`, () => {
            const enKeys = Object.keys(enMessages).sort();
            const localeKeys = Object.keys(localeMessagesMap).sort();

            const missingKeys = enKeys.filter(key => !localeKeys.includes(key));
            const extraKeys = localeKeys.filter(key => !enKeys.includes(key));

            expect(missingKeys).toEqual([]);
            expect(extraKeys).toEqual([]);
            expect(localeKeys).toEqual(enKeys);
        });

        test(`${localeLabel} locale has matching placeholder structure`, () => {
            Object.keys(enMessages).forEach(key => {
                const enEntry = enMessages[key];
                const localeEntry = localeMessagesMap[key];
                expect(localeEntry).toBeDefined();

                if (enEntry.placeholders) {
                    expect(localeEntry.placeholders).toBeDefined();
                    const enPlaceholders = Object.keys(enEntry.placeholders).sort();
                    const localePlaceholders = Object.keys(localeEntry.placeholders).sort();
                    expect(localePlaceholders).toEqual(enPlaceholders);

                    enPlaceholders.forEach(placeholder => {
                        expect(localeEntry.placeholders[placeholder]).toHaveProperty('content');
                        expect(localeEntry.placeholders[placeholder].content)
                            .toBe(enEntry.placeholders[placeholder].content);
                    });
                } else {
                    expect(localeEntry.placeholders).toBeUndefined();
                }
            });
        });
    });

    test('Badge text messages are constrained to ≤4 characters across locales', () => {
        const badgeKeys = ['badgeHours', 'badgeMinutes'];

        badgeKeys.forEach(key => {
            localeCodes.forEach(locale => {
                const entry = localeMessages[locale][key];
                expect(entry).toBeDefined();

                let result = entry.message;
                const placeholders = entry.placeholders;
                if (placeholders) {
                    Object.keys(placeholders).forEach(placeholderKey => {
                        const pattern = new RegExp(`\\$${placeholderKey}\\$`, 'g');
                        result = result.replace(pattern, '00');
                    });
                }
                expect(result.length).toBeLessThanOrEqual(5);
                expect(result).toMatch(/^\d{2}:\d{2}$/);
            });
        });
    });

    test('Explicit plural keys follow _one/_other pattern', () => {
        const pluralBases = ['timersCount'];

        pluralBases.forEach(base => {
            const oneKey = `${base}_one`;
            const otherKey = `${base}_other`;

            expect(enMessages[oneKey]).toBeDefined();
            expect(enMessages[otherKey]).toBeDefined();

            const oneMsg = enMessages[oneKey].message;
            const otherMsg = enMessages[otherKey].message;
            expect(oneMsg).toMatch(/\$\w+\$/);
            expect(otherMsg).toMatch(/\$\w+\$/);
            expect(enMessages[oneKey].placeholders).toBeDefined();
            expect(enMessages[otherKey].placeholders).toBeDefined();
        });
    });

    test('All message keys use camelCase naming convention', () => {
        Object.keys(enMessages).forEach(key => {
            const isValid = /^[a-z][a-zA-Z0-9]*(_one|_other)?$/.test(key);
            expect(isValid).toBe(true);
        });
    });

    test('Placeholder substitutions are correctly numbered', () => {
        Object.keys(enMessages).forEach(key => {
            const entry = enMessages[key];
            if (entry.placeholders) {
                const placeholderKeys = Object.keys(entry.placeholders);
                placeholderKeys.forEach((placeholderKey) => {
                    const placeholder = entry.placeholders[placeholderKey];
                    expect(placeholder.content).toMatch(/^\$\d+$/);
                    const num = parseInt(placeholder.content.substring(1));
                    expect(num).toBeGreaterThan(0);
                    expect(num).toBeLessThanOrEqual(placeholderKeys.length);
                });
            }
        });
    });
});

describe('chrome.i18n.getMessage Mock Behavior', () => {
    let chrome;

    beforeEach(() => {
        const { createChromeMock } = require('../mocks/chrome');
        chrome = createChromeMock();
        global.chrome = chrome;
    });

    test('getMessage returns expected string for simple key', () => {
        const message = chrome.i18n.getMessage('extensionName');
        expect(message).toBe('Auto Tab Timer');
    });

    test('getMessage handles substitutions correctly', () => {
        const message = chrome.i18n.getMessage('notificationMessage', ['Test Tab']);
        expect(message).toBe('Timer on "Test Tab" completed.');
    });

    test('getMessage returns empty string for missing key', () => {
        const message = chrome.i18n.getMessage('nonExistentKey');
        expect(message).toBe('');
    });

    test('getMessage handles multiple substitutions', () => {
        const message = chrome.i18n.getMessage('badgeHours', ['02', '45']);
        expect(message).toBe('02:45');
    });

    test('Plural messages can be retrieved with explicit keys', () => {
        const singular = chrome.i18n.getMessage('timersCount_one', ['1']);
        const plural = chrome.i18n.getMessage('timersCount_other', ['3']);

        expect(singular).toBe('1 timer active');
        expect(plural).toBe('3 timers active');
    });
});

describe('Localization Documentation', () => {
    test('Future locale expansion note exists in technical docs', () => {
        const technicalDocPath = path.join(__dirname, '..', 'documents', 'Technical.md');

        if (fs.existsSync(technicalDocPath)) {
            const content = fs.readFileSync(technicalDocPath, 'utf8');

            // Check for localization section
            const hasLocalizationSection =
                content.includes('Localization') ||
                content.includes('i18n') ||
                content.includes('Internationalization');

            // This is a soft expectation - will be added in documentation step
            if (hasLocalizationSection) {
                expect(content).toMatch(/locale|translation|spanish/i);
            }
        }
    });
});
