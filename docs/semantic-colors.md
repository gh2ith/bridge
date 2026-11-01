# Functional color rules

The internal interface uses one semantic palette, shared by action controls, confirmation dialogs, visibility panels, and status badges. Brand blue remains the navigation and selection color. Informational cards retain neutral surfaces; a card does not become a warning merely because it contains an unfinished record.

| Meaning | Treatment | Examples |
| --- | --- | --- |
| Positive action or confirmed result | Green | Accept, approve, verify, resume, restore, resolve, make reports visible; verified/completed/active statuses |
| Caution or work awaiting attention | Amber | Pause, restrict, request revision; pending, in review, revision requested, restricted statuses |
| Destructive action or adverse result | Red | Delete, remove, reject, withdraw, discard; rejected, failed, overdue statuses |
| Navigation, editing, submission, ongoing activity | Brand blue or neutral | View, select, search, save, submit for review, in progress |
| No outcome or inactive context | Neutral | Draft, closed, no training plan, directory totals, cancel, close |

A restricted panel is amber because it describes the current access state. Its Make reports visible action is green because it restores access. The corresponding confirmation's icon and primary action also use green. Restrict view remains amber through its confirmation. Cancel remains neutral.

## Implementation

- `shared/js/portal-ux.js`: `actionTone` and `statusTone` provide the central intent vocabulary. The legacy component adapter assigns `data-action-tone` and `data-status-tone` without replacing elements or changing workflow handlers. Labels are reconsidered when dynamic content changes; Pause becoming Resume changes from amber to green.
- Navigation tabs and sidebar controls are excluded from action classification. Ordinary Save and Submit actions remain branded and do not imply approval or completed training.
- `shared/css/portal-ux.css`: shared light/dark semantic tokens, subtle secondary action/status surfaces, and solid confirmation/primary-action treatment. Explicit intent styles take precedence over legacy page-specific colors.
- `shared/css/portal-polish.css`: existing positive and pending token names alias the shared palette, including the report-visibility panel and verified roster progress.
- Text and icons remain alongside color so meaning does not depend on color alone. Focus, hover, and disabled behavior remain available.
- Public home/sign-in are excluded; their design is unchanged.

## Verification

`node --test tools/check-*.cjs`: 75 passing tests, including intent classification, pending-versus-completed meaning, and contrast read from the actual CSS tokens. All 11 internal pages pass the isolated DOM smoke checks. Ticket return navigation and student training disclosure/download checks pass.

Live checks cover all five role dashboards plus green, amber, and red confirmations in both themes. The actual supervisor restriction prompt was opened and cancelled; the user's report-visibility setting was preserved. Isolated confirmation fixtures have no connected workflow handlers. No console errors were observed in these checks.
