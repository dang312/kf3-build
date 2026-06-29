---
status: accepted
---

# Store operational budget formulas in perk data

Operational Budget / Starting Money is derived from the selected `PerkSlug` and `PerkLevel`, and the formula belongs in each perk JSON file rather than a separate cross-perk budget table. Formulas are structured data handled by known budget helpers, include a `verificationStatus`, and can carry a `sourceNote`; provisional values should be shown with a note that they may update later. The computed budget is derived data and should not be stored independently in canonical `BuildState` or shared build state unless a future explicit requirement adds budget overrides.
