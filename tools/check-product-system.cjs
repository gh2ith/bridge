const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pages = [
  'account-settings/account-settings.html',
  'admin-dashboard/admin-dashboard.html',
  'admin-register-student/admin-register-student.html',
  'company-candidates/company-candidates.html',
  'company-dashboard/company-dashboard.html',
  'company-post-role/company-post-role.html',
  'company-profile/company-profile.html',
  'platform-admin/platform-admin.html',
  'student-dashboard/student-dashboard.html',
  'student-profile/student-profile.html',
  'supervisor-dashboard/supervisor-dashboard.html'
];

const read = file => fs.readFileSync(path.join(root, file), 'utf8');

test('every signed-in page loads the product layer after legacy workspace styles', () => {
  for (const page of pages) {
    const source = read(path.join('pages', page));
    const css = source.lastIndexOf('product-system.css');
    const js = source.lastIndexOf('product-system.js');
    assert.ok(css > source.lastIndexOf('workspace-tools.css'), `${page}: product CSS must load last`);
    assert.ok(js > source.lastIndexOf('workspace-tools.js'), `${page}: product JS must load last`);
    assert.equal(source.match(/product-system\.css/g)?.length, 1, `${page}: one product stylesheet`);
    assert.equal(source.match(/product-system\.js/g)?.length, 1, `${page}: one product script`);
  }
});

test('large tables use bounded paging without rows-per-page controls', () => {
  const source = read('shared/js/product-system.js');
  assert.match(source, /const PAGE_SIZE = 10/);
  assert.match(source, /Page \$\{page\} of \$\{pages\}/);
  assert.doesNotMatch(source, /rows per page/i);
  assert.match(source, /product-page-hidden/);
  assert.match(source, /cycle-admission/);
});

test('semantic access states stay distinct from page surfaces', () => {
  const source = read('shared/css/product-system.css');
  assert.match(source, /--product-warning-soft:/);
  assert.match(source, /--product-success-soft:/);
  assert.match(source, /\.cycle-visibility\.is-locked/);
  assert.match(source, /background: var\(--product-surface\);/);
});
