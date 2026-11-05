'use strict';
const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const root=path.resolve(__dirname,'..');
const websiteRevision=process.argv.includes('--website');
const normalize=text=>text.replaceAll('\r\n','\n');
const model=websiteRevision ? require('../docs/database/database-data.js') : require('../database/installed-model.cjs');
const names=new Set(),constraints=new Set();
const type=t=>t.toLowerCase().replace(/\s+/g,'');
for(const table of model.tables){
 assert(!names.has(table.id),`Duplicate table ${table.id}`);names.add(table.id);
 assert(model.groups.some(g=>g.id===table.group),`Missing group ${table.id}`);
 const columns=new Map(table.columns.map(c=>[c.name,c]));assert.equal(columns.size,table.columns.length);
 assert(table.description&&table.columns.length);
 for(const col of table.columns){assert(col.description&&col.type);assert.equal(typeof col.nullable,'boolean');assert(/^(uniqueidentifier|nvarchar\((max|\d+)\)|int|bigint|tinyint|bit|decimal\(\d+,\d+\)|datetime2\(3\)|date|rowversion|binary\(\d+\)|char\(\d+\))$/i.test(col.type),`Unsupported type ${table.id}.${col.name}: ${col.type}`);if(col.identity)assert(/^(bigint|int)$/i.test(col.type));}
 const keys=[table.primaryKey,...table.uniqueKeys];
 for(const key of [...keys,...table.indexes])for(const col of key.columns)assert(columns.has(col),`${table.id}.${col}`);
 for(const col of table.primaryKey.columns)assert.equal(columns.get(col).nullable,false);
 for(const obj of [table.primaryKey,...table.uniqueKeys,...table.checks,...table.foreignKeys]){assert(obj.name.length<=128);assert(!constraints.has(obj.name),`Duplicate constraint ${obj.name}`);constraints.add(obj.name);}
 for(const fk of table.foreignKeys){
  const target=model.find(fk.target);assert(target,`Missing target ${fk.target}`);assert.equal(fk.columns.length,fk.targetColumns.length);
  assert([target.primaryKey,...target.uniqueKeys].some(k=>JSON.stringify(k.columns)===JSON.stringify(fk.targetColumns)),`Referenced columns are not an ordered unique key: ${fk.name}`);
  fk.columns.forEach((col,i)=>assert.equal(type(columns.get(col)?.type||''),type(target.columns.find(c=>c.name===fk.targetColumns[i])?.type||''),`Type mismatch ${fk.name}`));
  assert(['one','many'].includes(fk.cardinality.from));assert.equal(fk.cardinality.to,'one');assert.equal(fk.cardinality.optional,fk.columns.some(col=>columns.get(col).nullable));assert.equal(fk.onDelete,'NO ACTION');
 }
 assert.equal(model.layout.filter(l=>l.table===table.id).length,1,`Layout parity ${table.id}`);
}
assert.equal(model.layout.length,model.tables.length);
if(websiteRevision){
 if(fs.existsSync(path.join(root,'src/Bridgeway.Web/Bridgeway.Web.csproj')))
 for(const file of ['database-data.js','database.js','database.css']){
  const reference=fs.readFileSync(path.join(root,'docs/database',file),'utf8');
  const razor=fs.readFileSync(path.join(root,'src/Bridgeway.Web/wwwroot/page-assets/database-reference',file),'utf8');
  assert.equal(normalize(reference),normalize(razor),'Razor database asset drift: '+file);
 }
 assert.equal(new Set(model.queries.map(query=>query.id)).size,model.queries.length,'Query IDs must be unique');
 for(const query of model.queries)assert(query.title && query.description && query.sql);
}else{
 assert.equal(normalize(fs.readFileSync(path.join(root,'database/schema.sql'),'utf8')),model.ddl(),'Installed schema drift');
}
assert.deepEqual(fs.readdirSync(path.join(root,'docs/database')).sort(),['database-data.js','database.css','database.html','database.js'],'Documentation must contain exactly four files');
const sql=model.ddl();assert(!/AUTO_INCREMENT|\bSERIAL\b/.test(sql));
assert.equal((sql.match(/FOREIGN KEY \(/g)||[]).length,model.tables.reduce((n,t)=>n+t.foreignKeys.length,0));
console.log(JSON.stringify({tables:model.tables.length,columns:model.tables.reduce((n,t)=>n+t.columns.length,0),relationships:model.tables.reduce((n,t)=>n+t.foreignKeys.length,0),checks:model.tables.reduce((n,t)=>n+t.checks.length,0),indexes:model.tables.reduce((n,t)=>n+t.indexes.length,0),result:'Metadata, ordered composite keys, SQL parity and layout checks passed.'},null,2));
