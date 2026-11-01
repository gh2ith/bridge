# Progress monitor

The monitor now offers company groups and an individual student comparison list. Company groups display real student counts and expand one at a time; students without a host company remain accessible in their own group. Search and attention filters apply before grouping and pagination. A matching search opens the sole matching company automatically.

Pagination uses Previous, Page n/total, and Next. There is no page-size selector. Company lists and the students inside a company both have bounded pagination. Filters reset obsolete page positions; selecting another company retains its place until filters change.

The role-scoped student source, verified-hour calculation, task states, and training-detail dialog remain in place. Overview KPI tiles are hidden on the monitor. Mobile tables become labeled student rows, with the redundant host-company column omitted inside company groups.

Validation: 53 tests passed, including pagination over 1,003 students, grouping counts, matching by name/ID/company, organization identity separation, and page clamping. An isolated browser fixture confirmed bounded rendering and nested company pagination without writing live records. The real monitor was reviewed at desktop, 390px, and 320px widths, and the training detail action was checked.

## Third view: Relations

Added a separate Relations option beside the two existing views. Three linked columns expose host companies, academic supervisors, and the students sharing both assignments. Choosing a company narrows the supervisor choices; choosing a supervisor narrows the student list. Unassigned academic and host-company relationships remain visible. These are assignment relationships, with no changes to application decisions or completion gates.

Each level retains bounded pagination. Same-name supervisors at different colleges remain separate. Search also accepts supervisor names. Mobile uses labeled company/supervisor selectors with student links below, and restores focus after selection. Desktop connector paths follow the rendered nodes and update on resize.

Validation now totals 56 passing tests. The isolated 1,003-student fixture also checks supervisor and student pagination independently. Browser checks covered the company, supervisor, and college-admin roles; existing views; training dialogs; unassigned relationships; and widths of 390px and 320px.
