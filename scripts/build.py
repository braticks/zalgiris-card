from pathlib import Path
import shutil
root=Path(__file__).resolve().parents[1]
files={
 'ha-lithuanian-date-card.js':'cards/ha-lithuanian-date-card/ha-lithuanian-date-card.js',
 'zalgiris-card.js':'cards/zalgiris-card/zalgiris-card.js',
 'euroleague-standings-card.js':'cards/euroleague-standings/custom_components/euroleague_standings/www/euroleague-standings-card.js',
 'lkl-standings-card.js':'cards/lkl-standings/custom_components/lkl_standings/www/lkl-standings-card.js',
 'ha-month-calendar-card.js':'cards/ha-month-calendar-card/ha-month-calendar-card.js',
 'ha-month-calendar-card-ui.js':'cards/ha-month-calendar-card/ha-month-calendar-card-ui.js',
 'threedy-card.js':'cards/ha-threedy-card/dist/threedy-card.js',
 'threedy-card.js.LICENSE.txt':'cards/ha-threedy-card/dist/threedy-card.js.LICENSE.txt',
}
for filename,source in files.items(): shutil.copyfile(root/source,root/'dist'/filename)
