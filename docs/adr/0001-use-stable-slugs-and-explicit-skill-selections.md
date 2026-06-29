---
status: accepted
---

# Use stable slugs and explicit skill selections

KF3 shared builds must identify perks by globally unique `PerkSlug` and skills by globally unique `SkillSlug`, not by display names, raw file paths, or array indexes. Skill selections are stored as an array of explicit `SkillSelection` entries containing `category`, one-based `tierNumber`, and `skillSlug`; duplicate entries for the same `SkillSlot` are invalid. This keeps shared links stable across display-name changes and avoids silently repairing ambiguous shared build data.
