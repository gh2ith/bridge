# Bridgeway product system

This is the final visual layer for every signed-in Bridgeway workspace. Public home and sign-in remain independent so their established layouts are not affected.

## Product rules

- Neutral canvas and white work surfaces carry most of the interface.
- Blue is reserved for navigation, selection, information, focus, and the primary action.
- Green communicates completion or a positive outcome.
- Amber communicates restricted, paused, pending, or revision-needed states.
- Red communicates rejection, removal, termination, or another adverse action.
- A section has one visually dominant action. Supporting actions are outlined or text actions.
- Non-interactive groups use spacing and surface contrast instead of ornamental borders or shadows.
- Tables and large generated lists page automatically when they exceed a single working set. Filtering always applies before paging.
- Controls use a 42 px desktop target and a 44 px mobile target.
- Motion is restrained, interruptible, and removed when reduced motion is requested.

## Implementation

- `shared/css/product-system.css` owns the final tokens and component finish.
- `shared/js/product-system.js` adds bounded paging to long dynamic tables and applicant lists.
- Each signed-in page loads both files after the legacy workspace files so the product contract wins the cascade.

## QA completed

- 11 signed-in routes checked in the live browser.
- College Admin, Company, Platform Admin, Student, and Supervisor checked at desktop and mobile widths.
- No horizontal overflow on the audited routes.
- Long student tables show 10 records with page navigation.
- The 41-record company applicant inbox shows 10 records with page navigation and preserves search behavior.
- Report visibility status and its confirmation use the same semantic intent.
- 78 automated checks pass.
- The final product layer reports 0 P0, 0 P1, and 0 P2 findings in the anti-slop static scan.
