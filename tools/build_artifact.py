"""Bundle index.html + assets into dist/camhare.html (single page; images stay as sibling files).
Used for the claude.ai Artifact preview. GitHub Pages uses index.html directly."""
import os, re
ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
rd = lambda p: open(os.path.join(ROOT, p), encoding="utf-8").read()
fonts = re.search(r'<link rel="stylesheet" href="(https://fonts\.googleapis\.com[^"]+)"', rd("index.html")).group(1)
out = f"""<title>CAMHARE Prototip</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="stylesheet" href="{fonts}">
<style>
{rd("assets/app.css")}
</style>
<div id="app"></div>
<script>
{rd("assets/data.js")}
{rd("assets/i18n.js")}
{rd("assets/app.js")}
</script>
"""
os.makedirs(os.path.join(ROOT, "dist"), exist_ok=True)
open(os.path.join(ROOT, "dist", "camhare.html"), "w", encoding="utf-8").write(out)
print(len(out), "bytes")
