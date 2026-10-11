# Threedy 2026.10.0-beta.1

Tai paruošta bandomoji pataisytos kortos versija. GitHub fork: https://github.com/braticks/ha-threedy-card . HA automatiškai nepakeistas.

## HACS

Pridėk `https://github.com/braticks/ha-threedy-card` kaip „Custom repository“, kategorija „Dashboard“. Ši beta pateikta `master` šakoje, su surinktu failu `dist/`. Jei dar įdiegta originali Threedy, vienu metu turi likti vienas aktyvus Threedy išteklius.

## Rankinis bandymas

1. Iš `dist/` nukopijuok `threedy-card.js` ir jo `LICENSE.txt` į HA `/config/www/threedy-beta/`.
2. Dashboardo ištekliuose pakeisk seną Threedy ištekliaus URL į `/local/threedy-beta/threedy-card.js?v=2026.10.0-beta.1`, tipas „JavaScript module“. Palik tik vieną Threedy išteklių.
3. Atnaujink naršyklę. Kortos tipas lieka `custom:threedy-card`.

Esamas kodas su RemainingMinutes / ElapsedMinutes dabar rodo apvalintas minutes. `examples/elegoo-centauri-carbon-2.yaml` pateiktas variantas su CoreXY piešiniu, ETA, tiksliu likusiu laiku valandomis/minutėmis ir matomumu tik spausdintuvui prisijungus. Entitetų pavadinimai paimti iš pateikto pokalbio, šios sesijos metu gyvai nepatikrinti.

Grįžimas: išteklių URL pakeisk į ankstesnį HACS kortos URL ir atnaujink naršyklę.

## Kodo patikrinimas

`npm ci`, `npm test`, `npm run build`.

Visų issues peržiūra ir likusios patikros: `ISSUE_REVIEW.md`.
