# Connected workspace

## Task submissions

Companies assign weekly tasks with a title, instructions, and optional due date. Students submit a description, HTTP(S) work link, and/or PDF. Company PDFs are task resources; student PDFs are deliverables. PDFs are validated and limited to 1 MB each in browser-local storage.

The task lifecycle is Assigned → Submitted → Changes requested → Resubmitted → Completed. Companies review pending submissions, give feedback, and request revisions or mark work completed. Revision requests require feedback. Versions retain their submitted text, links, PDF references, and review history. Submitted PDFs cannot be removed from their historical submissions. Ended placements are read-only. Overdue is a separate deadline indicator.

Task completion never verifies report hours or changes objective results. Weekly report visibility remains one supervisor-wide control, independent of task assignments and submissions.

## Applications and profile skills

Companies may add up to ten application questions when creating or editing listings. Students answer every question and may have multiple pending applications. Company acceptance closes their other pending applications, without automatically activating training. Academic supervisor assignment and college placement setup remain separate.

Students can save up to twenty profile skills. Application dialogs show skill tags and highlight exact overlaps with role requirements. These are not AI scores. Each application stores a snapshot of the skills, questions, and answers submitted; the company can read them in Student details.

Student navigation uses a sidebar, with unseen-activity dots instead of numeric counts. The header retains the student name and the profile/sign-out dropdown. On mobile the sidebar uses a keyboard-accessible menu with Escape dismissal and focus return.

## Evaluations and completion

1. The company records weekly reports and the assigned academic supervisor verifies hours or requests revisions.
2. After 120 verified hours, the company submits its final evaluation to the assigned academic supervisor.
3. The supervisor reads the company ratings without modifying them, records a separate qualitative academic assessment, and forwards both to the college administrator. This is separate from company objective results and weekly report approval.
4. College Completion review checks the placement, all eight verified reports, 120 verified hours, completed active tasks, company evaluation, and the forwarded academic assessment. Every academic criterion must meet requirements. The administrator explicitly confirms the college requirements before a separate issuance confirmation.
5. Approval ends the active placement as Completed and creates the blue-and-silver Bridgeway certificate, available to the student in My training and Training record. The PDF is generated locally and can be downloaded and printed. The existing verification card remains a training summary.

Academic assessments are tied to both the placement and the company evaluation version. A replaced company evaluation or new placement requires a fresh academic assessment. Certificates snapshot the approved student, company, dates, hours, and issuing college.

## Student imports

College administrators can import CSV or XLSX from Manage Students. A downloadable CSV template defines the supported columns: name, studentId, email, phone, faculty, department, year, gpa, and optional supervisor. The import previews validation errors and rejects duplicate IDs/emails, missing essentials, invalid contacts, GPA/year errors, and unknown supervisors. Limits are 500 students and a 2 MB source file. Creation is all-or-nothing and defaults to Active; no passwords are persisted.

Excel parsing uses the locally bundled SheetJS CE 0.20.3 distribution in shared/vendor, with its Apache 2.0 license. Only selected student fields are imported; spreadsheet formulas are not executed.

## Progress monitoring

Company, academic supervisor, and college administrator portals have a Progress monitor scoped to their students. Filters cover overdue tasks, missing submissions, work awaiting company review, reports awaiting verification, and verified hours below planned report hours. A student record opens the existing training view with tasks and submissions.

## Local storage boundaries

The workspace remains a browser-local frontend. Records now use localStorage and survive reloads and browser restarts on the same origin. Existing session records migrate once without overwriting newer local records. Open tabs reload safe views after changes; a page with a draft offers to load the latest changes before further saves. These actions do not create backend accounts, transmit evaluations or notifications, upload files to a server, or synchronize an organization. CV handling still retains filename and size only. Actual task PDFs are retained locally for downloads, subject to browser quota.

The workflow authority is AGENTS.md. Historical screenshots and documents may show superseded behavior.

## Verification

Run node --test tools/check-weekly-tasks.cjs tools/check-internship-journey.cjs tools/check-local-workspace.cjs. Browser checks cover submission/revision history, CSV/XLSX validation and imports, skills in applications, academic handoff, college approval, student certificate download, PDF rendering, and desktop/mobile sidebar behavior.

Student and company profile edits save locally. Notification preferences save per role. College listing restrictions persist and control student discovery for that college. Account passwords are never saved; sign-in is local role navigation, and password changes remain validation-only until authentication is connected.

## Weekly hours

Training is eight weeks of 15 hours (120 total). The company opens Weekly training, selects a student and week, records feedback, and chooses **End week & submit report**. Submission records 15 reported hours but adds no verified hours. The assigned supervisor reviews the report and confirms **Approve report · 15 h**; the verified counter then increases once by 15. Revision requests add no hours; the company revises and resubmits the same report. Dates and task completion do not automatically verify hours.

Existing current plans migrate to the 15-hour allocation, retaining original values in `legacyHours`. Archived plans and issued certificates remain unchanged. All actions persist only in this browser and origin; this is not backend synchronization.
