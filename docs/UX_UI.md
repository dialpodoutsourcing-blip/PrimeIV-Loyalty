# UX, Accessibility, and Brand Direction

## Experience direction

The supplied Prime IV Hydration & Wellness logo and card concept are the visual source. The product should feel clean, clinical, calm, and rewarding. The droplet is the primary progress symbol.

The “scratch card” idea may become a gentle reveal after a verified visit, but rewards are deterministic—not chance-based—and key information must remain visible.

## Provisional design tokens

These are visual estimates and require confirmation from official brand assets.

| Token | Estimate | Use |
|---|---|---|
| `brand-primary` | `#075BA8` | Logo blue, headings, primary controls |
| `brand-bright` | `#35A8D5` | Completed progress and accents |
| `brand-deep` | `#064E8C` | High emphasis and hover states |
| `surface-page` | `#F3F9FC` | Cool pale background |
| `accent-pink` | `#F5B8DA` | Sparse separators/decoration |
| `text-primary` | `#253746` | Body text |
| `text-muted` | `#5F6870` | Secondary labels |
| `surface-card` | `#FFFFFF` | Cards and dialogs |

Use a legible sans-serif pending brand confirmation. Obtain an official SVG/transparent logo and never redraw it from the screenshot.

## Guest UI: mobile first

Baseline width is 360 px, enhanced for tablet and desktop. Suggested order:

1. Compact brand header and account access.
2. Greeting and next-reward summary.
3. Five-milestone card with completed/current/upcoming states.
4. Available reward callout.
5. Member QR/code action.
6. Recent activity and terms.

Touch targets should be at least 44 × 44 CSS pixels. Avoid page-level horizontal overflow.

## Staff UI: desktop only

Target 1280 px and support no narrower than 1024 px. Use a persistent search/scan area, guest identity and program state, clear visit/redeem actions, an activity timeline, confirmation dialogs, and keyboard-friendly navigation. At narrow widths, show a desktop-required message instead of compressing high-risk controls.

## Progress states

- **Completed:** filled blue mark plus textual status.
- **Current/next:** strong outline and “Next visit” label.
- **Upcoming:** quiet/dashed outline and threshold.
- **Available:** prominent reward card with terms.
- **Redeemed/expired:** subdued but readable with status and date.

Never communicate state by color alone.

## Accessibility

- Target WCAG 2.2 AA, keyboard operation, visible focus, landmarks, and logical headings.
- Provide accessible names for milestones/icons and live announcements for results.
- Meet 4.5:1 normal-text and 3:1 large-text/UI contrast.
- Honor `prefers-reduced-motion` and provide a no-motion reveal equivalent.
- Keep essential instructions out of images.

Preferred copy is direct: “3 of 5 visits complete,” “Ask a staff member to redeem,” and “Visit already recorded—no additional punch was added.”

