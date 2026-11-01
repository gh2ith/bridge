# Bridgeway — latest work handover

Updated: 31 October 2026 (Asia/Amman).

## Current state

The latest implementation was committed and pushed to https://github.com/gh2ith/bridge on branch `main`.

- Commit: `0699438c79726e6d264df54f9e3e121386dbd677`
- Commit message: `Update portal workflows, dashboards, and local persistence`
- Scope: 79 files changed, including portal workflows, shared presentation, dashboards, account handling, and validation scripts.
- The working tree was clean when this handover was started. This handover is a new local file and has not been committed or pushed.
- Remote `bridge` points to `https://github.com/gh2ith/bridge.git`; local `main` tracks `bridge/main`.
- Remote `origin` still points to `https://github.com/gh2ith/Bridgeway-frontend.git`. Use `git push bridge main` explicitly when targeting the new repository.
- The previous push verified that the remote `main` commit matched the local commit. Deployment to the new repository's GitHub Pages site was not verified.

Workspace: `C:\Users\user\Downloads\Bridgeway-frontend-reference`.

## Latest implementation areas

### Weekly tasks, submissions, and verified hours

- Companies create weekly tasks; students submit descriptions, HTTP(S) links, and/or PDFs. Company task resources and student deliverables are separate browser-local attachments.
- Submission versions retain text, links, PDF references, company feedback, and revision requests. PDFs are validated and limited to 1 MB each, subject to browser storage quota.
- The company must review every active task as Completed before ending and submitting its week. Supervisor verification checks the same requirement.
- Submitted and verified weeks lock task changes and submissions. A supervisor-requested revision reopens task work.
- Training is eight weeks × 15 hours = 120 hours. Company submission records reported hours; supervisor approval credits verified hours once. Dates and task completion never grant verified hours automatically.
- Existing plans migrate to the fixed allocation while retaining original values in `legacyHours`; archives and issued certificates remain intact.

Primary files: `shared/js/weekly-tasks.js`, `shared/css/weekly-tasks.css`, `shared/js/training-hours.js`, `pages/company-dashboard/weekly-training.css`, and `shared/js/workspace-cycle.js`.

### Evaluation handoff and completion

- The company submits the final evaluation after the eight reports and 120 hours are verified.
- The assigned supervisor reads company ratings and adds a separate qualitative academic assessment. Supervisors do not edit company ratings or score company objectives.
- The college reviews both evaluations and the completion checklist, confirms requirements, and issues the existing blue-and-silver Bridgeway certificate.
- Completion requires all active tasks completed, eight verified reports, 120 verified hours, company evaluation, academic assessment meeting requirements, and explicit college confirmation.
- Academic assessment is tied to the placement and company evaluation version. Replacing either requires a fresh handoff.

Primary files: `shared/js/internship-journey.js`, `shared/css/internship-journey.css`, `pages/company-dashboard/evaluation-gate.js`, and `pages/admin-dashboard/placements.js` / `placements.css`.

### Persistence and account boundaries

- Workspace records now survive reloads through localStorage on the same browser and origin. Existing session records migrate without overwriting newer local records.
- Safe views refresh when another tab changes records; open drafts offer to load newer changes before further saving. Failed storage writes must preserve or restore entered work.
- Account records, profiles, assignments, restrictions, preferences, and task PDFs are local records. CV handling retains filename and size only.
- Passwords are never persisted. Account security checks form requirements only; authentication and real credential changes are not connected.
- Account creation uses the shared editor: administrator-managed accounts, generated staff IDs, Active default, no creation-time status selector or optional office details.

Primary files: `shared/js/local-workspace.js`, `shared/js/account-security.js`, `shared/js/managed-account-editor.js`, and the account-settings/profile page files.

### Imports, applications, and dashboards

- College administrators can import CSV/XLSX student records with preview and validation. Limits: 500 students and 2 MB per source file. Creation is all-or-nothing and defaults to Active.
- Import headers accept readable variants; identity, contact, academic, duplicate, and supervisor checks still apply. SheetJS and its license are bundled under `shared/vendor/`.
- Students select profile skills, and applications retain a submission-time skills snapshot plus the listing questions and answers. No fabricated AI match percentages are displayed.
- Company acceptance closes the student's other pending applications. Academic supervisor assignment and placement activation remain separate actions.
- Progress monitors and next-action guidance use the current viewer's authorized records. Dashboard statistics distinguish reported and verified progress without inventing targets for missing plans.

