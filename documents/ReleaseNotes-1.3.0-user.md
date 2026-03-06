# Release Notes - 1.3.0 (User Facing)

## What's New

- Added a welcome page for first-time installs.
- Added a one-time "What's New" page when upgrading to version `1.3.0`.
- Improved timer input safety:
  - `hours` are normalized to `0..999`.
  - `minutes` and `seconds` are normalized to `0..59`.
- Starting a timer with `00:00:00` now shows an inline validation message.
- Clarified the "Notify me only" completion action behavior.

## Notes

- No changes to required extension permissions.
- Existing timers, settings, and workflows continue to work as before.
