# Bridgeway SQL Server submission

The [SQL installer](Bridgeway-FULL-Database.sql) matches the revised [database reference](../../docs/database/database.html). It creates **60 tables**, **123 foreign keys**, **109 CHECK constraints** and **111 secondary indexes**, plus primary and unique keys. There are 44 tables for current workflows and 16 for planned courses, one-time course and bundle purchases, AI matching and notifications.

1. In SSMS, connect to SQL Server 2025 or later with permission to create databases.
2. Open `Bridgeway-FULL-Database.sql` and run the entire file with **F5**. It creates `Bridgeway_Submission_v2` and reports its table and foreign key counts.
3. Expand that database in Object Explorer. The tables are grouped into ten schemas. The 12 read query examples at the end of the file can be copied and run separately in this database. Replace the `NULL` ID parameter in the examples that require one.

The installer skips an existing target. Use a fresh database name for another installation. A failed installation rolls back the new tables and can leave the newly created database empty. The script contains no account or business records.

This revision includes the schema, constraints, indexes and read examples. Adapting workflow write procedures to the revised tables remains backend work. The [earlier 85-table installer](https://github.com/gh2ith/bridge/blob/0df502afe5864b9626df2c769ded71773e5e0efe/database/submission/Bridgeway-FULL-Database.sql) includes its original procedures and guards. The files `database/schema.sql`, `database/procedures.sql` and `database/validation.sql` describe that earlier version. Its validation script applies to the 85-table installation.

The revised metadata is the source for both the website download and this submission. Regenerate this file from the repository root with `node tools/build-database-submission.cjs`. Run `node tools/check-database-submission.cjs` to verify it with disposable local SQL Server databases. The Razor Pages application's workflow persistence still uses browser storage.

Verification covers fresh SQL Server installation, the generated catalog, all 12 read examples, skipping an existing database without changing its records, and rollback after an installation failure.
