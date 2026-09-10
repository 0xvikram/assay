# Assay — brand and design rules

One look everywhere: **marble and cobalt**. Classical stone, engraved in blue ink, on a pale
marble ground. Old institutions of trust — the temple, the scales, the ledger, the seal —
standing behind a very new thing: agents paying agents. Every page follows these rules; a new
page should need no new colours, fonts or components.

## 1. Palette

| Token | Value | Use |
|---|---|---|
| `--ground` | `#EEF3FA` | the page. Always with the dot grid (`.dots`). |
| `--ground-2` | `#E4ECF8` | a quieter band between sections |
| `--paper` | `#FAFCFF` | cards, the ledger page, inputs |
| `--ink` | `#0B1A5C` | headings, body text, icons — the only text colour at full strength |
| `--ink-2` / `--ink-3` / `--ink-4` | `#26377A` / `#4F5E97` / `#7C89B5` | body, labels, metadata — in that order of importance |
| `--cobalt` | `#1F3FC4` | the one action colour: primary buttons, links on hover, the seal, focus rings |
| `--cobalt-deep` | `#0E1F7A` | the footer band, pressed states |
| `--line` / `--line-2` | navy at 12% / 22% | hairlines and outlines |
| `--mint` `--gold` `--coral` | `#13875A` `#A86E06` `#CF3B29` | **only** the three verdicts — VERIFIED, UNPROVEN, WASH_REPUTATION_DETECTED — and PAID / REFUSED on the ledger. Never decoration. |

No other hues. No gradients except ground→paper fades and the duotone itself. No dark mode:
the brand is a lit marble hall.

## 2. Type

- **Newsreader** (serif, roman 400) for every heading. Each heading has **one** italic turn —
  the phrase where the sentence changes direction: *before*, *a farm.*, *until they agree on what
  the number is.* Never two italic phrases; never italic body text.
- **Archivo** (sans) for body and UI. Light (300) for leads, 400 body, 500–600 buttons.
- **IBM Plex Mono** for everything machine: section numbers, labels, chain refs, hashes,
  prices, JSON. Eyebrows are mono, uppercase, tracked `0.2em`: `01 · THE PROBLEM`.
- Scale: hero `clamp(44px, 6.4vw, 92px)`, section heading `clamp(32px, 3.8vw, 54px)`,
  lead `clamp(15px, 1.2vw, 18px)`, body 14–15px, mono metadata 11–12px.

## 3. Imagery

- Photography is **public-domain classical sculpture and architecture** (The Met Open Access,
  CC0): heads, eyes, columns, temples. Nothing else — no people, no stock, no 3D renders.
- Every photograph is converted to the **navy duotone** before it ships (shadows `#0B1A5C`,
  highlights `#F2F6FC`) by `scripts/brand-images.mjs`, so no image ever brings its own colour.
- Images never sit in boxes. They **dissolve into the ground** through soft masks, and text never
  sits on top of the busy part of an image.
- Drawn objects — the column, the scales, the seal, the marble tablets — are SVG line-work in the
  same navy, so they read as engravings next to the photographs.
- Objects carry meaning, not ornament: the **temple** is the institution, the **tablet** is a
  verdict carved in stone, the **scales** are the price against the verdict, the **ledger and
  seal** are the receipt, the **eye** is being seen before you are paid.

## 4. Components

- **Card** (`.glass`): frosted paper, 22px radius, a white inner edge and a long soft navy shadow.
  The console, the composition panel, the ledger rows and the step-up all use it.
- **Tablet** (`.tablet`): marble slab with a domed top standing on a plinth. Only for the three
  verdicts.
- **Buttons**: primary is a cobalt pill with white text and ↗; secondary is a navy hairline pill
  on frosted paper. Never square buttons; never more than one primary per view.
- **Inputs**: paper pills with a navy hairline; focus is a cobalt ring.
- **Chips**: mono, hairline pills; the pressed one turns solid navy.
- **Verdict badge**: a coloured dot with a soft halo, then the verdict in mono.
- **Rail tile**: hairline card, network name in sans, price in mono.

## 5. Layout and motion

- 1280px max width, gutters `clamp(20px, 4vw, 48px)`; sections breathe
  (`clamp(72px, 9vw, 136px)` vertical).
- Sections are numbered `01 …` in the eyebrow and alternate text-left / art-right.
- Motion is slow and physical: a fade-up on arrival (480ms), the scales settling, the live dot
  breathing. Everything respects `prefers-reduced-motion`.
- Phones get one column; art moves above the text it belongs to and never under it.

## 6. Voice

Short, declarative, a little severe. "Trust needs proof." "Refuses to guess." Numbers are
exact and sourced. The product never says *AI-powered*, *revolutionary* or *seamless*.

## 7. Image sources

All photographs are from The Metropolitan Museum of Art's Open Access collection (CC0), converted
with `node scripts/brand-images.mjs` (crop, grayscale, navy duotone; `--key` lifts a studio
backdrop to transparency, measured row by row; `--levels` stretches the sculpture's own tones).

| File | Object | Met ID |
|---|---|---|
| `public/brand/hero-head.webp` | Marble head of a youth, Polykleitan type, ca. 41–54 CE | 247994 |
| `public/brand/eye.webp` | Marble head of an athlete, ca. 138–192 CE (crop) | 248579 |
| `public/brand/columns.webp` | James Robertson, Acropolis colonnade, probably the Propylaea, early 1850s | 814619 |
| `public/brand/temple.webp` | James Robertson, the Parthenon, west front, early 1850s | 814612 |

`public/brand/marble.svg` is procedural (SVG turbulence), and the column, scales and seal are drawn
in `app/components/Art.tsx`.
