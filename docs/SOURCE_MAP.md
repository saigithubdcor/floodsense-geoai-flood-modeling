# Source map and file roles

## `portal_parent/app/`

The six principal HTML pages are `index.html`, `time.html`, `history.html`, `weather.html`, `outlook.html`, and `hindcast.html`. Their corresponding JavaScript and CSS resources are also supplied. The directory includes `data/study_area.json` and bundled MapLibre GL JS resources under `vendor/`.

## `checkpoint/overrides/`

The verified integration checkpoint contains overrides for `index`, `history`, `outlook`, styling and route/interaction components. The `gateway_v4.py` source contains the logic used for override-first serving.

## `checkpoint/*.py` and `backend_reference/portal_gateway.py`

These files are architectural references. The parent gateway imports unavailable runtime modules and may spawn local scientific services in the original environment. **Do not assume they are safe or sufficient to start independently.** No run command is provided for the complete FloodSense product.

## Source identity

`provenance/SOURCE_SHA256.csv` includes repository paths, archive source paths and full source SHA-256 hashes. The exported checkpoint's original `FS_V432_MANIFEST.json` and `R1R10_V32_MANIFEST.json` are preserved under `checkpoint/` for reference.
