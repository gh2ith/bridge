// Explicit handlers keep HTML presentation-only and preserve native event semantics.
const previewStudent = window.BridgewayStudent.current();
if (previewStudent.stage === 'Not applied' || previewStudent.id === 'lina') {
  document.getElementById('studentApplicationsTable').replaceChildren();
  const cards = document.querySelectorAll('.bw-kpi-card');
  cards[1].querySelector('.bw-kpi-value').textContent = '0';
  cards[1].querySelector('.bw-kpi-desc').textContent = 'No applications yet';
  cards[2].querySelector('.bw-kpi-value').textContent = '0 / 8';
  cards[2].querySelector('.bw-kpi-desc').textContent = 'Training has not started';
  cards[3].querySelector('.bw-kpi-value').textContent = '0 h';
  document.getElementById('tabBadgeProgress').textContent = '0/8 Wks';
  document.getElementById('tab-progress').innerHTML = '<section class="student-preview-empty"><i class="bi bi-calendar2" aria-hidden="true"></i><h2>No training yet</h2><p>Your training record starts after company acceptance and college placement administration.</p><a href="#tab-opportunities" class="bw-tag-btn">Explore internships</a></section>';
}
const applicationRows = document.getElementById('studentApplicationsTable');
const applicationEmpty = document.createElement('section');
applicationEmpty.className = 'student-preview-empty';
applicationEmpty.innerHTML = '<i class="bi bi-send" aria-hidden="true"></i><h2>No applications yet</h2><p>Find an opportunity and select your CV to try your first application. </p><a href="#tab-opportunities" class="bw-tag-btn">Explore internships</a>';
applicationRows.closest('table').parentElement.after(applicationEmpty);
function refreshApplicationEmpty() {
  const empty = applicationRows.rows.length === 0;
  applicationEmpty.hidden = !empty;
  applicationRows.closest('table').parentElement.hidden = empty;
}
refreshApplicationEmpty();
new MutationObserver(refreshApplicationEmpty).observe(applicationRows, {childList:true});
function updateCvMatches() {
  const hasCv = !!window.BridgewayCV.read();
  document.querySelectorAll('[data-cv-score]').forEach(score => {
    score.hidden = true;
    score.parentElement.querySelector('.cv-upload-link').hidden = false;
  });
  const note=document.getElementById('cvMatchPreviewNote');
  if(note)note.hidden = true;
}
updateCvMatches();
window.addEventListener('pageshow', updateCvMatches);
// The confirmation reuses profile metadata; a replacement never reads document bytes.
const applicationCv = document.getElementById('applicationCvFile');
const applicationCvStatus = document.getElementById('applicationCvStatus');
function showApplicationCv() {
  const file = applicationCv.files[0] || window.BridgewayCV.read();
  applicationCvStatus.textContent = file ? `${file.name} · ${Math.ceil(file.size / 1024)} KB · Selected locally.` : 'No CV selected. Choose a CV to continue.';
}
showApplicationCv();
window.addEventListener('pageshow', showApplicationCv);
applicationCv.addEventListener('change', () => {
  const file = applicationCv.files[0];
  const valid = !file || (/\.(pdf|docx)$/i.test(file.name) && file.size > 0 && file.size <= 5 * 1024 * 1024);
  applicationCv.setAttribute('aria-invalid', String(!valid));
  if (!valid) { applicationCvStatus.textContent = 'Choose a non-empty PDF or DOCX up to 5 MB. This file cannot be used.'; return; }
  if (file) {
    const stored = window.BridgewayCV.set(file);
    showApplicationCv();
    if (!stored) applicationCvStatus.textContent += ' Session storage is unavailable; this selection lasts on this page only.';
    updateCvMatches();
  } else showApplicationCv();
});
(function () {
  document.querySelectorAll('[data-onclick="switchTab-tab-progress-1"]').forEach(element => {
    element.onclick = function(event) { window.switchTab('tab-progress'); };
  });
})();

applicationRows.addEventListener('click', event => {
    const button = event.target.closest('[data-withdraw-application]');
    if (!button) return;
    const cells = button.closest('tr').cells;
    window.openWithdrawModal(cells[1].textContent.trim(), cells[0].firstElementChild?.textContent.trim() || cells[0].textContent.trim());
});

