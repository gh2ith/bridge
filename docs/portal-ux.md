# Portal UX pass

Scope: student, company, academic supervisor, college administrator, and platform administrator workspaces; profiles, settings, listing creation, account dialogs, imports, support, training, and completion review. Home and Login are excluded.

## Design decisions

| Principles | Applied behavior |
| --- | --- |
| Aesthetic-Usability Effect, Similarity | Existing Bridgeway typography, colors, and surfaces remain consistent; controls share focus, pressed, disabled, and touch behavior. |
| Hick's Law, Miller's Law, Proximity, Common Region | Related fields and reference content stay together. Secondary destructive actions use a More disclosure. Duplicate filter recovery actions are avoided. |
| Fitts's Law | Portal controls have at least 44-pixel target heights; small icon, skill-removal, and gallery controls also receive wider targets. |
| Jakob's Law, Recognition over Recall | Shared navigation, visible labels, familiar search fields, contextual Edit actions, and explicit student identity reduce recall. Older applicant bookmarks open the current shared workflow. |
| Doherty Threshold, Feedback Loops | View changes use a short fade without shifting page geometry. Filters show result counts and recovery. Form summaries link directly to invalid fields while retaining entered values. Import validation reports that it is reading the file. |
| Visual Hierarchy, Von Restorff Effect, Serial Position Effect | The next actionable task appears before supporting records, with a clear action. Its counts come from the current viewer's actual workspace scope. |
| Progressive Disclosure, Tesler's Law, Occam's Razor | Company evaluation reference is separate from academic input. Advanced row actions are disclosed on demand. Existing workflow controls and validation are reused rather than duplicated. |
| Peak-End Rule, Goal-Gradient Effect | Evaluation handoff stages and the completion checklist show actual progress toward a downloadable certificate. Missing requirements explain why approval remains unavailable. |
| Postel's Law | Import headers accept casing, spacing, and readable equivalents such as Full name and Student ID. Actual identity, contact, GPA, duplicate-account, and ownership constraints still apply. |

These principles guide choices together; they do not introduce additional hiring stages, fabricated matches, ratings, backend saves, or notifications.

## Workflow protections

- Changing weeks or students checks for unfinished task, report-review, and academic-assessment work before replacing it.
- Adding a task PDF preserves the student's draft description and work link.
- Company evaluations remain read-only to academic supervisors; academic assessment is a separate record.
- Completion readiness derives from verified reports/hours, tasks, and both evaluations. Approval permissions and certificate issuance remain unchanged.
- Sidebar activity remains viewer-specific dots, separate from page statistics.
- Supervisor page statistics are recomputed from assigned students' report records.
- Passwords are never copied into summaries, logs, or browser storage.

## Verification

Model checks: node --test tools/check-weekly-tasks.cjs tools/check-internship-journey.cjs tools/check-local-workspace.cjs tools/check-portal-usability.cjs

Browser coverage includes workspace navigation at laptop, tablet, and phone widths; dynamic form errors; directory filtering; account dialogs; company evaluation disclosure; draft retention across PDF attachment and view switches; completion stages; keyboard navigation; and dark mode. Home and Login file hashes are compared with their pre-pass values.