Primary files: `shared/js/student-import.js`, `shared/js/dashboard-insights.js`, `shared/js/dashboard-overview.js`, `shared/js/portal-usability.js`, and their shared CSS files.

### Portal presentation and interaction

- Shared layout, polish, usability, motion, student sidebar, and supervisor presentation were updated.
- Navigation uses viewer-specific unseen-activity dots, separate from page statistics. The student name and account dropdown remain available.
- Shared sidebar behavior includes desktop hover/pinning and mobile menu handling. Form feedback and view-switch guards preserve unfinished work.
- The UX pass emphasizes clear primary actions, grouped fields, familiar navigation, accessible targets, contextual errors, restrained disclosure, and actual completion progress.

Primary files: `shared/js/portal-navigation.js`, `shared/js/portal-motion.js`, `shared/js/student-chrome.js`, `shared/css/portal-layout.css`, `shared/css/portal-polish.css`, `shared/css/portal-usability.css`, and `docs/portal-ux.md`.

## Workflow rules to preserve

Read `AGENTS.md` before changing behavior; it takes precedence over historical reports and screenshots.

- Companies decide applications for their own listings. Applying stays pending; supervisor assignment, interview scheduling, and report approval do not accept an application.
- Listing publication requires Platform Admin approval. Colleges can restrict discovery for their own students without editing or globally pausing a company's listing.
- Supervisors use one supervisor-wide report-visibility setting. Restriction hides report feedback/results/status details while preserving the plan, verification, and verified totals.
- Support routing is student → assigned supervisor, supervisor → college administrator, and company/college administrator → Platform Admin. Unassigned student tickets wait for assignment.
- Tickets start In progress; handler replies set Awaiting requester; requester replies return In progress. Only the receiver resolves, after replying and a separate confirmation. Resolved conversations remain read-only.
- Keep production copy neutral. Do not reintroduce preview/beta/demo/sample branding, fabricated matching scores, or claims of server saves, uploads, external notifications, or organization-wide synchronization.
- Local frontend persistence is not backend authentication or shared organizational storage. Never store passwords.

## Validation evidence

Before the latest push, all 47 existing Node checks passed with zero failures:

```powershell
node --test tools/check-dashboard-insights.cjs tools/check-internship-journey.cjs tools/check-local-workspace.cjs tools/check-portal-usability.cjs tools/check-training-hours.cjs tools/check-weekly-tasks.cjs
```

Coverage includes role scoping, task version/revision history, locked weeks, completed-task submission gates, fixed verified hours, completion/evaluation handoff, persistence migration and rollback, import header handling, and viewer-scoped next actions.

No new browser verification was performed during the push or handover work. Existing documentation describes browser coverage; do not treat that as a fresh browser test result. The pre-push scan found no matching private-key or common GitHub/OpenAI token patterns in the scanned project content; this was a limited pattern check.

## Running and continuing

This is a static HTML/CSS/JavaScript project with no framework build step or root `package.json`.

```powershell
Set-Location 'C:\Users\user\Downloads\Bridgeway-frontend-reference'
python -m http.server 8080 --bind 127.0.0.1
```

Open `http://127.0.0.1:8080/`. Use the same origin across portal tabs when testing persisted records. Read `docs/workspace-cycle.md` for workflow detail and `docs/portal-ux.md` for design decisions.

No additional implementation request remained after the push. Useful follow-up checks, when requested:

1. Walk through company task creation → student submission/revision → company completion → weekly submission → supervisor verification → company evaluation → academic assessment → college certificate issuance.
2. Verify reloads, cross-tab draft handling, PDF downloads, CSV/XLSX error recovery, mobile navigation, dark mode, and keyboard behavior.
3. Inspect `.github/workflows/deploy-pages.yml` and repository Pages settings before claiming the new repository is deployed. README links still reference the older repository's live site.
4. Commit and push this handover if repository publication is requested. The handover itself has not changed application code.
