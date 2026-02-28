# Auto Tab Timer

Auto Tab Timer is a browser extension that automatically closes tabs after a set countdown timer. This repo only the compiled versions of the extension for easy installation and use on both Google Chrome and Microsoft Edge.

Perfect for falling asleep while watching youtube videos ([T90 Official](https://www.youtube.com/@T90Official)?)

## Features

- **Automatic Tab Closure:** Set a timer for the active tab, and it will automatically close when the countdown reaches zero.
- **Timer Management:** Easily pause, resume, reset, or cancel timers via the popup interface.
- **Notifications:** Optionally receive a notification when a timer completes.
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

1. **Starting a Timer:**
   - Click the Auto Tab Timer icon in your browser toolbar to open the popup.
   - In the **Timer** tab, input your desired hours, minutes, and seconds.
   - Click **Start Timer** to begin the countdown for the active tab.
   - The active timer will appear in the list, where you can pause, resume, reset, or cancel it.

2. **Managing Settings:**
   - Switch to the **Settings** tab in the popup.
   - Toggle the **Enable Notifications** option to control if you wish to receive notifications when a timer finishes.

## Localization

Auto Tab Timer is available in multiple languages:

- **English** (default)
- **Spanish** (Español)
- **Japanese** (日本語)
- **Portuguese (Brazil)** (Português Brasileiro)

The extension automatically detects your browser's language setting and displays the appropriate translation. All UI elements, notifications, and badge text are fully localized.

### Supported Languages

| Language | Code | Status |
|----------|------|--------|
| English  | `en` | ✅ Complete |
| Spanish  | `es` | ✅ Complete |
| Japanese | `ja` | ✅ Complete |
| Portuguese (Brazil) | `pt_BR` | ✅ Complete |

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
