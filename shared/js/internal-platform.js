/* Presentation composition only. Reuse existing controls, listeners, and form state. */
(() => {
  'use strict';
  const buildGroup = (title, nodes) => {
    const group = document.createElement('fieldset');
    group.className = 'internal-fieldset';
    const legend = document.createElement('legend');
    legend.textContent = title;
    const fields = document.createElement('div');
    fields.className = 'internal-fields';
    fields.append(...nodes.filter(Boolean));
    group.append(legend, fields);
    return group;
  };
  function profileLayout(root = document) {
    const layout = root.querySelector('.student-profile-layout');
    if (!layout) return false;
    if (layout.dataset.internalLayout) return true;
    const identity = layout.querySelector('.profile-identity');
    const cv = layout.querySelector('.student-cv');
    if (!identity || !cv) return false;
    layout.dataset.internalLayout = 'true';
    const aside = document.createElement('aside');
    aside.className = 'internal-profile-aside';
    aside.setAttribute('aria-label', 'Profile and CV');
    aside.append(identity, cv);
    layout.prepend(aside);
    const compact = matchMedia('(max-width: 760px)');
    const placeCV = () => {
      const personal = layout.querySelector('.profile-personal');
      if (compact.matches && personal) personal.after(cv);
      else aside.append(cv);
    };
    placeCV();
    compact.addEventListener('change', placeCV);
    const source = identity.querySelector('.profile-verified');
    if (source) source.textContent = 'College record';
    // CV metadata saves independently. Establish the draft baseline once after
    // moving its file control out of the profile form, before the user can edit.
    window.BridgewayUX?.remember(layout.querySelector('#studentProfileForm'));
    return true;
  }
  document.addEventListener('DOMContentLoaded', () => {
    if (!document.body.classList.contains('platform-rework')) return;
    const restoreTicketDesign = () => document.body.classList.toggle('platform-rework', !document.body.classList.contains('is-ticket-page'));
    new MutationObserver(restoreTicketDesign).observe(document.body, {attributes: true, attributeFilter: ['class']});
    restoreTicketDesign();
    if (document.body.id === 'page-company-profile') {
      const form = document.getElementById('companyProfileForm');
      const group = id => document.getElementById(id)?.closest('.bw-form-group');
      const footer = form.querySelector('[data-style="s21"]');
      const company = buildGroup('Organization', [group('companyNameInput'), group('companyIndustryInput'), group('companyAboutInput')]);
      const contact = buildGroup('Location and contact', [group('companyLocationInput'), group('companyWebsiteInput'), group('companyEmailInput')]);
      company.querySelector('.internal-fields').classList.add('internal-organization-fields');
      form.querySelector('[data-style="s16"]')?.remove();
      form.insertBefore(company, footer);
      form.insertBefore(contact, footer);
      form.setAttribute('aria-label', 'Company profile');
      const security = document.querySelector('.account-security');
      if (security) document.querySelector('.bw-portal-layout').append(security);
    }
    if (document.body.id === 'page-account-settings') {
      const panels = [...document.querySelectorAll('.bw-company-content > [data-style="s1"] > .bw-card-panel')];
      ['settings-identity', 'settings-security', 'settings-preferences'].forEach((name, index) => panels[index]?.classList.add(name));
    }
    if (document.body.id === 'page-admin-dashboard') {
      const records = document.querySelector('.placements-table-wrap');
      if (records) {
        records.tabIndex = 0;
        records.setAttribute('role', 'region');
        records.setAttribute('aria-label', 'Student internship records');
      }
    }
    if (document.body.id === 'page-student-dashboard') {
      const main = document.querySelector('main');
      // Embedded profiles load on demand. Move the original nodes once after mounting.
      if (!profileLayout(main)) {
        const observer = new MutationObserver(() => {
          if (profileLayout(main)) observer.disconnect();
        });
        observer.observe(main, {childList: true, subtree: true});
      }
    }
  });
})();
