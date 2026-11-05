"""Build assets/data.js from the live WooCommerce Store API dump of camhare.com.

Usage (from repo root):
    python3 tools/build_catalog.py            # uses tools/raw/*.json, downloads images
    python3 tools/build_catalog.py --no-img   # skip image download

Raw JSON was fetched from:
    https://camhare.com/wp-json/wc/store/v1/products?per_page=100
    https://camhare.com/wp-json/wc/store/v1/products?category=<slug>&per_page=100
"""
import html
import io
import json
import os
import re
import sys
import urllib.request

ROOT = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
RAW = os.path.join(ROOT, "tools", "raw")
IMG_DIR = os.path.join(ROOT, "assets", "img", "p")
OUT = os.path.join(ROOT, "assets", "data.js")

COLLECTIONS = {
    "osmanli-koleksiyonlari": "osmanli",
    "anadolu-medeniyetleri": "anadolu",
    "cay-kahve-bardak-gruplari": "bardak",
}
SKU_PREFIX = {"osmanli": "OSM", "anadolu": "ANA", "bardak": "BRD"}

# (suffix in product name, type key) — longest first
TYPES = [
    ("İbrik ve Tabak", "ibrik"), ("Şişe ve Tabak", "ibrik"), ("Geniş Tabak", "tabak"),
    ("Ayaklı Kase", "kase"), ("Kesme Kase", "kase"), ("Bardak Grubu", "set"),
    ("Duvar Dekoru", "dekor"), ("Kül Tablası", "tabak"), ("El Aynası", "ayna"),
    ("Vazo Büyük", "vazo"), ("Vazo Küçük", "vazo"), ("Gondol Büyük", "gondol"),
    ("Gondol Küçük", "gondol"), ("Kase Platin", "kase"), ("Kase Gold", "kase"),
    ("Vazo", "vazo"), ("Kase", "kase"), ("Şekerlik", "sekerlik"), ("Mumluk", "mumluk"),
    ("Gondol", "gondol"), ("Sahan", "sahan"), ("Ayna", "ayna"), ("Mücevherlik", "mucevherlik"),
    ("Hançeri", "obje"), ("Baltası", "obje"), ("Kalkanı", "obje"), ("Kılıç", "obje"),
]

# Indicative dimensions per type. PLACEHOLDER — to be replaced with workshop measurements.
DIMS = {
    "vazo": "Y 32 cm · Ø 14 cm", "kase": "Ø 22 cm · Y 9 cm", "sekerlik": "Ø 12 cm · Y 16 cm",
    "mumluk": "Ø 9 cm · Y 11 cm", "gondol": "Ø 18 cm · Y 24 cm", "ibrik": "Y 28 cm · Tabak Ø 30 cm",
    "tabak": "Ø 30 cm", "sahan": "Ø 26 cm · Y 20 cm", "ayna": "Ø 55 cm", "mucevherlik": "Ø 14 cm · Y 15 cm",
    "dekor": "60 × 40 cm", "obje": "Y 45 cm", "set": "6 kişilik set",
}


def load(name):
    with open(os.path.join(RAW, name), encoding="utf-8") as f:
        return json.load(f)


def clean(text):
    text = re.sub(r"<br\s*/?>", "\n", text)
    text = re.sub(r"</p>", "\n\n", text)
    text = re.sub(r"<[^>]+>", "", text)
    text = html.unescape(text).replace("\xa0", " ")
    text = re.sub(r"[ \t]+", " ", text)
    text = re.sub(r"\n\s*\n\s*\n+", "\n\n", text)
    return text.strip()


def split_story(desc):
    """Descriptions are 'TR <text> ENG <text>' dumped into one field."""
    t = clean(desc)
    m = re.split(r"\n\s*ENG?\s*\n", "\n" + t + "\n", maxsplit=1)
    tr = re.sub(r"^\s*TR\s*\n", "", m[0].strip()).strip()
    en = m[1].strip() if len(m) > 1 else ""
    return tr, en


