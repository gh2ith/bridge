# Bridgeway SQL Server submission

The [full installer](Bridgeway-FULL-Database.sql) creates a fresh `Bridgeway_Validation_Submission` database with 85 tables, foreign keys, indexes, procedures, and workflow guards. It installs an empty schema. Optional validation uses fictional records.

1. In SSMS, connect to SQL Server 2025 or later with permission to create databases.
2. Open `Bridgeway-FULL-Database.sql` and run the entire file with **F5**. The final result reports the installed database name and table count. If the named database already exists, the installer skips it.
3. To run the optional checks, select `Bridgeway_Validation_Submission` in SSMS, then open and run [validation.sql](../validation.sql). Run this only on a fresh disposable installation. The script creates fictional records and reports the passing checks.

The installer combines the canonical [schema](../schema.sql) and [procedures](../procedures.sql). See the [database design notes](../README.md) and [schema explorer](../../docs/database/database.html) for relationships and workflow rules. The Razor application still uses browser-local persistence.

Verified on SQL Server 2025 using a disposable database with a unique name. Fresh installation reported 85 tables, all 40 SQL checks passed, and a second installation skipped the existing database and preserved its validation records.
