# FloodSense research context beyond this UI snapshot

This file summarizes the wider research project. **The scientific model source, hydraulic scenarios, weights and evaluation artifacts are not included in this V4.3.2 UI snapshot.** Metrics below originate from the separate final project handover and should be verified against that handover in an academic review.

## Hydrological and hydraulic foundation

- Study region: Vashishti–Chiplun watershed, Maharashtra, India (~602.81 km²; EPSG:32643)
- Terrain: FABDEM 30 m; rainfall forcing drawn from NASA GPM IMERG
- HEC-HMS event reconstruction: 19 sub-basins, July 2021 rainfall–runoff analysis
- HEC-RAS 2D: 4,783 cells, with approximately 4,539 valid-depth cells reported for the calibrated event simulation
- Simulation library: 120 scenario runs, 191 time states per scenario, enabling a scenario-wise train/validation/test split

## Retained hydraulic prediction architecture

The separate Phase7F handover describes **30 task-specific surrogate models** covering five target families—water depth, water-surface elevation, mean velocity, maximum velocity, and flood classification—at **+5, +10, +15, +30, +50, and +60 minutes**.

Reported held-out simulator-target results at +60 minutes include:

| Metric | Reported result | Interpretation |
| --- | ---: | --- |
| Flood-depth MAE | 0.01458 m | Agreement with held-out hydraulic-simulation depth targets |
| Flood classification F1 | 0.9882 | Simulation-target classification agreement |
| Flood classification IoU | 0.9768 | Simulation-target inundation overlap |
| Empirical conformal interval coverage | 90.37% | Reported held-out in-support coverage of nominal 90% intervals |

**These are not independent observations-based flood-warning accuracy scores**. Separate hindcast studies, satellite comparisons, and operational reliability gates have their own limitations and should not be conflated with the surrogate-model test metrics.

## Interfaces represented in this repository

The extracted GUI source presents historical replay, temporal navigation, weather context, scenario outlooks, and infrastructure impacts through MapLibre maps and API-backed panels. Source code demonstrates frontend organization and integration patterns, but no complete standalone scientific pipeline can be reproduced from this repository alone.

## Suggested supplementary evidence

For a complete public technical portfolio, add **approved** architecture diagrams, map screenshots, validation figures, and a separate scientific-methodology report. Avoid claiming a working hosted demo until a validated, self-contained deployment is actually published.
