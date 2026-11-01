# Bridgeway interface craft review

1 November 2026 · local implementation

## Scope and coverage

Applied the five requested Figma skills to the existing HTML/CSS/JavaScript project. Installed the eleven additional skills from the supplied ZIP without running their bundled scripts. Existing uncommitted workflow changes were retained.

This is a shared interface refinement, not a replacement of Bridgeway's workflows or a full accessibility certification. Full-mode review is bounded to dashboard entry views and the shared account creation/navigation controls. Other linked pages received shared styles and a narrow-width smoke check; every workflow and hidden state was not manually audited.

| Domain | Evidence inspected | Result |
| --- | --- | --- |
| Accessibility | Runtime mobile navigation, Escape dismissal, account form labels and input sizes; computed dark-mode text colors | Focus treatment, muted text, field boundaries, and mobile controls improved |
| Layout | Five role entry views, desktop metric grid, mobile charts, page scroll widths | Compact metrics; charts stack; mobile tooltip overflow fixed |
| Writing | Homepage action labels and metadata, login metadata, student metadata | Specific action labels; unsupported cloud/authentication/one-click implications removed from these descriptions |
| Typography | Computed page title, section heading, and metric styles | Separate page, section, label, and numerical hierarchy |
| UI polish | Existing card styles, chart motion, button feedback, reduced-motion rules | Shared radii; stable data; brief interruptible feedback |

## Findings and implementation

| Priority | Location | Before | Applied change | Reason |
| --- | --- | --- | --- | --- |
| Important | `shared/css/dashboard-overview.css` and rendered staff dashboards | Page titles at 22px, medium weight; section headings and labels compete | Shared craft styles give page titles a responsive 25–32px size and 600 weight | Establish a clear reading order |
| Important | College overview metric grid | Six metrics occupy two desktop rows | Six columns at desktop; three at intermediate widths; two on phones | Bring training context closer to the overview |
| Important | `shared/css/dashboard-insights.css` and mobile college dashboard | Analytics retain two/three columns on narrow screens | One column for the top widgets below 900px, one column for remaining widgets below 600px | Keep charts and text readable |
| Important | Mobile weekly chart tooltip | Hidden tooltip expanded the page to 440px at a 434px viewport | Anchor the tooltip to the plot and constrain its width | Prevent horizontal page scroll |
| Important | `shared/js/portal-motion.js` | Numbers count for 1650ms; widget entrances stagger with 780ms duration | Remove counter overlays and chart entrances; replace panel reveal with a 160ms opacity transition | Recorded values should be immediately readable |
| Important | Shared portal controls | Muted token `#94a3b8`; controls inherit inconsistent focus treatment | Light-mode muted token `#5e6d83`; 3px focus ring; stronger field boundaries; mobile inputs at 16px | Improve legibility and keyboard recognition |
| Polish | Homepage and metadata | Mixed label capitalization; cloud-based and one-click implications | Sentence-case action labels; accurate feature descriptions | Explain the actions and current scope clearly |

## Motion opportunities and rejected candidates

| Candidate | Purpose | Frequency | Decision |
| --- | --- | --- | --- |
| Primary action press feedback | Feedback | Tens per day | 160ms interruptible scale to .96, only without reduced-motion preference |
| Recorded metric counters | Decoration | Every dashboard visit/update | Removed: users need to read actual totals immediately |
| Sequential chart entrances | Decoration | Every view visit | Removed: functional data should stay still |
| Sidebar and account interactions | Spatial consistency | Frequent | Preserve existing handlers and keyboard paths; do not add new motion |
| Existing bridge animation and opportunity pause control | Explanation | Public homepage | Preserve the established brand interaction |

The animation skill was used as an opportunity filter. Implementation follows the user's explicit rework request and the Better Interface guidance.

## Considered but rejected

- Replacing Inter: the existing font is deliberate and shared across the application. Better Interface prioritizes the established styling system; hierarchy was the actual issue.
- Applying the Bento Brand Board poster layout to dashboards: this downloaded skill explicitly excludes application screens. Preserve the brand assets, rather than force a presentation grid into operational work.
- Adding approval steps, matching percentages, or numeric sidebar indicators: these conflict with `AGENTS.md`.
- Adding animation dependencies: CSS and the existing motion helper cover the useful feedback.

## Verification

- `node --test tools/check-weekly-tasks.cjs tools/check-internship-journey.cjs tools/check-local-workspace.cjs tools/check-training-hours.cjs tools/check-portal-usability.cjs tools/check-dashboard-insights.cjs`: **47 passed, 0 failed**.
- `node --check shared/js/portal-motion.js`: passed.
- `git diff --check`: passed (Git also printed existing line-ending conversion notices).
- Browser: five role dashboards and homepage checked at **1440px**; no horizontal page overflow or broken visible images in those entry views.
- Browser: all thirteen page entry URLs checked at **390px**; no horizontal page overflow. Compatibility entry URLs for student profile, student registration, and company candidates redirect into their current workspace views.
- Shared student-account creation opens by keyboard, retains the expected identity/contact/academic/access fields, omits a creation-time status selector, and uses 16px mobile inputs. Cancelled without creating a record or entering credentials.
- Mobile navigation opens; Escape closes it. The overview chart switches between Hours and Reports.
- Dark mode inspected, then restored to light mode. Measured title contrast: **16.52:1** (`#edf4ff` on `#0b1526`); widget supporting copy and neutral metric descriptions: **9.71:1** (`#bac9dd` on `#122036`). These are targeted text measurements, not a full element-by-element WCAG audit.
- Reduced-motion and forced-colors styles inspected in source. OS-level reduced-motion/high-contrast behavior was not manually exercised.
- Screenshots and viewport measurements are in `output/playwright/`. Some screenshot attempts timed out; successful desktop/mobile captures were retained. No deployment performed.

## Strengths and verdict

Bridgeway already has a recognizable blue identity, contextual status text, role-specific workspaces, and an account editor that preserves the administrative creation rules. The highest-leverage change was making operational information immediately readable through stronger hierarchy and stable data.

The inspected entry views are ready for review. Hidden workflow states and full assistive-technology coverage remain outside this focused design pass.

## Installed sources

The five Figma skills are stored under `C:/Users/user/.codex/skills/`, each with a `SOURCE.md` linking to its original page. Codex-compatible name/description metadata was added; the public instruction text was retained. They are available on the next turn.

The combined downloadable archive is `C:/Users/user/Downloads/Bridgeway-Design-Skills.zip` (five Figma skills plus eleven ZIP skills).
