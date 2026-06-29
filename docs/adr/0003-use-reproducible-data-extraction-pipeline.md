---
status: accepted
---

# Use a reproducible data extraction pipeline

KF3 skill data should be collected through a reproducible pipeline that prioritizes local game-file/in-game verification and official sources, while using community web sources only as provisional input. Tooling should inventory or import data into reviewable candidate files, not silently overwrite app data, and raw game archives or bulk extractor outputs must stay out of git. This favors repeatable patch updates and auditable source notes over one-off manual transcription.
