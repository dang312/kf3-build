---
name: Horzine Tactical HUD
colors:
  surface: '#121317'
  surface-dim: '#121317'
  surface-bright: '#37393d'
  surface-container-lowest: '#0c0e11'
  surface-container-low: '#1a1c1f'
  surface-container: '#1e2023'
  surface-container-high: '#282a2d'
  surface-container-highest: '#333538'
  on-surface: '#e2e2e6'
  on-surface-variant: '#b9cacb'
  inverse-surface: '#e2e2e6'
  inverse-on-surface: '#2f3034'
  outline: '#849495'
  outline-variant: '#3a494b'
  surface-tint: '#00dbe7'
  primary: '#e1fdff'
  on-primary: '#00363a'
  primary-container: '#00f2ff'
  on-primary-container: '#006a71'
  inverse-primary: '#00696f'
  secondary: '#ffb77f'
  on-secondary: '#4e2600'
  secondary-container: '#ff8a00'
  on-secondary-container: '#613100'
  tertiary: '#e3ffde'
  on-tertiary: '#00390e'
  tertiary-container: '#92f095'
  on-tertiary-container: '#046f25'
  error: '#ffb4ab'
  on-error: '#690005'
  error-container: '#93000a'
  on-error-container: '#ffdad6'
  primary-fixed: '#74f5ff'
  primary-fixed-dim: '#00dbe7'
  on-primary-fixed: '#002022'
  on-primary-fixed-variant: '#004f54'
  secondary-fixed: '#ffdcc4'
  secondary-fixed-dim: '#ffb77f'
  on-secondary-fixed: '#2f1500'
  on-secondary-fixed-variant: '#6f3900'
  tertiary-fixed: '#9af89c'
  tertiary-fixed-dim: '#7edb82'
  on-tertiary-fixed: '#002106'
  on-tertiary-fixed-variant: '#005319'
  background: '#121317'
  on-background: '#e2e2e6'
  surface-variant: '#333538'
typography:
  display-title:
    fontFamily: Fira Mono
    fontSize: 27px
    fontWeight: '800'
    lineHeight: 27px
    letterSpacing: -0.08em
  headline-lg:
    fontFamily: Fira Mono
    fontSize: 22px
    fontWeight: '700'
    lineHeight: 24px
    letterSpacing: 0.08em
  headline-sm:
    fontFamily: Fira Mono
    fontSize: 19px
    fontWeight: '700'
    lineHeight: 21px
    letterSpacing: 0.05em
  body-md:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: '400'
    lineHeight: 21px
    letterSpacing: 0em
  body-sm:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: '400'
    lineHeight: 16px
    letterSpacing: 0em
  label-hud:
    fontFamily: Fira Mono
    fontSize: 10px
    fontWeight: '700'
    lineHeight: 12px
    letterSpacing: 0.06em
  label-micro:
    fontFamily: Fira Mono
    fontSize: 9px
    fontWeight: '700'
    lineHeight: 10px
    letterSpacing: 0.04em
spacing:
  base: 4px
  gap-xs: 4px
  gap-sm: 8px
  gap-md: 12px
  gap-lg: 16px
  container-max: 1760px
  sidebar-width: 320px
---

## Brand & Style

The design system is modeled after a high-stakes, military-grade holographic HUD. It evokes the feeling of an interactive terminal used in a dark, industrial armory. The emotional response is one of precision, urgency, and tactical depth.

The visual style is a hybrid of **Brutalism** and **Glassmorphism**:
- **Brutalism:** Expressed through sharp 0px corners, dense information layouts, and monospaced "data-crunching" typography.
- **Glassmorphism:** Applied via translucent "Horzine Cyan" overlays, backdrop blurs, and glowing volumetric lighting that simulates a projection over a physical surface.

The background is an atmospheric, deep industrial charcoal. Volumetric light sources (Hazard Orange) should appear to emanate from the top-center, casting a subtle glow on the "glass" UI elements below.

## Colors

The palette is strictly functional, contrasting deep "Abyssal" foundations with high-voltage holographic accents.

