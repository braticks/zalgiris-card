# Žalgiris Card

Home Assistant „Lovelace“ korta, skirta [Žalgiris Matches](https://github.com/braticks/zalgiris_matches) integracijai.

Rodo artimiausias rungtynes, varžovų logotipus, turnyrą, transliuotoją, rungtynių pradžios laiką, tiesioginį rezultatą ir artėjančių rungtynių sąrašą.

## Būtina integracija

Pirmiausia įdiekite ir sukonfigūruokite [Žalgiris Matches](https://github.com/braticks/zalgiris_matches). Kortai reikalingas integracijos rungtynių sąrašo sensorius.

## Diegimas per HACS

1. HACS atidarykite `Custom repositories`.
2. Pridėkite `https://github.com/braticks/zalgiris-card`.
3. Pasirinkite kategoriją `Dashboard`.
4. Įdiekite `Žalgiris Card`.
5. Jei korta neatsirado iš karto, perkraukite naršyklę išvalydami podėlį.

## Rankinis diegimas

1. Atsisiųskite `zalgiris-card.js` į `/config/www/`.
2. Dashboard ištekliuose pridėkite `/local/zalgiris-card.js` kaip `JavaScript Module`.

## Naudojimas

```yaml
type: custom:zalgiris-card
entity: sensor.zalgiris_rungtyniu_sarasas
count: 5
show_league: true
```

Jeigu jūsų sensoriaus `entity_id` skiriasi, pakeiskite jį kortos konfigūracijoje.

| Parinktis | Būtina | Numatyta reikšmė | Aprašymas |
| --- | --- | --- | --- |
| `entity` | Taip | – | „Žalgiris Matches“ rungtynių sąrašo sensorius |
| `count` | Ne | `5` | Kiek artėjančių rungtynių rodyti (1–20) |
| `show_league` | Ne | `true` | Ar virš pagrindinių rungtynių rodyti turnyrą |

## English

Home Assistant Lovelace card for the [Žalgiris Matches](https://github.com/braticks/zalgiris_matches) integration. It displays the next game, team logos, competition, broadcaster, kickoff time, live score and upcoming games.

Install this repository through HACS as a `Dashboard` custom repository, then use:

```yaml
type: custom:zalgiris-card
entity: sensor.zalgiris_rungtyniu_sarasas
count: 5
show_league: true
```

Replace the entity ID if Home Assistant generated a different one.

## Problemos ir pasiūlymai

Praneškite apie klaidas per [GitHub Issues](https://github.com/braticks/zalgiris-card/issues).