def split_set(desc):
    """Bardak grubu descriptions: lines 'Cam Mırra Takımı / Arabic Coffee Cup Set (Glass)'."""
    items = []
    for line in re.split(r"\n\s*\n", clean(desc)):
        line = " ".join(line.split())
        if "/" in line:
            tr, en = [x.strip() for x in line.split("/", 1)]
            items.append({"tr": tr, "en": en})
    return items


def type_of(name):
    for suffix, key in TYPES:
        if name.endswith(suffix) or f" {suffix} " in f" {name} ":
            return key, name[: name.rfind(suffix)].strip() if name.endswith(suffix) else name
    return "obje", name


def fetch_img(src, dest):
    if os.path.exists(dest):
        return True
    base = re.sub(r"(-scaled)?\.(jpe?g|png)$", "", src)
    ext = re.search(r"\.(jpe?g|png)$", src).group(1)
    for url in (f"{base}-800x800.{ext}", src):
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "camhare-prototype-builder"})
            data = urllib.request.urlopen(req, timeout=40).read()
        except Exception:
            continue
        from PIL import Image
        im = Image.open(io.BytesIO(data)).convert("RGB")
        im.thumbnail((900, 900))
        im.save(dest, "JPEG", quality=80, optimize=True, progressive=True)
        return True
    return False


def main():
    download = "--no-img" not in sys.argv
    products = load("products1.json")
    coll_of = {}
    for slug, key in COLLECTIONS.items():
        for p in load(f"cat_{slug}.json"):
            coll_of.setdefault(p["id"], key)

    out, skipped = [], []
    counters = {k: 0 for k in SKU_PREFIX}
    for p in sorted(products, key=lambda x: x["id"]):
        if p["name"].startswith("Reverse Withdrawal") or not p["images"]:
            skipped.append(p["name"])
            continue
        coll = coll_of.get(p["id"], "osmanli")
        counters[coll] += 1
        slug = p["permalink"].rstrip("/").split("/")[-1]
        slug = re.sub(r"[^a-z0-9-]", "", slug.lower())
        tkey, series = type_of(p["name"])
        if tkey == "obje":
            series = p["name"]
        imgs = []
        for i, im in enumerate(p["images"][:8]):
            fn = f"{slug}-{i + 1}.jpg"
            ok = fetch_img(im["src"], os.path.join(IMG_DIR, fn)) if download else os.path.exists(os.path.join(IMG_DIR, fn))
            if ok:
                imgs.append(fn)
        if not imgs:
            skipped.append(p["name"])
            continue
        raw = p["description"]
        item = {
            "id": p["id"], "slug": slug, "name": p["name"], "series": series,
            "collection": coll, "type": tkey,
            "sku": f"CH-{SKU_PREFIX[coll]}-{counters[coll]:03d}",
            "images": imgs,
            "material": "porselen+cam" if coll == "bardak" else ("porselen" if "porselen" in raw.lower() else "cam"),
            "limited": "sınırlı" in raw.lower(),
        }
        size = re.search(r"(\d+)\s*cm", p["name"])
        item["dims"] = f"Ø {size.group(1)} cm" if size else DIMS.get(tkey, "")
        if coll == "bardak":
            item["set"] = split_set(raw)
            item["tr"] = item["en"] = ""
        else:
            item["tr"], item["en"] = split_story(raw)
        out.append(item)

    # newest first inside each collection keeps the strongest photography up front
    with open(OUT, "w", encoding="utf-8") as f:
        f.write("/* Generated by tools/build_catalog.py from camhare.com — do not edit by hand. */\n")
        f.write("window.CATALOG = ")
        json.dump(out, f, ensure_ascii=False, separators=(",", ":"))
        f.write(";\n")
    print(f"{len(out)} products written, skipped: {skipped}")
    by = {}
    for x in out:
        by[x["collection"]] = by.get(x["collection"], 0) + 1
    print(by)


if __name__ == "__main__":
    main()
