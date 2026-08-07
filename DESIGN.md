---
name: Blantyre Pinball
colors:
  surface: '#fcf9f8'
  surface-dim: '#dcd9d9'
  surface-bright: '#fcf9f8'
  surface-container-lowest: '#ffffff'
  surface-container-low: '#f6f3f2'
  surface-container: '#f0eded'
  surface-container-high: '#eae7e7'
  surface-container-highest: '#e5e2e1'
  on-surface: '#1b1c1c'
  on-surface-variant: '#42474e'
  inverse-surface: '#303030'
  inverse-on-surface: '#f3f0ef'
  outline: '#72777e'
  outline-variant: '#c2c7ce'
  surface-tint: '#396285'
  primary: '#00263f'
  on-primary: '#ffffff'
  primary-container: '#0b3c5d'
  on-primary-container: '#7fa7cd'
  inverse-primary: '#a3cbf2'
  secondary: '#7a5900'
  on-secondary: '#ffffff'
  secondary-container: '#fdbc13'
  on-secondary-container: '#6b4d00'
  tertiary: '#002b15'
  on-tertiary: '#ffffff'
  tertiary-container: '#004323'
  on-tertiary-container: '#5bb57d'
  error: '#ba1a1a'
  on-error: '#ffffff'
  error-container: '#ffdad6'
  on-error-container: '#93000a'
  primary-fixed: '#cee5ff'
  primary-fixed-dim: '#a3cbf2'
  on-primary-fixed: '#001d32'
  on-primary-fixed-variant: '#1f4a6c'
  secondary-fixed: '#ffdea3'
  secondary-fixed-dim: '#fdbc13'
  on-secondary-fixed: '#261900'
  on-secondary-fixed-variant: '#5d4200'
  tertiary-fixed: '#9af6b8'
  tertiary-fixed-dim: '#7ed99e'
  on-tertiary-fixed: '#00210f'
  on-tertiary-fixed-variant: '#00522d'
  background: '#fcf9f8'
  on-background: '#1b1c1c'
  surface-variant: '#e5e2e1'
typography:
  display-lg:
    fontFamily: Lexend
    fontSize: 48px
    fontWeight: '700'
    lineHeight: 56px
    letterSpacing: -0.02em
  display-lg-mobile:
    fontFamily: Lexend
    fontSize: 32px
    fontWeight: '700'
    lineHeight: 40px
    letterSpacing: -0.02em
  headline-md:
    fontFamily: Lexend
    fontSize: 24px
    fontWeight: '600'
    lineHeight: 32px
  body-lg:
    fontFamily: Inter
    fontSize: 18px
    fontWeight: '400'
    lineHeight: 28px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: '400'
    lineHeight: 24px
  label-caps:
    fontFamily: Lexend
    fontSize: 12px
    fontWeight: '700'
    lineHeight: 16px
    letterSpacing: 0.05em
rounded:
  sm: 0.5rem
  DEFAULT: 1rem
  md: 1.5rem
  lg: 2rem
  xl: 3rem
  full: 9999px
spacing:
  unit: 4px
  xs: 4px
  sm: 8px
  md: 16px
  lg: 24px
  xl: 32px
  2xl: 48px
  3xl: 64px
  container-max: 1200px
  gutter: 20px
---

## Brand & Style

The design system is built to evoke the energy and warmth of Blantyre through a lens of premium, modern arcade aesthetics. It rejects the dark, smoky visual tropes of traditional gambling and casinos in favor of an optimistic, "daylight" arcade experience. 

The style is **Clean Modernism mixed with Glassmorphism**. It utilizes a bright, expansive off-white environment that allows vibrant African-inspired colors to pop. The interface should feel "light as air" yet tactile, using high-quality glass textures for the heads-up display (HUD) to ensure the game field remains visible and the UI feels non-intrusive. The emotional response should be one of joy, high-stakes excitement, and professional polish.

## Colors

The palette is anchored by a sophisticated **Deep Blue** representing the skyline and stability, contrasted by a **Warm Gold** that mimics the Malawian sun. 

- **Primary (Deep Blue):** Used for core branding, primary buttons, and deep structural elements.
- **Secondary (Warm Gold):** Reserved for high-value interactions, score highlights, and "Winner" states.
- **Accent (Emerald Green):** Used for bonus triggers, eco-themed game elements, and progress indicators.
- **Gradients:** Use linear gradients starting from Primary to a slightly lighter tint for depth, or a subtle transition from Secondary to a brighter yellow for interactive states. Avoid harsh black-to-color gradients.

## Typography

This design system uses a dual-font strategy. **Lexend** is the primary driver for high-energy display moments, scores, and headings; its geometric clarity and readability support the "Modern Arcade" vibe. **Inter** provides a neutral, highly legible foundation for settings, descriptions, and functional labels.

For mobile, "Display" sizes must scale down aggressively to maintain the layout's integrity during intense gameplay. Always use `label-caps` for table headers or small metadata to ensure distinct hierarchy from body text.

## Layout & Spacing

The layout utilizes a **fluid grid** for the game lobby and menus, transitioning to a **safe-area focused contextual layout** during active gameplay. 

- **Desktop:** 12-column grid with 24px gutters.
- **Tablet:** 8-column grid with 20px gutters.
- **Mobile:** 4-column grid with 16px margins.

HUD elements should be pinned to the corners of the screen with a "safe margin" of 32px to account for various device aspect ratios. Use a consistent 4px base-unit for all internal component padding to maintain a rhythmic, systematic appearance.

## Elevation & Depth

This design system utilizes **Multi-layered Ambient Shadows** and **Glassmorphism** to create a sense of premium physical space.

- **HUD Panels:** Use a background blur (backdrop-filter: blur(12px)) with a 20% opaque white fill. Add a 1px solid white border at 30% opacity to define the "glass" edge.
- **Cards & Containers:** Use "Soft Depth" — a combination of a small, sharp shadow (4px blur, 5% opacity) and a large, diffused shadow (24px blur, 10% opacity) in the Primary color hex to give a subtle "lift."
- **Interactive Elements:** On hover or active state, the diffused shadow should increase in spread and opacity, simulating the object moving closer to the user.

## Shapes

The shape language is extremely approachable and friendly. We use high-radius values to eliminate the "sharpness" of digital interfaces. 

- **Primary Buttons:** Fully pill-shaped (rounded-full) for a playful, arcade feel.
- **Panels/Cards:** Use `rounded-2xl` (1rem) for standard components and `rounded-3xl` (1.5rem) for large dashboard containers.
- **Iconography:** Use a consistent 2px stroke width with rounded caps and joins to match the typography.

## Components

### Buttons
Primary buttons should use a subtle vertical gradient of the Primary color, with white Lexend text. The "Play" or "Start" button is the exception, using the Secondary Gold to demand immediate attention. All buttons should have a slight "squish" animation (0.95 scale) on press.

### HUD Chips
Small, translucent glass chips used for displaying live stats (e.g., Multiplier, Balls Left). They feature a `label-caps` heading and a `headline-md` value.

### Cards
Lobby game cards use the `rounded-2xl` shape with a white surface. The image/illustration should be clipped with a top-only radius, leaving the bottom for clean typography and "Play Now" actions.

### Input Fields
Fields are Off-White with a 1px border. On focus, the border transitions to Primary Blue with a soft glow (shadow) of the same color.

### Lists
Scoreboards and leaderboards use alternating row highlights (5% opacity of Primary Blue) rather than hard dividers, keeping the interface feeling open and clean.