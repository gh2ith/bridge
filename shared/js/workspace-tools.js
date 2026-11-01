/* Compact page openings and role-specific dashboard summaries. */
(() => {
  'use strict';
  const make = (tag, className, text) => {
    const element = document.createElement(tag);
    element.className = className;
    if (text !== undefined) element.textContent = text;
    return element;
  };
  function icon(name) {
    const glyph = make('i', 'bi bi-' + name);
    glyph.setAttribute('aria-hidden', 'true');
    return glyph;
  }
  function action(label, run) {
    const button = make('button', '', label);
    button.type = 'button';
    button.addEventListener('click', run);
    return button;
  }
  function openTab(id) {
    const control = document.querySelector('.bw-masar-nav [data-tab="' + id + '"]');
    control?.click();
  }
  function group(name) {
    const section = make('section', 'ws-group');
    section.append(make('h3', '', name));
    return section;
  }
  function primary(card, label, value, caption, symbol) {
    card.classList.add('ws-primary');
    value.classList.add('ws-number');
    const footer = make('span', 'ws-caption', caption);
    footer.append(icon('arrow-up-right'));
    card.replaceChildren(make('span', 'ws-label', label), icon(symbol), value, footer);
    return card;
  }
  function metric(card, name, count) {
    card.classList.add('ws-row');
    count.classList.add('ws-count');
    card.replaceChildren(make('span', '', name), count);
    if (card.matches('button,[role="button"]')) card.append(icon('chevron-right'));
    return card;
  }
  function shortcuts(title, items) {
    const section = group(title);
    for (const [label, run] of items) {
      const button = action(label, run);
      button.className = 'ws-row ws-shortcut';
      button.append(icon('arrow-right'));
      section.append(button);
    }
    return section;
  }
  const roles = {
    company: {
      overview: 'tab-posts', lead: ['[data-summary="published"]', 'Published internships', 'Manage listings', 'briefcase'],
      group: 'Hiring and training',
      rows: [['[data-summary="applications"]', 'Applications awaiting review'], ['[data-summary="interns"]', 'Active interns'], ['[data-summary="reports"]', 'Reports in supervisor review']],
      tasks: [['Review applications', 'tab-candidates'], ['Monitor training', 'tab-progress-monitor']]
    },
    supervisor: {
      overview: 'tab-roster', lead: ['#kpiPendingReports','Reports to review','Review weekly reports','journal-check'],
      group: 'Assigned cohort',
      rows: [['#supervisedStudentsMetric', 'Assigned students'], ['#submittedReportsMetric', 'Reports submitted'], ['#reportedHoursMetric', 'Reported hours']],
      tasks: [['Monitor student progress','tab-progress-monitor'], ['Review evaluations','tab-endorsement']]
    },
    platform_admin: {
      overview: 'platform-overview', lead: ['#platformPartnershipCount','Active partnerships','Manage partnerships','link-45deg'],
      group: 'Organizations and support',
      rows: [['#platformCompanyCount','Company accounts'], ['#platformCollegeCount','College accounts'], ['#platformIssueCount','Open tickets']],
      tasks: [['Review internship listings','platform-publications'], ['Open student register','platform-students']]
    }
  };
  function staffBoard(role) {
    const spec = roles[role], board = document.querySelector('[data-dashboard-overview]');
    const cardFor = selector => board.querySelector(selector)?.closest('[data-summary],[data-platform-tab],.bw-kpi-card');
    const valueOf = card => card.querySelector('.bw-kpi-value,strong');
    const [selector, label, caption, symbol] = spec.lead;
    const hero = cardFor(selector);
    const directory = group(spec.group);
    for (const [selector, name] of spec.rows) {
      const card = cardFor(selector);
      directory.append(metric(card, name, valueOf(card)));
    }
    const heading = board.querySelector('.dashboard-overview-title');
    heading.classList.add('ws-sr');
    const workspace = shortcuts('Workspace', spec.tasks.map(([name, tab]) => [name, () => openTab(tab)]));
    let lead = primary(hero, label, valueOf(hero), caption, symbol);
    if (role === 'company') {
      const create = document.querySelector('#companyOverviewTools .company-primary');
      if (create) {
        const context = make('div', 'ws-primary-context');
        create.className = 'ws-primary-create';
        create.replaceChildren(icon('plus-lg'), make('span', '', 'Post internship'));
        context.append(lead, create);
        lead = context;
      }
    }
    board.classList.add('ws-board');
    board.replaceChildren(heading, lead, directory, workspace);
    const panel = document.getElementById(spec.overview);
    const sync = () => { board.hidden = !panel.classList.contains('is-active'); };
    sync();
    new MutationObserver(sync).observe(panel, {attributes:true,attributeFilter:['class']});
    const weekly = document.querySelector('.insight-weekly header');
    const measure = document.querySelector('.dashboard-insights .insight-switch');
    if (weekly && measure) {
      measure.setAttribute('aria-label','Weekly activity measure');
      weekly.classList.add('ws-weekly-header');
      weekly.append(measure);
    }
  }
  function studentBoard() {
    const welcome = document.querySelector('#tab-opportunities .studio-welcome');
    if (!welcome) return;
    const cycle = window.BridgewayCycle;
    const board = make('section', 'ws-board ws-student-board');
    board.setAttribute('aria-label','My internship overview');
    const value = make('strong', '');
    const hero = action('', () => openTab(hero.dataset.destination));
    const directory = group('My workspace');
    const listings = make('strong',''), applications = make('strong','');
    const listingRow = action('', () => document.querySelector('#tab-opportunities .studio-controls input, #tab-opportunities input[type="search"]')?.focus());
    directory.append(metric(listingRow,'Available listings',listings),metric(action('', () => openTab('tab-applications')),'My applications',applications));
    const tasks = shortcuts('My resources', [['Profile and CV', () => window.BridgewayOpenStudentProfile()], ['Browse courses', () => openTab('tab-courses')]]);
    board.append(hero, directory, tasks);
    welcome.replaceWith(board);
    function refresh() {
      const student = window.BridgewayStudent.current();
      const records = cycle.state.applications.filter(record => record.student === student.id);
      const training = cycle.state.histories.some(history => history.student === student.id);
      hero.dataset.destination = training ? 'tab-progress' : 'tab-applications';
      value.textContent = training ? cycle.hours(student.id) + ' h' : records.filter(record => record.status === 'Pending').length;
      primary(hero, training ? 'Verified training hours' : 'Pending applications', value, training ? 'Open my training' : 'Track applications', training ? 'clock' : 'send');
      listings.textContent = cycle.published().length;
      applications.textContent = records.length;
    }
    refresh();
    document.addEventListener('bridgeway:cycle-change',refresh);
  }
  function pageStart(main) {
    const followTicketView = update => {
      let previous;
      const sync = () => {
        const tickets = document.body.classList.contains('is-ticket-page');
        if (tickets === previous) return;
        previous = tickets;
        update(tickets);
      };
      new MutationObserver(sync).observe(document.body, {attributes:true,attributeFilter:['class']});
      sync();
    };
    const studio = main.querySelector(':scope > .studio-top');
    if (studio) {
      studio.classList.add('ws-student-start');
      const notifications = main.querySelector('.company-topbar .portal-notifications');
      const studentActions = studio.querySelector('.studio-header-actions');
      if (studentActions && notifications) studentActions.prepend(notifications);
      const caption = studio.querySelector('.student-top-caption');
      if (caption) {
        const title = make('h1','ws-student-title');
        caption.replaceWith(title);
        const nav = document.querySelector('.bw-masar-nav');
        const sync = () => {
          const active = main.querySelector('.bw-tab-panel.is-active');
          title.textContent = active?.id === 'tab-profile' || document.body.id === 'page-student-profile' ? 'My profile' :
            nav?.querySelector('[aria-current="page"] > span')?.textContent || 'Student workspace';
        };
        sync();
        main.querySelectorAll('.bw-tab-panel').forEach(panel => new MutationObserver(sync).observe(panel,{attributes:true,attributeFilter:['class']}));
        if(nav)new MutationObserver(sync).observe(nav,{subtree:true,attributes:true,attributeFilter:['aria-current']});
        followTicketView(tickets => {
          studio.classList.toggle('ws-student-start', !tickets);
          if (tickets) title.replaceWith(caption);
          else if (caption.isConnected) caption.replaceWith(title);
        });
      }
      return;
    }
    const heading = main.querySelector('.bw-page-header,.company-page-heading,.ie-page-heading');
    const top = main.querySelector(':scope > .company-topbar');
    if (!heading || !top) return;
    const account = main.querySelector('.portal-header-actions') || top.querySelector('.company-account-wrap');
    const title = heading.querySelector('h1');
    if (!title || !account) return;
    const menu = main.querySelector('.portal-mobile-menu');
    const accountPosition = document.createComment('Account controls position');
    account.before(accountPosition);
    const menuPosition = document.createComment('Menu position');
    if (menu) menu.before(menuPosition);
    const tools = heading.querySelector('#portalHeadingTools,.company-heading-tools,#platformOverviewTools,#supervisorHeadingTools');
    const start = make('header','ws-start');
    const identity = make('div','ws-identity');
    if(menu)identity.append(menu);
    identity.append(title);
    if (heading.matches('.ie-page-heading')) {
      const description = heading.querySelector('p');
      if (description) {
        identity.classList.add('ws-form-identity');
        identity.append(description);
      }
      heading.hidden = true;
    }
    start.append(identity);
    if(tools) {
      tools.classList.add('ws-actions');
      start.append(tools);
    }
    account.classList.add('ws-account');
    start.append(account);
    top.before(start);
    top.hidden = true;
    // Preserve secondary links, form instructions, and tab-specific descriptions.
    heading.classList.add('ws-remainder');
    followTicketView(tickets => {
      start.hidden = tickets;
      top.hidden = !tickets;
      if (tickets) {
        accountPosition.after(account);
        account.classList.remove('ws-account');
        if (menu) menuPosition.after(menu);
      } else {
        account.classList.add('ws-account');
        start.append(account);
        if (menu) identity.prepend(menu);
      }
    });
  }
  document.addEventListener('DOMContentLoaded', () => {
    const main = document.querySelector('main');
    if (!main) return;
    const role = document.body.dataset.portalRole;
    if (roles[role] && main.querySelector('[data-dashboard-overview]')) staffBoard(role);
    if (document.body.id === 'page-student-dashboard') studentBoard();
    pageStart(main);
  });
})();
