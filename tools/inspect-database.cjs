'use strict';
const {execFile}=require('node:child_process'),{promisify}=require('node:util'),assert=require('node:assert/strict');
const model=process.argv.includes('--website') ? require('../docs/database/database-data.js') : require('../database/installed-model.cjs');
const run=promisify(execFile),database=process.argv[2];
if(!/^(Bridgeway|Bridgeway_Validation_[A-Za-z0-9_]+)$/.test(database||''))throw new Error('Specify Bridgeway or a named disposable validation database. This script is read-only.');
const query=async q=>{const r=await run('sqlcmd',['-S','localhost','-d',database,'-E','-C','-I','-b','-y','0','-w','65535','-Q','SET NOCOUNT ON; '+q+' FOR JSON PATH;'],{maxBuffer:4e6});return JSON.parse(r.stdout.replace(/\r?\n/g,'').trim()||'[]');};
(async()=>{
 const [columns,fks,constraints]=await Promise.all([
  query(`SELECT SCHEMA_NAME(t.schema_id)+'.'+t.name AS TableId,c.name AS ColumnName,ty.name AS TypeName,c.max_length AS MaxLength,c.precision AS Precision,c.scale AS Scale,c.is_nullable AS Nullable,c.is_identity AS IsIdentity FROM sys.tables t JOIN sys.columns c ON c.object_id=t.object_id JOIN sys.types ty ON ty.user_type_id=c.user_type_id WHERE t.is_ms_shipped=0 ORDER BY TableId,c.column_id`),
  query(`SELECT SCHEMA_NAME(t.schema_id)+'.'+t.name AS TableId,f.name AS ConstraintName,c.name AS ColumnName,SCHEMA_NAME(rt.schema_id)+'.'+rt.name AS Target,rc.name AS TargetColumn,fc.constraint_column_id AS Ordinal FROM sys.foreign_keys f JOIN sys.tables t ON t.object_id=f.parent_object_id JOIN sys.tables rt ON rt.object_id=f.referenced_object_id JOIN sys.foreign_key_columns fc ON fc.constraint_object_id=f.object_id JOIN sys.columns c ON c.object_id=t.object_id AND c.column_id=fc.parent_column_id JOIN sys.columns rc ON rc.object_id=rt.object_id AND rc.column_id=fc.referenced_column_id ORDER BY f.name,fc.constraint_column_id`),
  query(`SELECT name FROM sys.objects WHERE type IN('PK','UQ','C','F') AND is_ms_shipped=0`)
 ]);
 const type=c=>c.TypeName==='nvarchar'?`nvarchar(${c.MaxLength===-1?'max':c.MaxLength/2})`:c.TypeName==='char'?`char(${c.MaxLength})`:c.TypeName==='binary'?`binary(${c.MaxLength})`:c.TypeName==='datetime2'?`datetime2(${c.Scale})`:c.TypeName==='decimal'?`decimal(${c.Precision},${c.Scale})`:c.TypeName==='timestamp'?'rowversion':c.TypeName;
 assert.equal(columns.length,model.tables.reduce((n,t)=>n+t.columns.length,0));
 assert.equal(new Set(columns.map(c=>c.TableId)).size,model.tables.length);
 for(const table of model.tables){for(const col of table.columns){const actual=columns.find(c=>c.TableId===table.id&&c.ColumnName===col.name);assert(actual,`${table.id}.${col.name}`);assert.equal(type(actual),col.type);assert.equal(Boolean(actual.Nullable),col.nullable);assert.equal(Boolean(actual.IsIdentity),Boolean(col.identity));}for(const item of [table.primaryKey,...table.uniqueKeys,...table.checks,...table.foreignKeys])assert(constraints.some(c=>c.name===item.name),item.name);
  for(const fk of table.foreignKeys){const actual=fks.filter(f=>f.TableId===table.id&&f.ConstraintName===fk.name);assert.equal(actual.length,fk.columns.length);fk.columns.forEach((col,i)=>{const entry=actual.find(c=>c.Ordinal===i+1);assert.equal(entry.ColumnName,col);assert.equal(entry.Target,fk.target);assert.equal(entry.TargetColumn,fk.targetColumns[i]);});}
 }
 console.log(`PASS ${database}: live table/column types, nullability, identities, constraints and ordered foreign keys match the documentation metadata.`);
})().catch(e=>{console.error(e.stdout||e.message);process.exitCode=1;});
