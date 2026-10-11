> **Kortų paketas:** ši korta taip pat bus pateikiama [Braticks Cards](https://github.com/braticks/braticks-cards). Naujo adreso diegimo ir perėjimo instrukcijos pateiktos bendro paketo README. YAML kortos tipas lieka tas pats.

# Month Calendar Card — braticks fork

[![Open your Home Assistant instance and add this repository to HACS](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=braticks&repository=ha-month-calendar-card&category=plugin)

This is a personal fork of `drmogie/ha-month-calendar-card` for Home Assistant.

## Changes in this fork

- Month view with **plain calendar icons** — no coloured circular bubbles.
- Each icon keeps the configured calendar colour.
- Clicking a day selects it.
- **Selected day's events are shown below the month grid**.
- Today is selected by default.
- The calendar legend can be disabled.
- Existing `calendar.*`, icon and colour configuration is kept.

## HACS installation

Click the button above for one-click HACS setup.

Manual custom-repository URL:

`https://github.com/braticks/ha-month-calendar-card`

Then install **Month Calendar Card (braticks fork)** and reload the browser.

The card type remains:

```yaml
type: custom:ha-month-calendar-card
```

## Example

```yaml
type: custom:ha-month-calendar-card
first_day_of_week: monday
event_display: icon
max_events_per_day: 8
show_title: true
header_font_size: 20
show_legend: false
show_selected_day_events: true
selected_show_time: true
selected_show_location: false
selected_show_calendar: false
tap_action: event-details

calendars:
  - entity: calendar.gimtadieniai
    name: Gimtadieniai
    icon: mdi:cake-variant
    color: "#E91E63"

  - entity: calendar.pas_gydytoja
    name: Pas gydytoją
    icon: mdi:hospital-box-outline
    color: "#F44336"

  - entity: calendar.zalgiris_rungtynes
    name: Žalgiris
    icon: mdi:basketball
    color: "#00843D"
```

## Extra options

```yaml
show_selected_day_events: true
selected_show_time: true
selected_show_location: false
selected_show_calendar: false
```

`event_display: icon` uses only the coloured MDI icon and does not draw the old coloured bubble.

## Upstream

Original project: `drmogie/ha-month-calendar-card`.
