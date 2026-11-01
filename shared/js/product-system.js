/* Bridgeway product-level progressive enhancements. */
(() => {
  'use strict';

  const PAGE_SIZE = 10;
  const tableSelector = [
    '.bw-table tbody',
    '.bw-data-table tbody',
    '.platform-table tbody',
    '.publication-table tbody',
    '.listing-table tbody',
    '.placements-table tbody'
  ].join(',');

  const label = (tag, text, className) => {
    const node = document.createElement(tag);
    node.className = className;
    node.textContent = text;
    return node;
  };

  function createPager(tbody) {
    if (tbody.dataset.productPaging === 'true' || tbody.closest('[data-no-paging]')) return;
    tbody.dataset.productPaging = 'true';

    const table = tbody.closest('table');
    const tableWrap = table?.closest('.bw-table-container,.bw-table-responsive,.publication-table-wrap,.platform-table-wrap,.placements-table-wrap') || table;
    if (!table || !tableWrap) return;

    let page = 1;
    const pager = label('nav', '', 'product-pagination');
    pager.setAttribute('aria-label', 'Table pages');
    pager.hidden = true;

    const summary = label('span', '', 'product-pagination__summary');
    summary.setAttribute('aria-live', 'polite');
    summary.setAttribute('aria-atomic', 'true');

    const actions = label('span', '', 'product-pagination__actions');
    const previous = label('button', 'Previous', 'product-pagination__button');
    const next = label('button', 'Next', 'product-pagination__button');
    previous.type = next.type = 'button';
    actions.append(previous, next);
    pager.append(summary, actions);
    tableWrap.insertAdjacentElement('afterend', pager);

    const availableRows = () => {
      const rows = [...tbody.rows];
      rows.forEach(row => row.classList.remove('product-page-hidden'));
      return rows.filter(row => !row.hidden && row.style.display !== 'none');
    };

    const render = (reset = false) => {
      if (reset) page = 1;
      const rows = availableRows();
      const pages = Math.max(1, Math.ceil(rows.length / PAGE_SIZE));
      page = Math.min(page, pages);
      rows.forEach((row, index) => row.classList.toggle('product-page-hidden', index < (page - 1) * PAGE_SIZE || index >= page * PAGE_SIZE));
      pager.hidden = rows.length <= PAGE_SIZE;
      summary.textContent = `Page ${page} of ${pages}`;
      previous.disabled = page === 1;
      next.disabled = page === pages;
      previous.setAttribute('aria-label', `Previous page, page ${Math.max(1, page - 1)} of ${pages}`);
      next.setAttribute('aria-label', `Next page, page ${Math.min(pages, page + 1)} of ${pages}`);
    };

    previous.addEventListener('click', () => { page -= 1; render(); tableWrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    next.addEventListener('click', () => { page += 1; render(); tableWrap.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });

    const observer = new MutationObserver(records => {
      if (records.some(record => record.type === 'childList')) render(true);
    });
    observer.observe(tbody, { childList: true });

    tbody.productPager = { render };
    render();
  }

  function initializeTables(root = document) {
    root.querySelectorAll(tableSelector).forEach(createPager);
  }

  function createListPager(list) {
    if (!list || list.dataset.productPaging === 'true') return;
    const entries = [...list.children].filter(node => node.matches('.cycle-admission'));
    if (entries.length <= PAGE_SIZE) return;
    list.dataset.productPaging = 'true';
    let page = 1;
    const pager = label('nav', '', 'product-pagination');
    pager.setAttribute('aria-label', 'List pages');
    const summary = label('span', '', 'product-pagination__summary');
    summary.setAttribute('aria-live', 'polite');
    summary.setAttribute('aria-atomic', 'true');
    const actions = label('span', '', 'product-pagination__actions');
    const previous = label('button', 'Previous', 'product-pagination__button');
    const next = label('button', 'Next', 'product-pagination__button');
    previous.type = next.type = 'button';
    actions.append(previous, next);
    pager.append(summary, actions);
    list.insertAdjacentElement('afterend', pager);

    const render = (reset = false) => {
      if (reset) page = 1;
      const items = [...list.children].filter(node => node.matches('.cycle-admission'));
      const pages = Math.max(1, Math.ceil(items.length / PAGE_SIZE));
      page = Math.min(page, pages);
      items.forEach((item, index) => item.classList.toggle('product-page-hidden', index < (page - 1) * PAGE_SIZE || index >= page * PAGE_SIZE));
      pager.hidden = items.length <= PAGE_SIZE;
      summary.textContent = `Page ${page} of ${pages}`;
      previous.disabled = page === 1;
      next.disabled = page === pages;
    };

    previous.addEventListener('click', () => { page -= 1; render(); list.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    next.addEventListener('click', () => { page += 1; render(); list.scrollIntoView({ block: 'nearest', behavior: 'smooth' }); });
    new MutationObserver(() => render(true)).observe(list, { childList: true });
    render();
  }

  function initializeLists(root = document) {
    const candidates = root.matches?.('.cycle-admission') ? [root] : [...root.querySelectorAll?.('.cycle-admission') || []];
    [...new Set(candidates.map(node => node.parentElement))].forEach(createListPager);
  }

  const refreshTables = () => requestAnimationFrame(() => {
    document.querySelectorAll(`${tableSelector}`).forEach(tbody => tbody.productPager?.render(true));
  });

  document.addEventListener('input', event => {
    if (event.target.matches('input[type="search"],.bw-search-input,[data-platform-search]')) refreshTables();
  }, true);
  document.addEventListener('change', event => {
    if (event.target.matches('select,input[type="checkbox"],input[type="radio"]')) refreshTables();
  }, true);
  document.addEventListener('click', event => {
    if (event.target.closest('.bw-tag-btn,.bw-tab-btn,[data-filter],[data-tab]')) setTimeout(refreshTables, 0);
  }, true);

  const pageObserver = new MutationObserver(records => {
    for (const record of records) {
      for (const node of record.addedNodes) if (node.nodeType === 1) {
        initializeTables(node);
        initializeLists(record.target);
      }
    }
  });

  function init() {
    initializeTables();
    initializeLists();
    pageObserver.observe(document.body, { childList: true, subtree: true });
  }

  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init, { once: true });
  else init();
})();
