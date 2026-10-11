> **Šio paketo diegimas:** žr. [bendrą instrukciją](../../README.md). Toliau pateikta originali kortos ar integracijos dokumentacija; jos atskiros kortos diegimo instrukcijos bendram paketui netaikomos.

# LKL turnyrinė lentelė Home Assistant

[![Atidaryti šią saugyklą Home Assistant Community Store](https://my.home-assistant.io/badges/hacs_repository.svg)](https://my.home-assistant.io/redirect/hacs_repository/?owner=braticks&repository=lkl-standings&category=integration)

Home Assistant integracija ir Lovelace korta Lietuvos krepšinio lygos (LKL) turnyrinei lentelei.

Duomenų šaltiniai – oficiali [lkl.lt](https://lkl.lt/turnyrine-lentele) turnyrinė lentelė ir [rungtynių rezultatai](https://lkl.lt/rezultatai).

## Galimybės

- sensorius `sensor.lkl_standings`;
- automatinis aktualios LKL turnyrinės lentelės nuskaitymas;
- duomenų atnaujinimas kas 30 minučių;
- komandos vieta, sužaistos rungtynės, pergalės, pralaimėjimai ir pergalių procentas;
- tikslus bendras sezono pelnytų ir praleistų taškų skirtumas `+/−`;
- komandų logotipai;
- LKL logotipas kortos antraštėje;
- integruota `custom:lkl-standings-card` Lovelace korta;
- vizualus kortos nustatymų redaktorius;
- normalus, kompaktiškas ir super kompaktiškas režimai;
- mėgstamos komandos paryškinimas;
- 1–8 vietų atkrintamųjų zonos žymėjimas.

## Diegimas per HACS

Patogiausia naudoti viršuje esantį **Open in HACS** mygtuką.

Jei reikia pridėti rankiniu būdu:

1. Atidaryk **HACS → Integrations**.
2. Viršuje dešinėje pasirink **Custom repositories**.
3. Įrašyk `https://github.com/braticks/lkl-standings` ir pasirink tipą **Integration**.
4. Įdiek **LKL turnyrinė lentelė**.
5. Perkrauk Home Assistant.
6. Atidaryk **Nustatymai → Įrenginiai ir paslaugos → Pridėti integraciją → LKL turnyrinė lentelė**.

Lovelace kortos resursą integracija registruoja automatiškai, jei Home Assistant naudoja Lovelace resursų saugojimo režimą.

## Kortos naudojimas

Kortą galima pridėti per Home Assistant UI arba YAML:

```yaml
type: custom:lkl-standings-card
entity: sensor.lkl_standings
title: LKL
count: 10
favorite_team: ZAL
always_show_favorite: true
show_zones: true
team_logo_mode: icon
show_league_logo: true
show_gp: true
show_pct: true
show_diff: true
density: normal
highlight_favorite: true
```

### Pagrindiniai nustatymai

- `count` – kiek komandų rodyti;
- `favorite_team` – mėgstamos komandos kodas;
- `always_show_favorite` – mėgstamą komandą rodyti net jei ji nepatenka į pasirinktą TOP;
- `team_logo_mode` – komandų logotipų režimas: `icon`, `background` arba `none`;
- `show_league_logo` – rodyti LKL logotipą kortos antraštėje;
- `show_gp` – rodyti sužaistų rungtynių skaičių;
- `show_pct` – rodyti pergalių procentą;
- `show_diff` – rodyti bendrą sezono taškų skirtumą `+/−`;
- `show_zones` – pažymėti atkrintamųjų zoną;
- `density` – kortos tankumas: `normal`, `compact` arba `super_compact`;
- `highlight_favorite` – paryškinti mėgstamą komandą.

### Super kompaktiškas režimas

`density: super_compact` sumažina eilučių aukštį, tarpus, logotipus ir šriftus. Šiame režime automatiškai paslepiamas sužaistų rungtynių stulpelis bei zonų legenda, kad lentelė užimtų kuo mažiau vietos.

## Kaip skaičiuojamas +/−

`+/−` yra tikslus bendras sezono taškų skirtumas:

`visi pelnyti taškai − visi praleisti taškai`

Reikšmė skaičiuojama iš oficialiame LKL rezultatų puslapyje pateiktų sužaistų rungtynių rezultatų, todėl rodoma sveiku skaičiumi, pvz. `+64`, `-12` arba `0`.

## Pastabos

Integracija nuskaito oficialią LKL svetainę. Jei LKL pakeistų puslapių struktūrą ar lentelių žymėjimą, parserį gali reikėti atnaujinti.

Šis projektas nėra oficialiai susijęs su Lietuvos krepšinio lyga.
