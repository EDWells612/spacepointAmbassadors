---
version: alpha
name: SpacePoint Dark Orbit
description: A futuristic, education-focused dark system with vivid violet accents and spacious hero storytelling.
colors:
  primary: "#653F84"
  secondary: "#B79AE0"
  tertiary: "#231134"
  neutral: "#05030A"
  surface: "#120B1A"
  on-surface: "#FFFFFF"
  error: "#D94B5F"
  primary-60: "#8A68A5"
  primary-70: "#774F95"
  primary-80: "#653F84"
  primary-90: "#4B2E66"
typography:
  headline-display:
    fontFamily: Outfit
    fontSize: 48px
    fontWeight: 800
    lineHeight: 48px
    letterSpacing: 0px
  headline-lg:
    fontFamily: Outfit
    fontSize: 38px
    fontWeight: 800
    lineHeight: 48px
    letterSpacing: 0px
  headline-md:
    fontFamily: Outfit
    fontSize: 29px
    fontWeight: 800
    lineHeight: 32px
    letterSpacing: 0px
  headline-sm:
    fontFamily: Inter
    fontSize: 23px
    fontWeight: 500
    lineHeight: 28px
    letterSpacing: 0.7px
  body-lg:
    fontFamily: Outfit
    fontSize: 18px
    fontWeight: 500
    lineHeight: 28px
    letterSpacing: 0px
  body-md:
    fontFamily: Inter
    fontSize: 16px
    fontWeight: 400
    lineHeight: 24px
    letterSpacing: 0px
  body-sm:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 400
    lineHeight: 20px
    letterSpacing: 0px
  label-lg:
    fontFamily: Inter
    fontSize: 14px
    fontWeight: 600
    lineHeight: 20px
    letterSpacing: 0px
  label-md:
    fontFamily: Inter
    fontSize: 12px
    fontWeight: 600
    lineHeight: 16px
    letterSpacing: 0.04em
  label-sm:
    fontFamily: Inter
    fontSize: 11px
    fontWeight: 600
    lineHeight: 14px
    letterSpacing: 0.06em
rounded:
  none: 0px
  sm: 4px
  md: 8px
  lg: 16px
  xl: 28px
  full: 9999px
spacing:
  xs: 8px
  sm: 16px
  md: 28px
  lg: 48px
  xl: 80px
components:
  button-primary:
    backgroundColor: "{colors.primary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 14px 28px
    height: 52px
  button-primary-hover:
    backgroundColor: "{colors.primary-60}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 14px 28px
    height: 52px
  button-secondary:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 14px 28px
    height: 52px
  button-secondary-border:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-lg}"
    rounded: "{rounded.full}"
    padding: 14px 28px
    height: 52px
  button-link:
    backgroundColor: "transparent"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-sm}"
    rounded: "{rounded.none}"
    padding: 0px
  card:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-surface}"
    rounded: "{rounded.lg}"
    padding: 28px
  input:
    backgroundColor: "{colors.tertiary}"
    textColor: "{colors.on-surface}"
    typography: "{typography.body-md}"
    rounded: "{rounded.md}"
    padding: 14px 16px
  chip:
    backgroundColor: "{colors.primary-90}"
    textColor: "{colors.on-surface}"
    typography: "{typography.label-md}"
    rounded: "{rounded.full}"
    padding: 8px 12px
---

# SpacePoint Dark Orbit

## Overview

SpacePoint feels futuristic, aspirational, and educational, with a strong “mission control” mood anchored in deep black space and bright violet highlights. The visual tone is dramatic but welcoming, aimed at students, institutions, and partners who should feel both inspired and confident in the program. The layout is spacious and cinematic, using a large hero area and minimal chrome to let the messaging and satellite imagery dominate.

## Colors

