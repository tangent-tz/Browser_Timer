# Auto Tab Timer

Auto Tab Timer is a browser extension that automatically closes tabs after a set countdown timer. This repo only the compiled versions of the extension for easy installation and use on both Google Chrome and Microsoft Edge.

Perfect for falling asleep while watching youtube videos ([T90 Official](https://www.youtube.com/@T90Official)?)

## Features

- **Automatic Tab Closure:** Set a timer for the active tab, and it will automatically close when the countdown reaches zero.
- **Timer Management:** Easily pause, resume, reset, or cancel timers via the popup interface.
- **Completion Actions:** Choose whether a timer closes the tab or only sends a notification.
- **Notifications:** Optionally receive a notification when a close-tab timer completes.
- **Onboarding & Update Notes:** New users see a welcome page, and users upgrading into `1.3.0` see a one-time “What’s New” page.
- **User-Friendly Interface:** A simple, tabbed UI for managing timers and settings.

## Download

### From the Official Stores

- **Chrome:** [Download from the Chrome Web Store](https://chromewebstore.google.com/detail/hnekeinjlfdokbmlkpkbdicdpkddpfff?utm_source=item-share-cb)
- **Edge:** [Download from the Microsoft Edge Add-ons Store](https://microsoftedge.microsoft.com/addons/detail/auto-tab-timer/llhjhcgohdkchnbnhdkcgaanieilbikj?hl=en-US)

### Compiled Version

You can also download the latest compiled version (ZIP file) from the release tag on the [Releases](https://github.com/tangent-tz/Browser_Timer/tags) page.

## Installation

### Loading the Extension Manually

#### For Google Chrome:
1. Open Chrome and navigate to `chrome://extensions/`.
2. Enable "Developer mode" by toggling the switch in the top-right corner.
3. Click **Load unpacked** and select the folder containing the compiled extension files.

#### For Microsoft Edge:
1. Open Edge and navigate to `edge://extensions/`.
2. Enable "Developer mode" by toggling the switch in the bottom-left corner.
3. Click **Load unpacked** and select the folder containing the compiled extension files.

## Usage

### Onboarding and Updates

- On first install, Auto Tab Timer opens a local onboarding page with quick-start guidance.
- When updating from a version below `1.3.0` to `1.3.0`, Auto Tab Timer opens a one-time local “What’s New” page.
- Both pages include a “More extensions from this developer” section powered by a local config file (`public/promoted-extensions.json`).

1. **Starting a Timer:**
   - Click the Auto Tab Timer icon in your browser toolbar to open the popup.
   - In the **Timer** tab, input your desired hours, minutes, and seconds.
   - Use whole-number values for hours, minutes, and seconds.
   - You can adjust values with input steppers or the mouse wheel while hovering each input.
   - Inputs are no longer capped at `59` for minutes/seconds or `999` for hours.
   - A timer value of `00:00:00` is rejected with an inline validation message.
   - Click **Start Timer** to begin the countdown for the active tab.
   - The active timer will appear in the list, where you can pause, resume, reset, or cancel it.

2. **Managing Settings:**
   - Switch to the **Settings** tab in the popup.
   - Toggle **Notify on action completion** to control notifications for timers that close tabs.
   - Choose a default completion action:
     - **Close tab**
     - **Notify me only** (always sends a notification and keeps the tab open)

## Canonical Time Format

Timer and badge values intentionally use canonical ASCII-digit formatting (`HH:MM:SS`, `HH:MM`, `MM:SS`).
Numeric localization for digits/separators is deferred to a future release.

## Localization

Auto Tab Timer is available in multiple languages:

- **English** (default)
- **Spanish** (Español)
- **Japanese** (日本語)
- **Portuguese (Brazil)** (Português Brasileiro)
- **Chinese (Simplified)** (简体中文)
- **German** (Deutsch)
- **French** (Français)

The extension automatically detects your browser's language setting and displays the appropriate translation. All UI elements, notifications, and badge text are fully localized.

### Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English  | `en` | ✅ Complete |
| Spanish  | `es` | ✅ Complete |
| Japanese | `ja` | ✅ Complete |
| Portuguese (Brazil) | `pt_BR` | ✅ Complete |
| Chinese (Simplified) | `zh_CN` | ✅ Complete |
| German | `de` | ✅ Complete |
| French | `fr` | ✅ Complete |

### Adding New Translations

If you'd like to contribute a translation:

1. Create a new folder in `_locales/` with the appropriate language code (e.g., `_locales/fr/` for French)
2. Copy `_locales/en/messages.json` to your new locale folder
3. Translate all message values while keeping the same keys
4. Ensure all placeholder structures remain identical
5. Test your translation by loading the extension with your browser set to that locale
6. Submit a pull request with your translation

**Note:** All locale files must maintain identical keys with the English version. Our automated tests will verify this.

### Store Listings

The Chrome Web Store and Microsoft Edge Add-ons store require separate localization of:
- Extension title
- Short description
- Full description
- Screenshots (optional but recommended)

These are managed separately from the `_locales/` files and must be updated manually in each store.

## Support

If you encounter any issues please report it to the Issues Section
