# Skill rank scaling analysis

## Finding

An equipped skill may have rank `0`: it remains selected, unlocks the following row, and applies its base effect. Rank zero means **zero upgrade points spent**, not a zero-valued effect. For example, Commando's A Bigger Bang has a 15% grenade-radius increase at rank zero; 0% would contradict both the game curve and the skill's behavior.

The initial fix incorrectly treated rank zero as the numeric value `0`. The actual local-game curve has a value at x=0, so `SkillOption.effect.values` must include that base value. `SkillCard.svelte` had also converted rank `0` to `undefined` with `rank || undefined`; the formatter then showed a range instead of the actual base value.

## Resolution

- Curve arrays are rank-indexed from `0` through the skill's rank cap; index 0 is the equipped base effect.
- `formatValueAtRank` uses the supplied rank as the array index.
- `SkillCard` passes its actual rank, including zero, to the formatter.
- `SkillDetailPanel` resolves an absent selected rank as zero for its effect preview.
- Build Summary resolves and displays the base effect at rank zero; its label distinguishes it from purchased upgrades.

Regression coverage asserts Commando A Bigger Bang renders `Grenade explosion radius is increased by [15%].` at rank zero.

## Game-data scaling status

Rank-indexed arrays are derived from the local game install, not web guides. The extraction pairs each specialist's `SPEC_*_Skills_CT.uasset` curve table with its `SPEC_*_Skills_DT.uasset` conversion rule, evaluates ranks 0–3, and records the resulting arrays in `effect.values`. The normalized JSON retains the curve and conversion-rule provenance for each populated skill.

This has populated 190 skills across the six current perks. Eight skills with `MultiplyBy` conversion rules still require their game-data baseline to be decoded, so their values remain unset rather than guessed. Capacity Increase is a fixed, non-upgradeable effect and is intentionally excluded from rank scaling.
