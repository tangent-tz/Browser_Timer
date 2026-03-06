# Release Notes - 1.3.0

## Highlights

- Stabilized completion-action behavior and aligned test coverage with runtime behavior.
- Updated timer input handling in popup UI with inline localized validation feedback.
- Completed localization of remaining settings hint text.
- Added localized onboarding for first install and a one-time “What’s New in 1.3.0” page for users upgrading into `1.3.0`.
- Added config-driven cross-promotion cards for other extensions by the same developer.
- Deferred numeric localization intentionally; canonical ASCII timer formats remain.

## Behavior Changes

1. Timer input handling before start:
   - Duration is parsed from the entered hour/minute/second values.
2. `00:00:00` is rejected with a localized inline error message.
3. `Notify me only` behavior is explicit:
   - Always sends a notification when timer completes.
   - Never closes the tab.
   - Ignores the notification toggle for that completion action.
4. Lifecycle onboarding/update behavior:
   - First install opens `onboarding.html?mode=install`.
   - Update opens `onboarding.html?mode=update` only when transitioning from `<1.3.0` to `1.3.0`.
   - Update pages are not shown for `1.3.x -> 1.3.x` updates.

## No Breaking Changes

- Runtime message actions and payloads are unchanged.
- Storage key structure is unchanged.
- Manifest permissions are unchanged.

## Localization Notes

- Added new keys for timer input validation and notify-only settings hint.
- Added onboarding/promo localization keys across all supported locales.
- Locale parity is maintained across all supported locales.

## Migration Impact

No migration steps required.

## Release Checklist (Before Store Submission)

- Replace placeholder promoted extension entries in `public/promoted-extensions.json` with real extension titles, descriptions, and store URLs.
- Verify onboarding promo copy per locale after replacing placeholders.
