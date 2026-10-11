// Braticks Cards 1.0.0-beta.1. Keep the entry point as the only package resource.
const cards = [
  ['ha-lithuanian-date-card', './ha-lithuanian-date-card.js'],
  ['zalgiris-card', './zalgiris-card.js'],
  ['euroleague-standings-card', './euroleague-standings-card.js'],
  ['lkl-standings-card', './lkl-standings-card.js'],
  ['ha-month-calendar-card-editor', './ha-month-calendar-card-ui.js'],
  ['threedy-card', './threedy-card.js'],
];
for (const [element, path] of cards) {
  if (customElements.get(element)) continue;
  try {
    await import(new URL(path, import.meta.url).href);
  } catch (error) {
    console.error(`[Braticks Cards] Failed to load ${element}`, error);
  }
}
