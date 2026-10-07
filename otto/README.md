# Otto

Otto is Gabi's staging character: a small round ottoman, oatmeal boucle body,
walnut wood legs, permanently unimpressed, with a yellow measuring tape scarf.

## Generate

```bash
GEMINI_API_KEY=... python3 otto/generate_otto.py
```

Writes `otto-v1-01.png` through `otto-v1-06.png` plus `contact-sheet.html`
(open that to see all six side by side).

The prompt is locked inside `generate_otto.py` as `PROMPT`. Keep it byte for
byte identical across runs so versions stay comparable. Bump the `v1` in the
filenames when the prompt changes.

## Model

`gemini-3-pro-image-preview` (Nano Banana Pro) at `imageSize` 1K, 1:1, matching
REND (`stage/stage/imagepass.py`, `ladeene/nano_banana.py`). Falls back to
`gemini-2.5-flash-image` only if the preview id is not on the key; the
`imageSize` field is dropped on that fallback because 2.5 flash rejects it.

Override with `GEMINI_IMAGE_MODEL` and `GEMINI_IMAGE_SIZE`.

About $0.134 per 1K image, so roughly $0.80 for a batch of six.