- **Primary (#653F84):** The signature violet used for key actions, brand accents, and interactive emphasis. It gives the site its distinctive space-tech identity without becoming neon or overly synthetic.
- **Secondary (#B79AE0):** A lighter lavender used for supporting highlights and subtle accent moments. It helps headlines and small UI details feel luminous against the dark background.
- **Tertiary (#231134):** A deep plum-surface tone used for cards, panels, and layered containers. This keeps content readable while preserving the dark, atmospheric theme.
- **Neutral (#05030A):** The core background black, used across the page canvas and large negative-space areas. It reinforces the outer-space feel and provides maximum contrast for white text.
- **On-surface (#FFFFFF):** The main text and icon color. White is used for body copy, headings, and button labels to maintain crisp legibility.
- **Error (#D94B5F):** A reserved warning tone for validation and destructive states. It should stay visually separate from the brand violet.
- **Primary-60 (#8A68A5) and Primary-70 (#774F95):** Softer and darker variations of the brand violet for hover states, overlays, and subtle depth shifts.
- **Primary-90 (#4B2E66):** The darkest violet token, useful for chips, badges, and quiet accent blocks that need to recede.

## Typography

The system combines **Outfit** for expressive headings and lead copy with **Inter** for functional UI text. Outfit provides the bold, rounded, futuristic personality seen in the hero, while Inter keeps navigation and controls compact, neutral, and readable. Headings are heavy and tightly set, with no visible uppercase decoration; the only letter-spacing cue is a slight tracking increase in smaller headline-style text.

- **Headline display / lg / md:** Use Outfit at 48px, 38px, and 29px with weight 800. These are meant for hero statements, section titles, and major content moments.
- **Headline sm:** Use Inter at 23px weight 500 with 0.7px letter spacing for medium-emphasis messaging or eyebrow-like lead-in text.
- **Body lg:** Use Outfit at 18px weight 500 for prominent supporting copy, especially in the hero where the brand voice stays warm and readable.
- **Body md / sm:** Use Inter for standard paragraph and utility text, keeping long-form readability strong in denser areas.
- **Label lg / md / sm:** Use Inter semibold for buttons, navigation, chips, and microcopy. The smaller label sizes can use modest tracking for a more engineered, interface-like feel.

## Layout

The page follows a fluid, full-bleed layout rather than a boxed editorial container. Large negative space is central to the composition, with content anchored in a left text column and a right visual showcase that balances the hero. Spacing rhythm is built from the 8px-based scale in `spacing`, with 16px, 28px, 48px, and 80px steps creating clear jumps between micro, component, section, and hero spacing.

Use generous section padding and wide internal gutters so the interface never feels crowded. Cards and callouts should sit in compact, legible blocks with substantial internal padding, while navigation and hero CTAs need enough horizontal breathing room to feel premium and intentional.

## Elevation & Depth

Depth is achieved more through tonal layering than through heavy shadow. The design relies on contrast between the near-black background, plum surfaces, and violet highlights, with only very subtle shadowing in the system. Borders are soft and semi-transparent where needed, especially on cards, to suggest glassy or orbital layering without breaking the flat, cinematic mood.

The strongest depth cues come from overlapping imagery, faint rings, starfield noise, and glow-like violet gradients. Avoid overly material shadows; the interface should feel immersive and space-like, not skeuomorphic.

## Shapes

The shape language is soft and highly rounded for interactive elements, with pills used for primary actions and navigation buttons. Cards use a medium 16px radius to stay contained while still feeling approachable. Overall, the system balances rounded friendliness with technical precision, which suits an education brand with a space exploration theme.

## Components

### Buttons
- **Primary (`button-primary`):** Solid violet fill, white text, pill radius, and a 52px height. This is the main conversion action and should be visually dominant without extra decoration.
- **Primary hover (`button-primary-hover`):** Use a lighter violet to signal interactivity while preserving the same shape and sizing.
- **Secondary (`button-secondary` and `button-secondary-border`):** Transparent fill with violet or subtle outline treatment, white text, and the same pill shape. Use for secondary CTAs like “Watch Our Journey.”
- **Link (`button-link`):** Minimal text-only treatment for tertiary actions. Keep it understated and avoid using it for primary navigation tasks.

Buttons should remain compact, bold, and consistent in padding: 14px vertical and 28px horizontal. Labels are best set in Inter semibold for a clear action-oriented tone.

### Cards
Cards should use `card` styling: deep plum surfaces, a 1px translucent violet border, 16px radius, and 28px padding. They should feel like information panels or achievement tiles rather than raised UI surfaces. Keep contents centered on clarity, not decoration.

### Inputs
Inputs should follow the same dark-surface language as cards, with muted boundaries and white text. Use `input` for form fields, keeping them calm and readable rather than bright. Focus states should lean on violet rather than heavy outlines.

### Chips and badges
Chips should use `chip` styling with rounded full pills and small semibold labels. Their role is to tag milestones, categories, or program metadata without stealing attention from the hero or primary CTAs.

### Navigation
Top navigation is minimal, inline, and text-first. Active emphasis should be achieved with color contrast rather than chrome. The brand mark and primary CTA should be the only strongly weighted elements in the header.

### Media and decorative elements
Imagery and hero graphics should be allowed to overlap, scale large, and float against the background. Decorative rings, star fields, and glow elements should stay subtle so the spacecraft illustration and headline remain the focal points.

## Do's and Don'ts

- Do use Outfit for big, emotional headlines and Inter for navigation, labels, and utility text.
- Do keep the background nearly black and use violet as the main brand signal.
- Do favor pill-shaped primary actions and modestly rounded cards.
- Do preserve generous whitespace so the page feels cinematic and uncluttered.
- Don't introduce bright saturated colors that compete with the violet identity.
- Don't add heavy drop shadows or glossy skeuomorphic effects.
- Don't crowd the hero with too many panels, badges, or supporting widgets.
- Don't use sharp corners on primary buttons or key interactive elements.