// No placeholder meeting or manual-link entry: show only a record with a valid room link.
const meeting = window.BridgewayMeetings.records.find(item => item.student === previewStudent.id && item.company === previewStudent.company);
const meetingUrl = window.BridgewayMeetings.validUrl(meeting?.url);
if (meeting && meetingUrl) {
  document.getElementById('studentMeeting').hidden = false;
  document.getElementById('studentMeetingTitle').textContent = meeting.title;
  const company = window.BridgewayPartners.organizations.find(item => item.id === meeting.company);
  const date = new Date(`${meeting.date}+03:00`);
  const formatted = new Intl.DateTimeFormat('en-GB', {day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit',timeZone:'Asia/Amman'}).format(date);
  document.getElementById('studentMeetingDetails').textContent = `${company?.name || 'Host company'} · ${formatted} · Amman`;
  const join = document.getElementById('studentMeetingJoin');
  join.href = meetingUrl;
  join.hidden = false;
}


// Report filters and week shortcuts operate on the existing training record only.
(function () {
  const root = document.getElementById('tab-progress');
  if (!root) return;
  const reports = [...root.querySelectorAll('[data-report-status]')];
  const filters = [...root.querySelectorAll('[data-training-filter]')];
  const filterReports = status => {
    filters.forEach(button => button.setAttribute('aria-pressed', String(button.dataset.trainingFilter === status)));
    reports.forEach(report => { report.hidden = status !== 'all' && report.dataset.reportStatus !== status; });
    const count = reports.filter(report => !report.hidden).length;
    root.querySelector('#trainingReportCount').textContent = count + (count === 1 ? ' week' : ' weeks');
  };
  filters.forEach(button => button.addEventListener('click', () => filterReports(button.dataset.trainingFilter)));
  root.querySelectorAll('[data-training-week]').forEach(button => button.addEventListener('click', () => {
    filterReports('all');
    const report = document.getElementById('training-week-' + button.dataset.trainingWeek);
    report.open = true;
    report.querySelector('summary').focus({ preventScroll:true });
    report.scrollIntoView({ behavior:matchMedia('(prefers-reduced-motion: reduce)').matches ? 'instant' : 'smooth', block:'nearest' });
  }));
})();


// Public outlines only. Payment verification and lesson access are not connected.
(() => {
    'use strict';
    const catalog = [
    {
        "id": "cv",
        "category": "CV & applications",
        "title": "Build a stronger CV",
        "description": "Put your experience into words that matter. Create a clear, focused CV for your next opportunity.",
        "topics": [
            "Structure your CV",
            "Write stronger achievements",
            "Tailor it to a role"
        ],
        "modules": [
            "Choose a clear structure for your education, experience, and skills.",
            "Turn responsibilities and projects into specific, evidence-based achievements.",
            "Connect your experience to the requirements of a particular opportunity."
        ]
    },
    {
        "id": "portfolio",
        "category": "Projects & presentation",
        "title": "Create your portfolio",
        "description": "Give your projects the presentation they deserve. Show your process, decisions, and the work behind them.",
        "topics": [
            "Choose your best projects",
            "Tell the story behind your work",
            "Design your portfolio"
        ],
        "modules": [
            "Select work that demonstrates your skills and explains your contribution.",
            "Describe the problem, your process, key decisions, and what you learned.",
            "Bring your case studies together in a focused, easy-to-navigate presentation."
        ]
    },
    {
        "id": "linkedin",
        "category": "Networking & visibility",
        "title": "Grow on LinkedIn",
        "description": "Build a professional presence with purpose. Share useful ideas and start conversations that connect.",
        "topics": [
            "Strengthen your profile",
            "Create engaging posts",
            "Build meaningful connections"
        ],
        "modules": [
            "Write a clear headline and introduction that reflect your professional interests.",
            "Plan useful posts that share your learning, work, and perspective.",
            "Use thoughtful comments and conversations to build your professional network."
        ]
    }
];
    const root = document.getElementById('tab-courses');
    const dialog = document.getElementById('courseDialog');
    if (!root || !dialog) return;
    let opener = null;
    root.addEventListener('click', event => {
        const trigger = event.target.closest('button[data-course]');
        if (!trigger) return;
        const isBundle = trigger.dataset.course === 'bundle';
        const course = isBundle ? {
            category: 'The complete toolkit',
            title: 'Build all three career essentials',
            description: 'Bring your CV, portfolio, and professional presence together with all three Bridgeway courses.',
            topics: catalog.map(item => item.title),
            modules: catalog.map(item => item.description)
        } : catalog.find(item => item.id === trigger.dataset.course);
        if (!course) return;
        opener = trigger;
        document.getElementById('courseDialogCategory').textContent = course.category;
        document.getElementById('courseDialogTitle').textContent = course.title;
        document.getElementById('courseDialogDescription').textContent = course.description;
        document.getElementById('courseDialogOutlineTitle').textContent = isBundle ? 'Included courses' : 'Course outline';
        document.getElementById('courseEnrollmentTitle').textContent = isBundle ? 'Unlock all 3 courses' : 'Unlock this course';
        document.getElementById('courseDialogPrice').textContent = isBundle ? '$4.99' : '$1.99';
        document.getElementById('courseDialogPriceUnit').textContent = isBundle ? 'USD / bundle' : 'USD / course';
        document.getElementById('courseBundleSaving').hidden = !isBundle;
        const outline = document.getElementById('courseDialogOutline');
        outline.replaceChildren();
        course.topics.forEach((topic, index) => {
            const item = document.createElement('li');
            const text = document.createElement('div');
            const title = document.createElement('strong');
            const description = document.createElement('p');
            title.textContent = topic;
            description.textContent = course.modules[index];
            text.append(title, description);
            item.append(text);
            outline.append(item);
        });
        dialog.showModal();
        dialog.scrollTop = 0;
        document.getElementById('courseDialogTitle').focus({ preventScroll: true });
    });
    dialog.querySelectorAll('[data-course-close]').forEach(button => button.addEventListener('click', () => dialog.close()));
    dialog.addEventListener('keydown', event => {
        if (event.key !== 'Tab') return;
        const controls = [...dialog.querySelectorAll('button:not(:disabled),a[href],[tabindex="0"]')].filter(element => element.getClientRects().length);
        const first = controls[0];
        const last = controls.at(-1);
        if (event.shiftKey && document.activeElement === first) {
            event.preventDefault();
            last.focus();
        } else if (!event.shiftKey && document.activeElement === last) {
            event.preventDefault();
            first.focus();
        }
    });
    dialog.addEventListener('click', event => {
        if (event.target !== dialog) return;
        const rect = dialog.getBoundingClientRect();
        if (event.clientX < rect.left || event.clientX > rect.right || event.clientY < rect.top || event.clientY > rect.bottom) dialog.close();
    });
    dialog.addEventListener('close', () => {
        if (opener?.getClientRects().length) opener.focus({ preventScroll: true });
    });
    window.addEventListener('hashchange', () => {
        if (location.hash !== '#tab-courses' && dialog.open) dialog.close();
    });
})();
