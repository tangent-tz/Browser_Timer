# Release Notes - 1.3.0

## Highlights

- Stabilized completion-action behavior and aligned test coverage with runtime behavior.
- Added timer input guardrails in popup UI with inline localized validation feedback.
- Completed localization of remaining settings hint text.
- Deferred numeric localization intentionally; canonical ASCII timer formats remain.

## Behavior Changes

1. Timer input normalization before start:
   - `hours` is clamped to `0..999`.
   - `minutes` and `seconds` are clamped to `0..59`.
2. `00:00:00` is rejected with a localized inline error message.
3. `Notify me only` behavior is explicit:
   - Always sends a notification when timer completes.
   - Never closes the tab.
   - Ignores the notification toggle for that completion action.

## No Breaking Changes

- Runtime message actions and payloads are unchanged.
- Storage key structure is unchanged.
- Manifest permissions are unchanged.

## Localization Notes

- Added new keys for timer input validation and notify-only settings hint.
- Locale parity is maintained across all supported locales.

## Migration Impact

No migration steps required.