- **Primary (Horzine Cyan):** Used for active system energy, spent skill ranks, circuitry paths, and illuminated metadata.
- **Secondary (Hazard Orange):** Reserved for primary interactive focus, active selection boundaries, and critical system headers.
- **Tertiary (Tactical Green):** Indicates "Maxed" states, verified upgrades, and successful validation.
- **Neutral (Abyssal Sector):** The foundation. Use `#0A0C0F` for the main background and `#0B0906` for solid terminal viewports.
- **Status Colors:** Use `#E8594D` (Crimson) for errors/locked requirements and `#DCA400` (Gold) for system warnings.

## Typography

This system uses a high-contrast dual-font strategy:
- **Fira Mono (Technical):** Used for all headlines, labels, and numeric telemetry. Titles and labels must use **all-caps text transformation** to maintain a structured military aesthetic.
- **Inter (Systematic):** Used for skill descriptions and tactical analysis where readability is paramount.

Large display titles should have negative tracking to feel like a heavy stamp, while HUD labels should have increased letter spacing for a "scanning" effect.

## Layout & Spacing

The layout is a **Fixed Grid** model designed for high-density information display, optimized for widescreen gaming monitors.

- **Grid:** A three-column layout for primary skill trees (Passives, Throwables, Gadgets).
- **Rhythm:** An aggressive 4px baseline spacing. Elements are packed tightly to minimize scrolling and ensure all tactical data is visible at a glance.
- **Responsiveness:**
  - **Desktop:** Sidebar is docked to the right with a fixed width.
  - **Tablet:** Summary panel wraps below the main grid.
  - **Mobile:** The summary panel transforms into a "HUD Tab"—a floating bottom sheet. The three-column grid collapses to a single-column stack.

## Elevation & Depth

Hierarchy is established through **Glassmorphism** and **Tonal Layers** rather than traditional shadows.

1.  **Floor:** The base background (`#0A0C0F`) with a top-down radial orange gradient.
2.  **Surface-Terminal:** Opaque base for primary containers.
3.  **Surface-Chamber:** Translucent glass layer for interactive cards, using a `backdrop-filter: blur(8px)`.
4.  **Holographic Glow:** Instead of shadows, active elements use a `1px` solid glow in Horzine Cyan or Hazard Orange. Selected states should have a subtle inner glow (box-shadow inset) to suggest the element is "powered on."

## Shapes

This design system exclusively uses **Sharp (0)** corners. There are no rounded corners in the interface. All containers, buttons, and meters must be hard-angled to reinforce the industrial, rugged hardware aesthetic. Hexagonal or chamfered corners may be used for specialized icons but never for primary container boundaries.

## Components

### Tactical Modules (Skill Cards)
- **Base:** Sharp edges, 1px border (`#413C36`), background (`#120F0B`).
- **States:**
  - **Selected:** Border changes to Hazard Orange (`#FF8A00`) with a matching translucent overlay.
  - **Maxed:** Border and rank indicators glow Tactical Green (`#71CD76`).
  - **Locked:** 50% opacity, grayscaled content, with a centered padlock icon overlay.
- **Rank Meter:** A row of square blocks at the bottom of the card. Spent ranks illuminate in Horzine Cyan.

### HUD Tab (Navigation)
A floating container at the bottom of the screen. It should feature a translucent "glass" background with a thick Hazard Orange top-accent border. Actions inside use monospaced uppercase text.

### Holographic Sidebar
A docked panel for build telemetry. Use "volumetric" borders (thicker, high-contrast silver `#6E6860`). Nested items inside the sidebar should look like technical schematics with thin cyan wireframe lines.

### Inputs & Selectors
- **Perk Select:** Integrated modules where the label (`PERK`) is a small micro-tag on the left and the value is a bold, uppercase selector on the right.
- **Sliders:** Level adjustments use thick, blocky range sliders in Hazard Orange.

### Icons
Icons must be rendered as technical schematics—thin lines, high detail, and a faint holographic cyan glow. Avoid solid fills; use wireframes where possible.