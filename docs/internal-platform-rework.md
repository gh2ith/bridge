# Internal platform rework

1 November 2026 · Local workspace changes

## Scope

Reworked Bridgeway's internal platform across all five roles. The homepage and sign-in were excluded from this pass. SHA-256 checks confirm their HTML, CSS, and JavaScript files are unchanged from the start of the internal rework. Existing uncommitted workflow changes were preserved; nothing was committed, pushed, or deployed.

The implementation uses the installed Better Interface, Superfuture Design Review, UI Designer, UX Writer, Interaction Designer, UI Manager, and Anti-AI-Slop guidance. Existing Bridgeway branding and `AGENTS.md` take precedence over generic design preferences. The Bento Brand Board skill does not apply to operational application screens.

## What changed

| Area | Result |
| --- | --- |
| Student profile | Identity and CV column beside editable details; personal fields precede CV selection on phones; academic and security records remain distinct |
| Company profile | Visible page heading, organization reference column, semantic Organization and Location/contact fieldsets, separate account security |
| Account settings | Account reference beside security and preference sections; consistent password controls and readable preference rows |
| Internship creation/editing | Persistent desktop step rail; compact phone steps; clearer field grouping, workplace selection, review summary, and actions |
| Listings and moderation | Shared listing surfaces, search/filter spacing, readable record tables, and wider detail drawers |
| Applications and interviews | Clear applicant identity, separate interview actions and hiring decisions, consistent dialog fields and action targets |
| Directories and partnerships | Shared table headers, row spacing, search controls, state labels, and action hierarchy |
| Placements | Responsive summaries, accessible locally scrolling records table, grouped detail facts and actions |
| Training and tasks | Separate week, objective, task, and report areas; responsive weekly detail; readable evidence and submission history |
| Evaluations and completion | Consistent assessment and completion surfaces; preserve company-authored ratings, academic assessment boundaries, eligibility gates, and original certificate artwork |
| Support | Compact page title, inbox composition, ticket detail column, readable messages, and a distinct reply area |
| Dialogs | Consistent dimensions and fields, scrollable account field groups, visible footer actions, smaller mobile headings |
| Empty/error states | Consistent quiet surfaces, contextual validation, retained field values and recovery controls |

The shared finish is in `shared/css/internal-platform.css`, loaded only by internal pages. The presentation composition script moves existing nodes and preserves their controls, handlers, values, and identifiers. It does not replace the workflow model.

## Interaction fixes found during verification

- Internal sidebar navigation now checks unfinished forms before switching views. Keep editing preserves the entered values; restoring the original values allows navigation without a false warning.
- Moving CV selection out of the profile form establishes the initial draft baseline once. CV metadata continues to save through the existing local handler; viewport changes do not reset the profile draft.
- Support replies retain their original character counter instead of adding a duplicate.
- Required markers in wrapped labels sit beside the field name rather than below the text area.
- The student identity label says College record instead of implying an SIS integration.

No accounts, applications, interviews, reports, evaluations, or tickets were submitted during verification. An internship wizard draft and a temporary profile-name edit were used for recovery checks and discarded/restored without saving.

## Verification

| Check | Observed result |
| --- | --- |
| Existing workflow suite | 47 passed, 0 failed |
| JavaScript syntax | Changed implementation files passed `node --check` |
| Git whitespace | `git diff --check` passed; existing line-ending conversion notices remain informational |
| Desktop | All 37 workspace tabs opened and selected the requested active panel at 1440px |
| Phone | All 37 tabs plus company profile, settings, and internship editor checked at 390px; 40 views with no horizontal page overflow |
| Small screen | Profiles, settings, internship editor, training, placements, completion, and support checked at 320px; no horizontal page overflow |
| Internship wizard | Required-field validation, entering details, adding a skill, review, returning to edit, Keep editing, and discarding the QA draft worked; no publication |
| Profile | Responsive node order, independent CV selection control, clean initial draft state, and Keep editing verified; QA name restored |
| Weekly training | Selected submitted week remained read-only with the report pending supervisor review |
| Evaluation | Company form remained locked before eight verified weeks/120 hours; completed-placement company evaluation remained read-only to the supervisor |
| Shared account creation | Expected identity/contact/academic/access fields present; no creation status selector; footer actions measured 44px on mobile; cancelled without entering credentials |
| Interview | Scheduling dialog opened and fit the mobile viewport; Escape dismissed it; no request submitted |
| Support | Correct student conversation and reply controls; exactly one character counter and correctly positioned required marker; no reply sent |
| Runtime | No application console errors observed in the final inspected profile session |
| Exclusions | All six homepage/sign-in source hashes unchanged during this pass |

