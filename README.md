# FloodSense | GeoAI Flood Modelling and Decision Support

**Six-page geospatial UI source snapshot · V4.3.2 · 6 November 2026**

FloodSense is a BITS Pilani Practice School-II project developed during an internship at BISAG-N, Gandhinagar. It explores how satellite observations, hydrological and hydraulic simulation, machine-learning surrogates, and an interactive geospatial interface can support the analysis of flooding in the **Vashishti–Chiplun river basin, Maharashtra, India**.

This repository contains a **verified historical user-interface source snapshot** exported on **23 November 2026**. It is **not** the complete executable FloodSense platform, not a public flood-warning service, and not a statement that every downstream forecast has been scientifically validated.

## What the interface contains

| View | Purpose |
| --- | --- |
| GeoOps (`index.html`) | Basin maps and selected flood information |
| Time & Events (`time.html`) | Date/time navigation and temporal inspection |
| Historical Events (`history.html`) | Registered historical-event exploration |
| Weather & Basin (`weather.html`) | Meteorological and basin context |
| Scenario Outlook (`outlook.html`) | Scenario-based forecast exploration |
| ML Hindcast (`hindcast.html`) | Historical machine-learning reconstruction views |

The UI uses **HTML, CSS, JavaScript, MapLibre GL JS**, and an overlay-style **Python HTTP gateway**. Source files include map controls, date-aware interactions, historical replay views and impact-inspection interfaces.

## Repository layout

```text
portal_parent/app/             Historical portal source: six pages, CSS, JS, study-area configuration
portal_parent/app/vendor/      Bundled MapLibre GL JS components (third-party)
checkpoint/overrides/          Verified V4.3.2 override files
checkpoint/gateway_v4.py      UI overlay / API proxy gateway (source reference)
checkpoint/overlay_gateway_r1r10_v3.py    Earlier overlay gateway (source reference)
checkpoint/*MANIFEST.json     Recorded upstream checksum manifests
backend_reference/            Partial original API gateway source for architectural review
provenance/                   Exact source-to-export file hashes and status explanation
docs/                         Architecture, source map, scope and publication notes
third_party/                  Licenses/notices for bundled third-party files
```

## Science and research context

The wider FloodSense project used an approximately **602.81 km² basin**, **19 HEC-HMS sub-basins**, and a **4,783-cell HEC-RAS 2D mesh**. Its hydraulic-scenario library includes **120 simulations**. Additional research investigated scenario-based machine-learning prediction and historical hindcasts. These scientific models, trained weights, original rainfall/terrain datasets and research-service dependencies **are not in this source archive**.

**Scientific interpretation:** Depth or classification metrics discussed in the wider project are measured primarily against hydraulic-simulation targets. They must not be interpreted as independently confirmed real-world forecasting skill.

## Important reproducibility note

The interface snapshot depends on **local REST endpoints** served by the wider project. The `portal_parent` gateway source imports multiple modules that are not included here (for example `datastore`, `meteo_service`, `historical_replay_service`, and model services). Consequently, opening an HTML page or starting an isolated gateway **will not** recreate the full model-backed experience. No hosted demo URL is claimed.

For original file mapping and checkpoint validation, see [`docs/SOURCE_MAP.md`](docs/SOURCE_MAP.md) and [`docs/VERIFICATION_AND_LIMITATIONS.md`](docs/VERIFICATION_AND_LIMITATIONS.md). The broader model architecture and reported simulation-target results are summarized in [`docs/RESEARCH_SUMMARY.md`](docs/RESEARCH_SUMMARY.md).

## Attribution

**Sai Manmohan Mohanty**, with project teammates **Prabhan Bugatha** and **Sriharsh Moogala**, Practice School-II, BITS Pilani. BISAG-N mentor: **Vedant Joshi**. The repository reflects collaborative project work; it does not claim that every underlying component was authored by one individual.

Map rendering uses third-party **MapLibre GL JS**, subject to its own license in [`third_party/MapLibre_GL_JS_LICENSE.txt`](third_party/MapLibre_GL_JS_LICENSE.txt). Mapping tiles or external datasets may be subject to separate use terms.

## Status

- Accepted UI checkpoint: **V4.3.2, 6 November 2026** (with recorded visual limitations)
- Source export: **23 November 2026**, 17 of 17 checkpoint-tracked source hashes verified
- Full scientific product release: **not established by this UI checkpoint**
- Code in this repository has been reorganized **without changing the original source-file contents**. For checksums, see `provenance/SOURCE_SHA256.csv`.
