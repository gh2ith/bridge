# Local cohort check

Added the requested generated cohort in the Opera workspace at `http://127.0.0.1:8080`: 120 students, five additional academic supervisors, three training listings, and corresponding placed application/training snapshots. Existing student and placement records were preserved. Each host company received 40 active placements. College 1 now has 124 students; the original student in College 2 remains separate.

The one-time loader is ignored development tooling at `output/add-local-cohort.html`, with no link or extra controls in the production portal. A repeat load is blocked by its batch marker. No passwords, CV contents, PDFs, or external notifications were generated.

The browser-local manifest key is `bridgeway:visual-cohort:2026-11-01-cohort-v1`; it lists all added IDs. The original model, cycle, account, and assignment values are backed up under `bridgeway:cohort-backup:2026-11-01-cohort-v1`. These are browser-local records, not backend accounts or shared organization data.

Partner-company totals now use placement history, scoped to the college, and separate active, completed, and ended placements. Previously, completed students were excluded by the profile-stage check. Verified college totals after loading: Tech Corp 40 active and 1 completed; Nexus 40 active and 1 completed; Aspire 40 active and 0 completed. Pending applicants are not counted as active placements.

Completion review and academic-assessment directories now render one student page at a time, with Previous / Page n/total / Next controls. The college directory shows 13 pages. Changing directory pages preserves the selected detail and entered assessment, while a search restarts paging. Browser checks confirmed only the current page renders and the selected review text remains intact. All 60 workflow and presentation-data tests passed.
