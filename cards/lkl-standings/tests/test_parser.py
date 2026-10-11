import importlib.util
from pathlib import Path

MODULE = Path(__file__).parents[1] / "custom_components/lkl_standings/api.py"
# Parser smoke test is exercised separately without importing HA.

SAMPLE = """
<html><body>
<table class='standings'>
<thead><tr><th>Poz.</th><th>Komanda</th><th>Rng.</th><th>Per.</th><th>Pr.</th><th>Laim.%</th><th>Tšk. vid.</th></tr></thead>
<tbody>
<tr><td>1</td><td><a href='/komandos/zalgiris'><img src='/img/zalgiris.png'>Žalgiris</a></td><td>3</td><td>3</td><td>0</td><td>100</td><td>97.3 76.0</td></tr>
<tr><td>2</td><td>Gargždai</td><td>3</td><td>2</td><td>1</td><td>66.7</td><td>84.7 85.0</td></tr>
</tbody></table>
</body></html>
"""
