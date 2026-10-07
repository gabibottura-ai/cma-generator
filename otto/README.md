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

Model order tried: `gemini-2.5-flash-image` (Nano Banana), then
`gemini-3-pro-image-preview`, then `gemini-2.0-flash-preview-image-generation`.
Override with `GEMINI_IMAGE_MODEL`.