Workflow command:

```text
node --test tools/check-weekly-tasks.cjs tools/check-internship-journey.cjs tools/check-local-workspace.cjs tools/check-training-hours.cjs tools/check-portal-usability.cjs tools/check-dashboard-insights.cjs
```

Viewport evidence, route inventories, and screenshots are saved in `output/internal-rework/`.

## Contrast measurements

Computed colors from the rendered company-profile form:

| Pair | Light | Dark | Applicable minimum |
| --- | ---: | ---: | ---: |
| Page title | 14.35:1 | 16.52:1 | 3:1 |
| Field label | 15.53:1 | 14.77:1 | 4.5:1 |
| Supporting copy | 7.81:1 | 9.71:1 | 4.5:1 |
| Input boundary | 5.45:1 | 8.18:1 | 3:1 |
| Primary action text | 5.84:1 | 5.17:1 | 4.5:1 |

These are targeted measurements, not an element-by-element WCAG certification. A broader exploratory text scan excluded gradients, opacity transitions, and unsupported color formats; its limited results are retained separately and are not presented as complete coverage. Screen-reader testing, OS high-contrast mode, and every possible user data combination were not manually exercised.

## Final visual review

UI Manager verdict: **ACCEPT within the tested scope.** Primary tasks, semantic fields, 44px actions, responsive composition, and recovery behavior were checked. Reduced-motion and forced-colors overrides are included. No new motion dependency was introduced.

Anti-AI-Slop checks:

- Information panels use fill and spacing; borders remain for fields, selected items, tables, and interactive records.
- New/updated copy avoids dash punctuation. An existing edit-page browser title was corrected.
- Shared actions use consistent padding and target dimensions, with explicit compact exceptions for week selectors.
- Decorative icon tiles were removed from the changed task/dialog areas. Identity initials and existing brand artwork were retained.
- No new status-dot chips were added. Sidebar activity dots remain as explicitly required by `AGENTS.md`; chart keys retain their informational meaning.

The new shared CSS and presentation script produced **0 P0 / 0 P1 / 0 P2** in their source scans. The profile/settings/editor scan initially reported four P0 and four P2 items: three embedded brand-logo gradient stops, one edit-page title dash, three uses of the established Inter font, and the proper company name. The title dash was fixed and the editor script re-scan returned zero findings. The remaining logo/font/company-name findings are intentional brand/proper-name exceptions, not unresolved UI defects. The static counts are scoped to these scanned files, not the entire historical repository.

The bundled rendered-audit runner targets macOS Chrome. On this Windows workspace, verification used the supported connected browser for screenshots, computed styles, contrast, dimensions, viewport reflow, and interactions. No claim is made that the macOS headless runner executed.

## Review artifacts

- `output/internal-rework/student-profile-desktop.png`
- `output/internal-rework/student-profile-mobile.png`
- `output/internal-rework/company-profile-desktop.png`
- `output/internal-rework/company-profile-dark.png`
- `output/internal-rework/account-settings-desktop.png`
- `output/internal-rework/internship-editor-desktop.png`
- `output/internal-rework/internship-editor-mobile.png`
- `output/internal-rework/company-applications-desktop.png`
- `output/internal-rework/weekly-training-desktop.png`
- `output/internal-rework/academic-assessment-desktop.png`
- `output/internal-rework/support-conversation-desktop.png`
- `output/internal-rework/account-editor-mobile.png`
