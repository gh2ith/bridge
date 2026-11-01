# College dashboard reference

Scope: college overview first. Other dashboards and public pages are unchanged. Existing account, listing, placement, training, and completion workflows remain authoritative.

## Reference direction

- [IBM Carbon dashboards](https://www.carbondesignsystem.com/building-blocks/data-visualization/dashboards): rank information, emphasize the most important value, keep chart layouts consistent, and remove distractions.
- [Shopify analytics](https://www.shopify.com/analytics): clear summary metrics lead to detailed reporting.
- [Atlassian navigation layout](https://atlassian.design/components/navigation-system/layout): maintain distinct navigation and content areas.

Bridgeway keeps its existing Inter typography, navy, blue action color, and semantic chart colors. Reference structures inform the hierarchy; no external assets or product claims were copied.

## Reusable page pattern

1. Heading and short purpose statement at the start. Account and notification controls sit opposite. One filled primary action, one quiet secondary action.
2. A unified summary surface. Active placements get the highest emphasis. Directory totals remain compact, actionable, and visually subordinate.
3. Training status and weekly activity form the primary chart row. Report distribution, student progress, and the report pipeline provide the next level of detail.
4. Explicit links open relevant detailed views. A final row offers monitoring, completion review, and partnerships.

Use 4/8/12/16/24/32 spacing, 48 page-top padding on desktop, 24 on phones, 12 surface corners, 8 control corners. Section spacing is 32, chart gaps 16, chart padding 24. Information surfaces have no decorative border or shadow. Interactive shortcuts retain a border and visible keyboard focus. Layout uses logical spacing and directional arrows support RTL.

The placement card follows the user's supplied navy reference: one large active-placement total, an inline briefcase at the top right, a subtle Bridgeway bridge at the bottom right, and a short action with a diagonal arrow. The coverage bar was removed at the user's request to match that simpler composition. Completed placement histories remain separate from the active total and are available in the card tooltip. Available listings count published listings from active companies for an active college, excluding that college's local restrictions. Partnership pause preserves current training.

The account and notification controls stay aligned to the top right. Extra top spacing applies only to the College overview introduction when that tab is active, not to the main container or account controls. Other tabs receive no extra heading padding.

## Implementation

- `shared/js/college-overview.js`: pure record summary, presentation composition, existing navigation handlers retained, live refresh.
- `shared/css/college-overview.css`: college-scoped reference tokens and responsive layouts.
- `shared/js/portal.js`: summaries use current cycle records and stable control identifiers rather than positional selectors.

Static department percentages and duplicated directory shortcuts were removed. Missing workspace-tools asset references were removed from this page; account and notification controls are retained in the new heading. Other pages are not migrated yet.

## Review and validation

- 16 focused tests passed: college scoping, latest placement state, publication and organization availability, local restrictions, paused partnerships, read-only summaries, role-scoped training totals, completion gates, and scroll-triggered chart motion.
- Live desktop review confirmed 120 active placements, 124 students, 131 accounts, 6 supervisors, 3 partners, and 7 available listings.
- Initial 390px review found no horizontal overflow. It caught a mobile grid overlap and wrapping action label; targeted fixes were applied.
- Final placement coverage graphic and expanded top padding were added after that review. Local browser access was subsequently disabled in Work settings, preventing the final render, shortcut, dropdown, dark-mode, and narrow-screen confirmation. Do not claim those final checks passed. The last temporary viewport was 1440 by 1000 and could not be reset after browser access was disabled.

## Final craft pass

Before: six oversized, equally prominent KPI cards; a bridge watermark; repeated directory shortcuts; static department percentages; outlined informational charts.

After: one ranked summary, an actual placement coverage graphic, accurate cycle totals, quiet chart surfaces, and targeted workflow links. Static scan of the new CSS and JS reports 0 P0, 0 P1, 0 P2. The five craft checks are satisfied in source: no decorative accent stripes, no dash punctuation in new visible copy, consistent button padding, no icons in tinted tiles, no status-chip dots. Chart legend keys and existing sidebar unseen-activity dots remain because they communicate data and follow AGENTS.md.

Remaining limitation: final browser confirmation is pending due to disabled local browser access.
