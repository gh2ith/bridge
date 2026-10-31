/* Presentation only: keep metric nodes in place for positional data updates. */
(() => {
  'use strict';
  document.addEventListener('DOMContentLoaded', () => {
    const grid = document.querySelector('[data-dashboard-overview]');
    if (!grid) return;
    const title = document.createElement('h2');
    title.id = 'dashboardOverviewTitle';
    title.className = 'dashboard-overview-title';
    title.textContent = 'At a glance';
    grid.prepend(title);
    grid.setAttribute('aria-labelledby', title.id);
    const role = document.body.dataset.portalRole;
    const labels = {
      admin: ['College accounts', 'Students', 'Partner companies', 'Academic supervisors', 'Internship opportunities', 'Active internships'],
      supervisor: ['Assigned students', 'Reports submitted', 'Reported hours', 'Reports to review']
    };
    const descriptions = {
      admin: ['View college accounts', 'View student directory', 'View partner companies', 'View supervisor directory', 'Browse internship listings', 'View placements'],
      supervisor: ['View your student roster', 'View submitted weekly reports', 'Company-reported training hours', 'Review company-submitted reports']
    };
    grid.querySelectorAll('.bw-kpi-card').forEach((card, index) => {
      const label = card.querySelector('.bw-kpi-label');
      const description = card.querySelector('.bw-kpi-desc');
      if (label && labels[role]?.[index]) label.textContent = labels[role][index];
      if (description && descriptions[role]?.[index]) description.textContent = descriptions[role][index];
      if (card.matches('[data-onclick]') && description) {
        const arrow = document.createElement('i');
        arrow.className = 'bi bi-arrow-right';
        arrow.setAttribute('aria-hidden', 'true');
        description.append(arrow);
      }
    });
    // Keep summary and next action ahead of secondary operational shortcuts.
    const platform = document.getElementById('platform-overview');
    if (platform) platform.prepend(grid);


    // A card may disappear when it opens a view. Move keyboard focus into that view.
    grid.addEventListener('click', event => {
      if (!event.target.closest('[data-onclick],button')) return;
      requestAnimationFrame(() => {
        if (grid.getClientRects().length) return;
        const heading = document.querySelector('.bw-tab-panel.is-active h2, .bw-tab-panel.is-active h1');
        if (heading) { heading.tabIndex = -1; heading.focus({preventScroll:true}); }
      });
    });
  });
})();
