# Maintenance review — 2026-10-11

Base: xZetsubou/ha-threedy-card, commit f0601f7 (2026-03-13).
All 27 upstream issues/PRs were inspected by title/state; bodies of all six open issues and two open PRs, relevant time/Firefox discussions, and source paths were reviewed. Closed issues are historical reports, not a claim that every original device configuration has been retested.

| Open report | Change | Verification / limitation |
| --- | --- | --- |
| #26 Incorrect elapsed / remaining time | Parse decimal values and HA s/min/h/ms/d units; explicit per-sensor unit override; timestamps with Z, offsets and fractions; authoritative duration snapshots; clear intervals on pause/unmount. | Numeric, timestamp, attribute-zero and timer lifecycle regressions pass. |
| #24 Printing from SD does not animate | Shared case-insensitive printing detection across card, time and both original visuals. Configurable printing_states. | State regression coverage; animation effect restarts when state changes and stops on cleanup. |
| #23 Firefox e.match error | Remove empty-string animate/transition props from always_show path; handle non-string status attributes and unavailable values. | Rendering and always_show regressions pass. Original user's Firefox trace cannot be definitively mapped to one source line; exact Firefox/device confirmation remains required. |
| #19 Scale destroys layout | Fixed-height isolated viewport, scale clamp 0–1, fit original drawings to both width and height; show_header/show_stats for visual-only use. | Width/height dimension and invalid scale regressions pass. Values above 1 intentionally clamp, rather than enlarging the entire dashboard. |
| #17 Remove seconds | show_seconds: false uses exact hours/minutes without humanize rounding. | 3h 40m, zero and multi-day regressions pass. |
| #13 CoreXY visual | New enclosed CoreXY SVG with fixed gantry, moving toolhead and descending bed. | Builds successfully; generic visual, not an exact Centauri illustration or actual toolhead telemetry. |

## Open PRs and forks

- #18 (conditional hiding/unavailability): intent implemented independently with states_hide/states_show and red unavailable/offline/error dot. Original PR was not merged or closed.
- #27 (MWDelaney thumbnail/progress colors): a newer August 2026 fork exists and implements this feature. Reviewed, not incorporated in this maintenance beta. It does not solve duration units and is a separate feature, not an open bug report. CoreXY supports progress_color; original drawings retain their existing styling.
- alryaz and other sampled forks were checked for newer maintenance commits. No inspected fork provided the complete set of fixes above.

## Additional corrections

Custom RemainingMinutes/ElapsedMinutes and min-unit fields round to integer values by default; precision overrides are supported. Preserve attribute value 0. Missing temperature sensors display an em dash instead of throwing. Progress is clamped 0–100. Status overrides take priority. Camera click handlers use current React closures; hidden camera streams are removed. Duplicate resource loading no longer throws a custom element registration error. Editor unmounts cleanly.

## Validation boundaries

Automated regression tests and production Webpack compilation are included. Tests use jsdom/React, not a running Home Assistant dashboard. No changes were made to the user's HA instance. Exact Firefox behavior, live camera delivery and visual rendering on the user's tablet remain live verification tasks. Do not mark all upstream reports resolved solely from this beta.
