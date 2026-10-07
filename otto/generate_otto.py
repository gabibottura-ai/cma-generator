#!/usr/bin/env python3
"""Generate Otto, the staging character, with the Gemini image API (Nano Banana).

Usage:
    GEMINI_API_KEY=... python3 otto/generate_otto.py

Writes otto/otto-v1-01.png .. otto-v1-06.png and otto/contact-sheet.html
"""
import base64
import json
import os
import sys
import time
import urllib.error
import urllib.request

PROMPT = (
    "Cute cuddly 3D character, soft plush doll style, matte felt and boucle texture, "
    "warm studio light, pastel backdrop. A small round ottoman character named Otto: "
    "warm oatmeal boucle body with visible nubby texture, four short tapered walnut wood legs, "
    "small beady black eyes with heavy half closed lids, flat unimpressed mouth. "
    "A yellow measuring tape draped around him like a scarf. Plain soft sage green background. "
    "Front facing, full body, centered, square format, mouth closed."
)

COUNT = 6
OUT_DIR = os.path.dirname(os.path.abspath(__file__))
API_ROOT = "https://generativelanguage.googleapis.com/v1beta/models"

# Nano Banana. Tried in order; first one that returns an image wins.
MODELS = [
    os.environ.get("GEMINI_IMAGE_MODEL") or "gemini-2.5-flash-image",
    "gemini-3-pro-image-preview",
    "gemini-2.0-flash-preview-image-generation",
]


def api_key():
    key = os.environ.get("GEMINI_API_KEY") or os.environ.get("GOOGLE_API_KEY")
    if not key:
        sys.exit("Set GEMINI_API_KEY (or GOOGLE_API_KEY) and re-run.")
    return key


def request_image(model, key):
    """Return raw image bytes for one generation, or raise."""
    body = json.dumps({
        "contents": [{"parts": [{"text": PROMPT}]}],
        "generationConfig": {
            "responseModalities": ["IMAGE"],
            "imageConfig": {"aspectRatio": "1:1"},
        },
    }).encode()

    req = urllib.request.Request(
        f"{API_ROOT}/{model}:generateContent",
        data=body,
        headers={"Content-Type": "application/json", "x-goog-api-key": key},
        method="POST",
    )
    with urllib.request.urlopen(req, timeout=300) as resp:
        payload = json.load(resp)

    for cand in payload.get("candidates", []):
        for part in cand.get("content", {}).get("parts", []):
            inline = part.get("inlineData") or part.get("inline_data")
            if inline and inline.get("data"):
                return base64.b64decode(inline["data"])
    raise RuntimeError(f"no image in response: {json.dumps(payload)[:500]}")


def pick_model(key):
    last = None
    for model in MODELS:
        try:
            data = request_image(model, key)
            print(f"model: {model}")
            return model, data
        except (urllib.error.HTTPError, urllib.error.URLError, RuntimeError) as err:
            detail = err.read().decode()[:300] if isinstance(err, urllib.error.HTTPError) else str(err)
            print(f"  {model} unavailable: {detail}")
            last = err
    raise SystemExit(f"No image model worked. Last error: {last}")


def write_contact_sheet(names):
    cells = "\n".join(
        f'    <figure><img src="{n}" alt="{n}"><figcaption>{n}</figcaption></figure>'
        for n in names
    )
    html = f"""<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Otto v1</title>
<style>
  body {{ margin:0; padding:24px; background:#f6f5f1; font:14px/1.4 system-ui, sans-serif; color:#2d2a26; }}
  h1 {{ font-size:18px; font-weight:600; margin:0 0 16px; }}
  .grid {{ display:grid; grid-template-columns:repeat(auto-fit, minmax(220px, 1fr)); gap:16px; }}
  figure {{ margin:0; }}
  img {{ width:100%; aspect-ratio:1; object-fit:cover; border-radius:10px; display:block; background:#e8e6e0; }}
  figcaption {{ margin-top:6px; font-size:12px; color:#6b6761; }}
</style>
</head>
<body>
  <h1>Otto v1 &middot; {len(names)} variations</h1>
  <div class="grid">
{cells}
  </div>
</body>
</html>
"""
    path = os.path.join(OUT_DIR, "contact-sheet.html")
    with open(path, "w") as fh:
        fh.write(html)
    return path


def main():
    key = api_key()
    model, first = pick_model(key)

    names = []
    for i in range(1, COUNT + 1):
        name = f"otto-v1-{i:02d}.png"
        data = first if i == 1 else None
        for attempt in range(3):
            if data:
                break
            try:
                data = request_image(model, key)
            except Exception as err:  # noqa: BLE001 - retry any transient failure
                wait = 2 ** attempt
                print(f"  {name} attempt {attempt + 1} failed ({err}); retrying in {wait}s")
                time.sleep(wait)
        if not data:
            sys.exit(f"gave up on {name}")
        with open(os.path.join(OUT_DIR, name), "wb") as fh:
            fh.write(data)
        print(f"wrote {name} ({len(data) // 1024} KB)")
        names.append(name)

    sheet = write_contact_sheet(names)
    print(f"wrote {os.path.basename(sheet)}")


if __name__ == "__main__":
    main()
