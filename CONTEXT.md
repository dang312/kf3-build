# KF3 Build

This context defines the domain language for the Killing Floor 3 build simulator.

## Language

**Build**:
A shareable KF3 configuration for one perk, including the perk level, selected skills, and later gun mod choices and derived starting money.
_Avoid_: Profile, account, match history

**BuildState**:
The canonical serializable representation of a build: selected perk slug, perk level, and explicit skill selections, with later loadout choices.
_Avoid_: UI state, derived summary, user profile

**BuildSummary**:
The read-only explanation computed from a build and current data, including selected skills, resolved values, derived starting money, and warnings.
_Avoid_: Outcome, result, report

**Perk**:
The playable KF3 perk that a build is for; it owns exactly three skill trees, level, and proficiency data.
_Avoid_: Character, class, role

**PerkSlug**:
A globally unique, hand-authored stable identifier for a perk, used when storing selected perk identity and shareable build state. It is independent of the display name and raw file path so perk names can be renamed without changing build identity.
_Avoid_: Display name as identity, raw file path as identity

**PerkSlugMigrationMap**:
A central compatibility map that resolves legacy perk slugs to current perk slugs when decoding saved or shared build states.
_Avoid_: Per-perk alias lists, scattered perk slug migrations

**PerkLevel**:
The selected progression level for a perk. Use `PerkLevel` in domain/types and `perkLevel` in build state; UI labels can say “Level”.
_Avoid_: Character level, generic level in domain code

**OperationalBudget**:
The starting-money budget available to a build, computed from the selected perk's fixed budget formula and perk level. The same perk at the same level has one fixed operational budget, though current data may be provisional until verified.
_Avoid_: User-entered budget override, unrelated economy system, match progression economy

**SkillCategory**:
One of the three skill trees every perk has: passives, throwable, or gadget. Game assets may say Passive/PASSIVES, Throwable/THROWABLE, and Gadget/GADGET; normalized app code uses `passives`, `throwable`, and `gadget`.
_Avoid_: Arbitrary section, custom group, optional fourth tree

**SkillTier**:
A level-gated row of skill options within a skill category.
_Avoid_: Skill level, rank, row index

**SkillTierNumber**:
The one-based tier number for a skill tier, matching how users see tiers in the UI. Zero-based array indexes are implementation details only.
_Avoid_: Exposed zero-based tier index, array index as domain state

**SkillSlot**:
A selectable position in a perk's skill tree, identified by skill category and one-based skill tier number. It is the place a skill selection belongs.
_Avoid_: Flat selected skill list, implicit selection position

**SkillOption**:
One selectable skill choice in a skill tier.
_Avoid_: Selected skill, array item, display name as identity

**SkillSelection**:
One selected-skill entry that assigns a skill slug to a skill slot. It carries the category, one-based tier number, and selected skill slug explicitly. A valid build has at most one skill selection per skill slot.
_Avoid_: Flat skill slug, hidden slot fields, duplicate slot selection, object nesting as selection identity

**SkillSelections**:
The collection of skill selections in a build, represented as explicit skill-selection entries.
_Avoid_: Flat skill slug list, nested object-key map

**SkillSlug**:
A globally unique, hand-authored stable identifier for a skill option across all perk JSON files, used when storing selections and shareable build state. It is independent of the display name so skill names can be renamed without changing build identity.
_Avoid_: Option index, array index, display name as identity, perk-scoped skill identity

**SkillSlugMigrationMap**:
A central compatibility map that resolves legacy global skill slugs to current global skill slugs when decoding saved or shared build states.
_Avoid_: Per-skill alias lists, scattered slug migrations

**Proficiency**:
A non-selectable per-perk progression or stat entry from the skill data. Show it separately from skill choices until verified game rules say it affects build summaries.
_Avoid_: Skill, selected skill, passive skill
