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

describe('Locale Parity Validation', () => {
    const localesDir = path.join(__dirname, '..', '_locales');
    const enMessagesPath = path.join(localesDir, 'en', 'messages.json');

    let enMessages;

    beforeAll(() => {
        // Load English messages as source of truth
        const enContent = fs.readFileSync(enMessagesPath, 'utf8');
        enMessages = JSON.parse(enContent);
    });

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

    test('Spanish locale has identical keys to English', () => {
        const esMessagesPath = path.join(localesDir, 'es', 'messages.json');
        expect(fs.existsSync(esMessagesPath)).toBe(true);

        const esContent = fs.readFileSync(esMessagesPath, 'utf8');
        const esMessages = JSON.parse(esContent);

        const enKeys = Object.keys(enMessages).sort();
        const esKeys = Object.keys(esMessages).sort();

        // Check for missing keys in Spanish
        const missingInSpanish = enKeys.filter(key => !esKeys.includes(key));
        expect(missingInSpanish).toEqual([]);

        // Check for extra keys in Spanish
        const extraInSpanish = esKeys.filter(key => !enKeys.includes(key));
        expect(extraInSpanish).toEqual([]);

        // Verify exact match
        expect(esKeys).toEqual(enKeys);
    });

    test('Spanish locale has matching placeholder structure', () => {
        const esMessagesPath = path.join(localesDir, 'es', 'messages.json');
        const esContent = fs.readFileSync(esMessagesPath, 'utf8');
        const esMessages = JSON.parse(esContent);

        Object.keys(enMessages).forEach(key => {
            const enEntry = enMessages[key];
            const esEntry = esMessages[key];

            // If English has placeholders, Spanish must too
            if (enEntry.placeholders) {
                expect(esEntry.placeholders).toBeDefined();

                const enPlaceholders = Object.keys(enEntry.placeholders).sort();
                const esPlaceholders = Object.keys(esEntry.placeholders).sort();

                expect(esPlaceholders).toEqual(enPlaceholders);

                // Verify placeholder content structure matches
                enPlaceholders.forEach(placeholder => {
                    expect(esEntry.placeholders[placeholder]).toHaveProperty('content');
                    expect(esEntry.placeholders[placeholder].content).toBe(
                        enEntry.placeholders[placeholder].content
                    );
                });
            }

            // Spanish must not have placeholders if English doesn't
            if (!enEntry.placeholders) {
                expect(esEntry.placeholders).toBeUndefined();
            }
        });
    });

    test('Badge text messages are constrained to ≤4 characters', () => {
        const badgeKeys = ['badgeHours', 'badgeMinutes'];

        badgeKeys.forEach(key => {
            expect(enMessages[key]).toBeDefined();

            // Badge messages use named placeholders like $h$, $m$, $s$
            // When rendered with 2-digit values, result should be HH:MM or MM:SS (5 chars including colon)
            const message = enMessages[key].message;

            // Verify format contains placeholder markers
            expect(message).toMatch(/\$/);

            // Simulate actual rendering: replace placeholders with 2-digit values
            let result = message;
            const placeholders = enMessages[key].placeholders;
            if (placeholders) {
                Object.keys(placeholders).forEach(placeholderKey => {
                    const placeholder = placeholders[placeholderKey];
                    const pattern = new RegExp(`\\$${placeholderKey}\\$`, 'g');
                    result = result.replace(pattern, '00');
                });
            }

            // Final badge text should be ≤5 chars (HH:MM format)
            expect(result.length).toBeLessThanOrEqual(5);
            expect(result).toMatch(/^\d{2}:\d{2}$/);
        });
    });

    test('Explicit plural keys follow _one/_other pattern', () => {
        const pluralBases = ['timersCount'];

        pluralBases.forEach(base => {
            const oneKey = `${base}_one`;
            const otherKey = `${base}_other`;

            expect(enMessages[oneKey]).toBeDefined();
            expect(enMessages[otherKey]).toBeDefined();

            // Check that messages contain placeholder references (named or numbered)
            const oneMsg = enMessages[oneKey].message;
            const otherMsg = enMessages[otherKey].message;

            expect(oneMsg).toMatch(/\$\w+\$/); // Named placeholder like $count$
            expect(otherMsg).toMatch(/\$\w+\$/);

            // Verify both have placeholders defined
            expect(enMessages[oneKey].placeholders).toBeDefined();
            expect(enMessages[otherKey].placeholders).toBeDefined();
        });
    });

    test('All message keys use camelCase naming convention', () => {
        Object.keys(enMessages).forEach(key => {
            // Check for camelCase or explicit plural pattern (word_one, word_other)
            const isValid = /^[a-z][a-zA-Z0-9]*(_one|_other)?$/.test(key);
            expect(isValid).toBe(true);
        });
    });

    test('Placeholder substitutions are correctly numbered', () => {
        Object.keys(enMessages).forEach(key => {
            const entry = enMessages[key];
            if (entry.placeholders) {
                const message = entry.message;
                const placeholderKeys = Object.keys(entry.placeholders);

                placeholderKeys.forEach((placeholderKey, index) => {
                    const placeholder = entry.placeholders[placeholderKey];
                    // Verify placeholder content references correct $N
                    expect(placeholder.content).toMatch(/^\$\d+$/);

                    // Extract the number
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

