# Along Transit Map Design System

## 1. Core Principles

- **Designed for Abuja Corridor Transit**: Restrained, calm transit map aesthetic inspired by urban rail systems, high legibility, zero neon SaaS clutter.
- **Restrained 60/30/10 Palette**: 60% canvas/paper and ink surfaces, 30% brand green accents (active route, primary buttons, focus states), 10% purposeful signals (amber for escrow/boarding, red for SOS/errors).
- **One Bold Moment**: The active corridor line draws itself across the Abuja vector topology in 700ms when an origin or landmark is resolved.
- **Accessible & Screen Reader Ready**: Strict WCAG AA/AAA contrast adherence, explicit `aria-label` tags, and full `prefers-reduced-motion` support.
- **Device Responsive**: Fluid breakpoints tested from 360px phones up to 1920px desktop displays.

---

## 2. Design Tokens & Theme Pairs

| Token Name | Light Mode | Dark Mode | Usage |
|---|---|---|---|
| `--bg-paper` | `#F7F6F2` | `#0C0F0D` | Base page canvas background |
| `--bg-surface` | `#FFFFFF` | `#151A17` | Cards, chat bubbles, drawers |
| `--text-ink` | `#111513` | `#EEF1EE` | Primary headlines and body copy |
| `--text-muted` | `#5C645F` | `#9AA59E` | Secondary captions, timestamps |
| `--border-subtle` | `#E3E1DA` | `#232B26` | Card borders, dividers |
| `--brand-primary` | `#0B6E4F` | `#34C98A` | Primary CTA buttons, active route |
| `--brand-soft` | `#E3F1EA` | `#12261D` | User message bubbles, active chips |
| `--signal-amber` | `#FFB020` | `#FFC247` | Escrow held badge, boarding code |
| `--danger-red` | `#C9302C` | `#EF5B54` | Emergency SOS and errors only |
| `--corridor-inactive` | `#D0CCC2` | `#2A342E` | Secondary Abuja corridor paths |

---

## 3. WCAG Contrast Audit Table

All text and background pairs meet or exceed WCAG 2.1 AA requirements (4.5:1 for body text, 3:1 for large text). Primary body text achieves WCAG AAA (> 7.0:1).

### Light Theme (#F7F6F2 Canvas)

| Foreground | Background | Contrast Ratio | WCAG Compliance | Context |
|---|---|---|---|---|
| Ink (`#111513`) | Paper (`#F7F6F2`) | 17.4:1 | AAA (Pass) | Primary body text on page canvas |
| Ink (`#111513`) | Surface (`#FFFFFF`) | 18.4:1 | AAA (Pass) | Primary card and chat bubble text |
| Muted (`#5C645F`) | Paper (`#F7F6F2`) | 5.64:1 | AA (Pass) | Captions, metadata, helper text |
| Muted (`#5C645F`) | Surface (`#FFFFFF`) | 5.96:1 | AA (Pass) | Card secondary labels |
| Brand (`#0B6E4F`) | Paper (`#F7F6F2`) | 5.61:1 | AA (Pass) | Text links and inline accents |
| White (`#FFFFFF`) | Brand (`#0B6E4F`) | 5.93:1 | AA (Pass) | Primary button labels |
| Ink (`#111513`) | Amber (`#FFB020`) | 10.1:1 | AAA (Pass) | Escrow and OTP boarding codes |
| White (`#FFFFFF`) | Danger (`#C9302C`) | 6.14:1 | AA (Pass) | Emergency SOS button text |

### Dark Theme (#0C0F0D Canvas)

| Foreground | Background | Contrast Ratio | WCAG Compliance | Context |
|---|---|---|---|---|
| Ink (`#EEF1EE`) | Paper (`#0C0F0D`) | 17.0:1 | AAA (Pass) | Primary body text on page canvas |
| Ink (`#EEF1EE`) | Surface (`#151A17`) | 15.6:1 | AAA (Pass) | Primary card and chat bubble text |
| Muted (`#9AA59E`) | Paper (`#0C0F0D`) | 7.60:1 | AAA (Pass) | Captions, metadata, helper text |
| Muted (`#9AA59E`) | Surface (`#151A17`) | 6.96:1 | AA (Pass) | Card secondary labels |
| Dark Ink (`#0C0F0D`) | Brand (`#34C98A`) | 9.49:1 | AAA (Pass) | Primary button labels |
| Dark Ink (`#0C0F0D`) | Amber (`#FFC247`) | 11.9:1 | AAA (Pass) | Escrow and OTP boarding codes |
| Dark Ink (`#0C0F0D`) | Danger (`#EF5B54`) | 5.60:1 | AA (Pass) | Emergency SOS button text |

---

## 4. Typography Hierarchy

- **Headings**: Bricolage Grotesque, bold weights (700, 800), tight letter spacing (`-0.025em`).
- **Body**: Instrument Sans, 16px minimum base size, 1.5 line height for relaxed reading.
- **Numerals**: JetBrains Mono, tabular numerals with hairline station frame (`.station-numeral`). Strictly used for naira fares, vehicle license plates, OTP codes, and departure countdowns.

---

## 5. Signature Components

1. **`CorridorNode`**: Custom SVG node component with concentric geometry reused across the system as the pickup location pin, active stepper node, live pod marker, and spinning loading indicator.
2. **`Wordmark`**: "Al(o)ng" logo embedding the `CorridorNode` directly into the counter of the letter 'o'.
3. **`RouteLine`**: SVG polyline animating along corridor coordinates in 700ms using `stroke-dashoffset`.
4. **`DepartureNumeral`**: High-contrast tabular monospace numeral with a 1px border resembling rail station arrival and departure boards.
5. **`TransitStrip`**: Horizontal single-row strip representing all 6 active Abuja commuter corridors and fares, replacing bulky generic card grids.
