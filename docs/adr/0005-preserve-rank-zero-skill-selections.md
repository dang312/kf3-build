---
status: accepted
---

# Preserve rank-zero skill selections

A `SkillSelection` remains in canonical `BuildState` at rank zero. Equipping a skill satisfies that row’s prerequisite for the next tier independently from points spent, so refunding a skill from rank one to rank zero neither clears the selection nor later tiers. Rank-zero selections apply the local-game-data base effect and appear in Build Summary as a base effect with no upgrade points spent.
