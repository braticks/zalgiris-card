# Braticks Cards

Bendras Home Assistant kortų paketas. Vienas HACS adresas dabartinėms ir būsimoms kortoms.

## Kortos

| Korta | YAML tipas | Dokumentacija |
| --- | --- | --- |
| Lietuviška data | `custom:ha-lithuanian-date-card` | [Nustatymai](cards/ha-lithuanian-date-card/README.md) |
| Žalgirio rungtynės | `custom:zalgiris-card` | [Nustatymai](cards/zalgiris-card/README.md) |
| Eurolygos lentelė | `custom:euroleague-standings-card` | [Nustatymai](cards/euroleague-standings/README.md) |
| LKL lentelė | `custom:lkl-standings-card` | [Nustatymai](cards/lkl-standings/README.md) |
| Mėnesio kalendorius | `custom:ha-month-calendar-card` | [Nustatymai](cards/ha-month-calendar-card/README.md) |
| 3D spausdintuvas | `custom:threedy-card` | [Nustatymai](cards/ha-threedy-card/README.md) |

Pirmoje versijoje Threedy yra `2026.10.0-beta.1`, todėl šis paketas kol kas beta.

## Diegimas per HACS

1. HACS → Custom repositories: `https://github.com/braticks/braticks-cards`, kategorija **Dashboard**.
2. Atsisiųskite **Braticks Cards**.
3. Dashboard resursuose patikrinkite, kad yra tik vienas šio paketo resursas:
   `/hacsfiles/braticks-cards/braticks-cards.js`, tipas **JavaScript module**.
4. Perkraukite naršyklės puslapį. Kortų YAML tipus pasirinkite iš lentelės.

Eurolygos, LKL ir Žalgirio duomenų integracijos vis dar diegiamos atskirai. Šis paketas pateikia kortas, o ne jų sensorius.

## Perėjimas iš senų kortų

Išsisaugokite dashboard konfigūraciją. Pašalinkite senus atskirus HACS **kortų** paketus ir jų dashboard resursus, tada įdiekite šį paketą. Duomenų integracijų nešalinkite. Dashboard YAML kortų tipai bei nustatymai lieka tie patys.

Eurolygos ir LKL integracijos automatiškai pateikia savo kortas. Jų resursus galima palikti: paketo įkėliklis praleidžia jau registruotą kortą. Tuomet naudojama pirmoji įkelta kortos versija; norint garantuoti paketo versiją, reikia koordinuoto integracijos pakeitimo. Senų atskirų kortų resursų nepalikite, nes jie gali įkelti senesnę versiją arba sukelti registravimo konfliktą.

Nepridėkite kiekvieno paketo JS failo kaip atskiro resurso. Pakanka `braticks-cards.js`; jis įkelia ir kalendoriaus redaktorių. Naujos paketo kortos ateityje atkeliaus su HACS atnaujinimais.

## Priežiūra

Kortų šaltiniai, originalūs README ir priskyrimai yra `cards/`. `sources.json` nurodo perkeltų šaltinių commit. Archyvuoto Eurolygos kortos repozitoriumo versija neperkelta: naudojamas naujesnis šaltinis iš Eurolygos integracijos.

Keičiant paprastas kortas, redaguokite `cards/` šaltinį ir paleiskite `npm run build`. Threedy pakeitimams pirma sukurkite jos JS failą `cards/ha-threedy-card` kataloge pagal originalią instrukciją, tada paleiskite paketo build. Integracijų Python kopijos saugomos šaltinių kontekstui ir per šį kortų paketą nediegiamos.

`npm test` tikrina bendro įkėliklio veikimą. Licencijos ir autorių priskyrimai išsaugoti šaltinių kataloguose; Threedy trečiųjų šalių priskyrimai pateikiami ir `dist/`. Paketas nesuteikia naujos bendros licencijos kortoms, kurių šaltiniuose ji nenurodyta.
