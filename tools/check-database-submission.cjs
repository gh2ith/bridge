'use strict';

const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const crypto = require('node:crypto');
const { execFileSync } = require('node:child_process');
const model = require('../docs/database/database-data.js');
const { buildSubmission } = require('./build-database-submission.cjs');

const root = path.resolve(__dirname, '..');
const installer = fs.readFileSync(path.join(root, 'database/submission/Bridgeway-FULL-Database.sql'), 'utf8').replaceAll('\r\n', '\n');
assert.equal(installer, buildSubmission(), 'Regenerate the submission after changing its metadata.');

const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'bridgeway-submission-'));
const suffix = crypto.randomUUID().replaceAll('-', '');
const databases = ['Fresh', 'Existing', 'Rollback'].map(kind => `Bridgeway_Validation_Submission_${kind}_${suffix}`);
const owned = [];
const baseArgs = ['-S', 'localhost', '-E', '-C', '-I', '-b', '-f', '65001'];
const run = (database, args) => execFileSync('sqlcmd', [...baseArgs, '-d', database, ...args], { encoding: 'utf8', maxBuffer: 4e6 });
const query = (database, sql) => run(database, ['-h', '-1', '-W', '-Q', 'SET NOCOUNT ON; ' + sql]).trim();

function install(database, sql = installer) {
  const file = path.join(temp, database + '.sql');
  fs.writeFileSync(file, sql.replaceAll('Bridgeway_Submission_v2', database));
  return run('master', ['-i', file]);
}

try {
  for (const database of databases) {
    assert.equal(query('master', `SELECT CASE WHEN DB_ID(N'${database}') IS NULL THEN 1 ELSE 0 END;`), '1');
    owned.push(database);
  }

  const [fresh, existing, rollback] = databases;
  install(fresh);
  assert.equal(query(fresh, 'SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0;'), String(model.tables.length));
  assert.equal(query(fresh, 'SELECT COUNT(*) FROM sys.foreign_keys WHERE is_disabled=1 OR is_not_trusted=1;'), '0');
  assert.equal(query(fresh, 'SELECT COUNT(*) FROM sys.check_constraints WHERE is_disabled=1 OR is_not_trusted=1;'), '0');
  execFileSync(process.execPath, [path.join(__dirname, 'inspect-database.cjs'), fresh, '--website'], { stdio: 'inherit' });

  for (const example of model.queries) {
    query(fresh, example.sql);
  }
  query(fresh, "INSERT core.AuditEvent(ActorRole,Action) VALUES(N'PlatformAdmin',N'Submission rerun sentinel');");
  assert.match(install(fresh), /already exists\. Installation skipped/);
  assert.equal(query(fresh, "SELECT COUNT(*) FROM core.AuditEvent WHERE Action=N'Submission rerun sentinel';"), '1');
  assert.equal(query(fresh, 'SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0;'), String(model.tables.length));

  query('master', `CREATE DATABASE [${existing}];`);
  query(existing, 'CREATE TABLE dbo.KeepThis(Value int NOT NULL); INSERT dbo.KeepThis VALUES(7);');
  assert.match(install(existing), /already exists\. Installation skipped/);
  assert.equal(query(existing, 'SELECT Value FROM dbo.KeepThis;'), '7');
  assert.equal(query(existing, 'SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0;'), '1');

  const assertion = `IF (SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped = 0) <> ${model.tables.length}`;
  assert(installer.includes(assertion));
  const fault = installer.replace(assertion, assertion.replace(String(model.tables.length), String(model.tables.length + 1)));
  assert.throws(() => install(rollback, fault), error => /51491/.test(String(error.stdout)), 'Post-DDL failure must reach the caller.');
  assert.equal(query(rollback, 'SELECT COUNT(*) FROM sys.tables WHERE is_ms_shipped=0;'), '0');
  assert.equal(query(rollback, "SELECT COUNT(*) FROM sys.schemas WHERE name=N'core';"), '0');

  console.log(`PASS ${model.tables.length} tables, ${model.queries.length} read queries, trusted constraints, existing-database preservation and transactional rollback.`);
} finally {
  for (const database of owned) {
    query('master', `IF DB_ID(N'${database}') IS NOT NULL DROP DATABASE [${database}];`);
  }
  for (const file of fs.readdirSync(temp)) fs.unlinkSync(path.join(temp, file));
  fs.rmdirSync(temp);
}
