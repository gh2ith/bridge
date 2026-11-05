-- Bridgeway: SQL Server 2025 (17.x), compatibility 170. Generated from database-data.js.

-- Select an EMPTY target database in SSMS or use sqlcmd -d. Database creation is separate.

-- GO is a client batch separator understood by SSMS and sqlcmd. No existing data is dropped.

SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
SET ANSI_PADDING ON;
SET ANSI_WARNINGS ON;
SET ARITHABORT ON;
SET CONCAT_NULL_YIELDS_NULL ON;
SET NUMERIC_ROUNDABORT OFF;
SET XACT_ABORT ON;
GO

IF EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped=0) THROW 51000, 'Schema installation requires an empty database. No changes were made.', 1;
GO

IF SCHEMA_ID(N'core') IS NULL EXEC(N'CREATE SCHEMA [core] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'recruitment') IS NULL EXEC(N'CREATE SCHEMA [recruitment] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'training') IS NULL EXEC(N'CREATE SCHEMA [training] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'attendance') IS NULL EXEC(N'CREATE SCHEMA [attendance] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'meetings') IS NULL EXEC(N'CREATE SCHEMA [meetings] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'support') IS NULL EXEC(N'CREATE SCHEMA [support] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'learning') IS NULL EXEC(N'CREATE SCHEMA [learning] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'commerce') IS NULL EXEC(N'CREATE SCHEMA [commerce] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'ai') IS NULL EXEC(N'CREATE SCHEMA [ai] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'notifications') IS NULL EXEC(N'CREATE SCHEMA [notifications] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'api') IS NULL EXEC(N'CREATE SCHEMA [api] AUTHORIZATION [dbo]');
GO

IF SCHEMA_ID(N'reporting') IS NULL EXEC(N'CREATE SCHEMA [reporting] AUTHORIZATION [dbo]');
GO

-- Company or college identity; administrator accounts are separate people.
CREATE TABLE [core].[Organization] (
  [OrganizationId] uniqueidentifier NOT NULL CONSTRAINT [DF_Organization_OrganizationId] DEFAULT (NEWSEQUENTIALID()),
  [Kind] nvarchar(16) NOT NULL,
  [Name] nvarchar(200) NOT NULL,
  [ReferenceCode] nvarchar(80) NOT NULL,
  [City] nvarchar(100) NOT NULL,
  [Address] nvarchar(400) NOT NULL,
  [Phone] nvarchar(30) NOT NULL,
  [Website] nvarchar(2048) NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Organization_Status] DEFAULT (N'Active'),
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Organization_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Organization] PRIMARY KEY ([OrganizationId]),
  CONSTRAINT [UQ_Organization_IdKind] UNIQUE ([OrganizationId], [Kind]),
  CONSTRAINT [UQ_Organization_Reference] UNIQUE ([Kind], [ReferenceCode]),
  CONSTRAINT [CK_Organization_Kind] CHECK ([Kind] IN (N'College', N'Company')),
  CONSTRAINT [CK_Organization_Status] CHECK ([Status] IN (N'Active', N'Suspended'))
);
GO

-- College subtype, used for tenant-scoped foreign keys.
CREATE TABLE [core].[College] (
  [CollegeId] uniqueidentifier NOT NULL,
  [Kind] nvarchar(16) NOT NULL CONSTRAINT [DF_College_Kind] DEFAULT (N'College'),
  CONSTRAINT [PK_College] PRIMARY KEY ([CollegeId]),
  CONSTRAINT [CK_College_Kind] CHECK ([Kind] IN (N'College'))
);
GO

-- Host-company subtype.
CREATE TABLE [core].[Company] (
  [CompanyId] uniqueidentifier NOT NULL,
  [Kind] nvarchar(16) NOT NULL CONSTRAINT [DF_Company_Kind] DEFAULT (N'Company'),
  [Industry] nvarchar(160) NULL,
  [About] nvarchar(4000) NULL,
  CONSTRAINT [PK_Company] PRIMARY KEY ([CompanyId]),
  CONSTRAINT [CK_Company_Kind] CHECK ([Kind] IN (N'Company'))
);
GO

-- Administrator-managed access identity. ExternalAuthSubject is assigned by the future identity provider. No passwords.
CREATE TABLE [core].[UserAccount] (
  [UserId] uniqueidentifier NOT NULL CONSTRAINT [DF_UserAccount_UserId] DEFAULT (NEWSEQUENTIALID()),
  [OrganizationId] uniqueidentifier NULL,
  [Role] nvarchar(20) NOT NULL,
  [FullName] nvarchar(160) NOT NULL,
  [Email] nvarchar(254) NOT NULL,
  [Phone] nvarchar(30) NULL,
  [JobTitle] nvarchar(160) NULL,
  [ExternalAuthSubject] nvarchar(256) NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_UserAccount_Status] DEFAULT (N'Active'),
  [CreatedBy] uniqueidentifier NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_UserAccount_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_UserAccount] PRIMARY KEY ([UserId]),
  CONSTRAINT [UQ_UserAccount_Email] UNIQUE ([Email]),
  CONSTRAINT [UQ_UserAccount_Scope] UNIQUE ([UserId], [OrganizationId], [Role]),
  CONSTRAINT [CK_UserAccount_Role] CHECK ([Role] IN (N'PlatformAdmin', N'CollegeAdmin', N'CompanyAdmin', N'Student', N'Supervisor')),
  CONSTRAINT [CK_UserAccount_Status] CHECK ([Status] IN (N'Active', N'Suspended')),
  CONSTRAINT [CK_UserAccount_OrganizationRole] CHECK (([Role]=N'PlatformAdmin' AND [OrganizationId] IS NULL) OR ([Role]<>N'PlatformAdmin' AND [OrganizationId] IS NOT NULL))
);
GO

-- College-owned academic identity. Student numbers are unique inside a college.
CREATE TABLE [core].[Student] (
  [StudentId] uniqueidentifier NOT NULL CONSTRAINT [DF_Student_StudentId] DEFAULT (NEWSEQUENTIALID()),
  [UserId] uniqueidentifier NOT NULL,
  [CollegeId] uniqueidentifier NOT NULL,
  [Role] nvarchar(20) NOT NULL CONSTRAINT [DF_Student_Role] DEFAULT (N'Student'),
  [StudentNumber] nvarchar(40) NOT NULL,
  [Faculty] nvarchar(160) NOT NULL,
  [Department] nvarchar(160) NOT NULL,
  [StudyYear] nvarchar(12) NOT NULL,
  [Gpa] decimal(3,2) NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Student_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Student] PRIMARY KEY ([StudentId]),
  CONSTRAINT [UQ_Student_User] UNIQUE ([UserId]),
  CONSTRAINT [UQ_Student_Scope] UNIQUE ([StudentId], [CollegeId]),
  CONSTRAINT [UQ_Student_Number] UNIQUE ([CollegeId], [StudentNumber]),
  CONSTRAINT [CK_Student_Role] CHECK ([Role] IN (N'Student')),
  CONSTRAINT [CK_Student_StudyYear] CHECK ([StudyYear] IN (N'1', N'2', N'3', N'4', N'5', N'6', N'Graduate')),
  CONSTRAINT [CK_Student_Gpa] CHECK ([Gpa] BETWEEN 0 AND 4)
);
GO

-- College-owned academic supervisor. Staff number is generated by the account service.
CREATE TABLE [core].[Supervisor] (
  [SupervisorId] uniqueidentifier NOT NULL CONSTRAINT [DF_Supervisor_SupervisorId] DEFAULT (NEWSEQUENTIALID()),
  [UserId] uniqueidentifier NOT NULL,
  [CollegeId] uniqueidentifier NOT NULL,
  [Role] nvarchar(20) NOT NULL CONSTRAINT [DF_Supervisor_Role] DEFAULT (N'Supervisor'),
  [StaffNumber] nvarchar(80) NOT NULL,
  [AcademicTitle] nvarchar(20) NOT NULL,
  [Faculty] nvarchar(160) NOT NULL,
  [Department] nvarchar(160) NOT NULL,
  [Office] nvarchar(160) NULL,
  [OfficeHours] nvarchar(300) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Supervisor_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Supervisor] PRIMARY KEY ([SupervisorId]),
  CONSTRAINT [UQ_Supervisor_User] UNIQUE ([UserId]),
  CONSTRAINT [UQ_Supervisor_Scope] UNIQUE ([SupervisorId], [CollegeId]),
  CONSTRAINT [UQ_Supervisor_Staff] UNIQUE ([CollegeId], [StaffNumber]),
  CONSTRAINT [CK_Supervisor_Role] CHECK ([Role] IN (N'Supervisor'))
);
GO

-- Independent academic assignment history, including before placement. Exactly one current assignment per student.
CREATE TABLE [core].[AcademicAssignment] (
  [AssignmentId] uniqueidentifier NOT NULL CONSTRAINT [DF_AcademicAssignment_AssignmentId] DEFAULT (NEWSEQUENTIALID()),
  [StudentId] uniqueidentifier NOT NULL,
  [SupervisorId] uniqueidentifier NOT NULL,
  [CollegeId] uniqueidentifier NOT NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [AssignedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicAssignment_AssignedAt] DEFAULT (SYSUTCDATETIME()),
  [EndedAt] datetime2(3) NULL,
  [EndedBy] uniqueidentifier NULL,
  CONSTRAINT [PK_AcademicAssignment] PRIMARY KEY ([AssignmentId]),
  CONSTRAINT [UQ_AcademicAssignment_Participants] UNIQUE ([AssignmentId], [StudentId], [SupervisorId], [CollegeId]),
  CONSTRAINT [CK_AcademicAssignment_End] CHECK (([EndedAt] IS NULL AND [EndedBy] IS NULL) OR ([EndedAt]>=[AssignedAt] AND [EndedBy] IS NOT NULL))
);
GO

-- College-company connection. Inactive displays as Paused. Absence of a row does not restrict approved listings.
CREATE TABLE [core].[Partnership] (
  [PartnershipId] uniqueidentifier NOT NULL CONSTRAINT [DF_Partnership_PartnershipId] DEFAULT (NEWSEQUENTIALID()),
  [CollegeId] uniqueidentifier NOT NULL,
  [CompanyId] uniqueidentifier NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Partnership_Status] DEFAULT (N'Active'),
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Partnership_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Partnership] PRIMARY KEY ([PartnershipId]),
  CONSTRAINT [UQ_Partnership_Pair] UNIQUE ([CollegeId], [CompanyId]),
  CONSTRAINT [CK_Partnership_Status] CHECK ([Status] IN (N'Active', N'Inactive'))
);
GO

-- Append-only creation, pause and resume history.
CREATE TABLE [core].[PartnershipEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_PartnershipEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [PartnershipId] uniqueidentifier NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [Action] nvarchar(16) NOT NULL,
  [Reason] nvarchar(1000) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PartnershipEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_PartnershipEvent] PRIMARY KEY ([EventId]),
  CONSTRAINT [CK_PartnershipEvent_Action] CHECK ([Action] IN (N'Created', N'Paused', N'Resumed'))
);
GO

-- Per-account preferences. These do not represent notification delivery.
CREATE TABLE [core].[UserPreference] (
  [UserId] uniqueidentifier NOT NULL,
  [PreferenceKey] nvarchar(80) NOT NULL,
  [PreferenceValue] nvarchar(1000) NOT NULL,
  [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_UserPreference_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_UserPreference] PRIMARY KEY ([UserId], [PreferenceKey])
);
GO

-- Per-viewer seen versions for sidebar activity dots, not counts or directory totals.
CREATE TABLE [core].[ActivityReceipt] (
  [UserId] uniqueidentifier NOT NULL,
  [SectionKey] nvarchar(80) NOT NULL,
  [RecordKind] nvarchar(60) NOT NULL,
  [RecordId] uniqueidentifier NOT NULL,
  [SeenVersion] nvarchar(100) NOT NULL,
  [SeenAt] datetime2(3) NOT NULL CONSTRAINT [DF_ActivityReceipt_SeenAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ActivityReceipt] PRIMARY KEY ([UserId], [SectionKey], [RecordKind], [RecordId])
);
GO

-- File metadata and future object-storage reference. MetadataOnly rows have no server content.
CREATE TABLE [core].[FileAsset] (
  [FileId] uniqueidentifier NOT NULL CONSTRAINT [DF_FileAsset_FileId] DEFAULT (NEWSEQUENTIALID()),
  [OwnerId] uniqueidentifier NOT NULL,
  [FileName] nvarchar(255) NOT NULL,
  [MediaType] nvarchar(120) NOT NULL,
  [ByteSize] bigint NOT NULL,
  [StorageState] nvarchar(20) NOT NULL CONSTRAINT [DF_FileAsset_StorageState] DEFAULT (N'MetadataOnly'),
  [StorageProvider] nvarchar(40) NULL,
  [StorageKey] nvarchar(512) NULL,
  [Sha256] binary(32) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_FileAsset_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_FileAsset] PRIMARY KEY ([FileId]),
  CONSTRAINT [CK_FileAsset_StorageState] CHECK ([StorageState] IN (N'MetadataOnly', N'Available', N'Quarantined', N'Deleted')),
  CONSTRAINT [CK_FileAsset_Size] CHECK ([ByteSize]>0),
  CONSTRAINT [CK_FileAsset_Reference] CHECK ([StorageState]<>N'Available' OR ([StorageProvider] IS NOT NULL AND [StorageKey] IS NOT NULL AND [Sha256] IS NOT NULL))
);
GO

-- Editable professional summary and contact overlay. Academic fields stay in Student.
CREATE TABLE [core].[StudentProfile] (
  [StudentId] uniqueidentifier NOT NULL,
  [DisplayName] nvarchar(160) NOT NULL,
  [Phone] nvarchar(30) NULL,
  [Bio] nvarchar(3000) NULL,
  [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_StudentProfile_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_StudentProfile] PRIMARY KEY ([StudentId])
);
GO

-- Student-selected skills, up to twenty through the service procedure.
CREATE TABLE [core].[StudentSkill] (
  [StudentId] uniqueidentifier NOT NULL,
  [Skill] nvarchar(40) NOT NULL,
  CONSTRAINT [PK_StudentSkill] PRIMARY KEY ([StudentId], [Skill])
);
GO

-- Immutable CV selections; metadata-only historical selections are valid but cannot be analyzed.
CREATE TABLE [core].[StudentCvVersion] (
  [CvVersionId] uniqueidentifier NOT NULL CONSTRAINT [DF_StudentCvVersion_CvVersionId] DEFAULT (NEWSEQUENTIALID()),
  [StudentId] uniqueidentifier NOT NULL,
  [FileId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_StudentCvVersion_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_StudentCvVersion] PRIMARY KEY ([CvVersionId]),
  CONSTRAINT [UQ_StudentCvVersion_Version] UNIQUE ([StudentId], [VersionNumber]),
  CONSTRAINT [UQ_StudentCvVersion_Scope] UNIQUE ([CvVersionId], [StudentId]),
  CONSTRAINT [CK_StudentCvVersion_Version] CHECK ([VersionNumber]>0)
);
GO

-- Exactly one current training program per college. Version selection is independent of existing agreements.
CREATE TABLE [training].[CollegeProgram] (
  [CollegeId] uniqueidentifier NOT NULL,
  [CurrentVersion] int NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_CollegeProgram] PRIMARY KEY ([CollegeId]),
  CONSTRAINT [CK_CollegeProgram_Version] CHECK ([CurrentVersion]>0)
);
GO

-- Immutable college requirements. Null weekly limit means no college limit.
CREATE TABLE [training].[CollegeProgramVersion] (
  [CollegeId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [RequiredHours] int NOT NULL,
  [MinimumWeeks] int NOT NULL,
  [MaximumWeeklyHours] int NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CollegeProgramVersion_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_CollegeProgramVersion] PRIMARY KEY ([CollegeId], [VersionNumber]),
  CONSTRAINT [CK_CollegeProgramVersion_Requirements] CHECK ([VersionNumber]>0 AND [RequiredHours] BETWEEN 1 AND 8736 AND [MinimumWeeks] BETWEEN 1 AND 52 AND ([MaximumWeeklyHours] IS NULL OR [MaximumWeeklyHours] BETWEEN 1 AND 168))
);
GO

-- Company-owned opportunity identity. New content creates a new immutable version and requires platform moderation.
CREATE TABLE [recruitment].[Listing] (
  [ListingId] uniqueidentifier NOT NULL CONSTRAINT [DF_Listing_ListingId] DEFAULT (NEWSEQUENTIALID()),
  [CompanyId] uniqueidentifier NOT NULL,
  [CurrentVersion] int NULL,
  [Status] nvarchar(20) NOT NULL CONSTRAINT [DF_Listing_Status] DEFAULT (N'Pending review'),
  [DeletedFromStatus] nvarchar(20) NULL,
  [DeletedAt] datetime2(3) NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Listing_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Listing] PRIMARY KEY ([ListingId]),
  CONSTRAINT [UQ_Listing_Scope] UNIQUE ([ListingId], [CompanyId]),
  CONSTRAINT [CK_Listing_Status] CHECK ([Status] IN (N'Pending review', N'Published', N'Rejected', N'Paused', N'Deleted'))
);
GO

-- Immutable opportunity content for publication, applications, and AI matching.
CREATE TABLE [recruitment].[ListingVersion] (
  [ListingId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Title] nvarchar(160) NOT NULL,
  [Category] nvarchar(100) NOT NULL,
  [CategoryLabel] nvarchar(100) NULL,
  [City] nvarchar(100) NOT NULL,
  [WorkplaceMode] nvarchar(16) NOT NULL,
  [Description] nvarchar(max) NOT NULL,
  [Capacity] int NOT NULL,
  [ApplicationDeadline] date NOT NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ListingVersion_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ListingVersion] PRIMARY KEY ([ListingId], [VersionNumber]),
  CONSTRAINT [CK_ListingVersion_Description_Length] CHECK (DATALENGTH([Description])<=12000),
  CONSTRAINT [CK_ListingVersion_WorkplaceMode] CHECK ([WorkplaceMode] IN (N'On-site', N'Hybrid', N'Remote')),
  CONSTRAINT [CK_ListingVersion_Bounds] CHECK ([VersionNumber]>0 AND [Capacity] BETWEEN 1 AND 500)
);
GO

-- Ordered listing skill content in an immutable listing version.
CREATE TABLE [recruitment].[ListingSkill] (
  [ListingId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Ordinal] int NOT NULL,
  [Skill] nvarchar(80) NOT NULL,
  CONSTRAINT [PK_ListingSkill] PRIMARY KEY ([ListingId], [VersionNumber], [Ordinal]),
  CONSTRAINT [CK_ListingSkill_Ordinal] CHECK ([Ordinal]>0)
);
GO

-- Ordered listing prerequisite content in an immutable listing version.
CREATE TABLE [recruitment].[ListingPrerequisite] (
  [ListingId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Ordinal] int NOT NULL,
  [Requirement] nvarchar(300) NOT NULL,
  CONSTRAINT [PK_ListingPrerequisite] PRIMARY KEY ([ListingId], [VersionNumber], [Ordinal]),
  CONSTRAINT [CK_ListingPrerequisite_Ordinal] CHECK ([Ordinal]>0)
);
GO

-- Ordered listing question content in an immutable listing version.
CREATE TABLE [recruitment].[ListingQuestion] (
  [ListingId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Ordinal] int NOT NULL,
  [Question] nvarchar(300) NOT NULL,
  CONSTRAINT [PK_ListingQuestion] PRIMARY KEY ([ListingId], [VersionNumber], [Ordinal]),
  CONSTRAINT [CK_ListingQuestion_Ordinal] CHECK ([Ordinal] BETWEEN 1 AND 10)
);
GO

-- Published positive weekly allocation, supporting one to fifty-two weeks.
CREATE TABLE [recruitment].[ListingScheduleWeek] (
  [ListingId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [WeekNumber] int NOT NULL,
  [Title] nvarchar(160) NOT NULL,
  [AllocatedHours] int NOT NULL,
  CONSTRAINT [PK_ListingScheduleWeek] PRIMARY KEY ([ListingId], [VersionNumber], [WeekNumber]),
  CONSTRAINT [CK_ListingScheduleWeek_Allocation] CHECK ([WeekNumber] BETWEEN 1 AND 52 AND [AllocatedHours] BETWEEN 1 AND 168)
);
GO

-- Append-only platform moderation decisions, distinct from hiring decisions.
CREATE TABLE [recruitment].[ListingDecision] (
  [DecisionId] uniqueidentifier NOT NULL CONSTRAINT [DF_ListingDecision_DecisionId] DEFAULT (NEWSEQUENTIALID()),
  [ListingId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Decision] nvarchar(20) NOT NULL,
  [Reason] nvarchar(2000) NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ListingDecision_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ListingDecision] PRIMARY KEY ([DecisionId]),
  CONSTRAINT [CK_ListingDecision_Decision] CHECK ([Decision] IN (N'Published', N'Rejected', N'Paused')),
  CONSTRAINT [CK_ListingDecision_Reason] CHECK ([Decision]=N'Published' OR ([Reason] IS NOT NULL AND LEN(LTRIM(RTRIM([Reason])))>0))
);
GO

-- College-local listing discovery restriction. Existing applications and placements do not change.
CREATE TABLE [recruitment].[CollegeAvailability] (
  [CollegeId] uniqueidentifier NOT NULL,
  [ListingId] uniqueidentifier NOT NULL,
  [IsPaused] bit NOT NULL CONSTRAINT [DF_CollegeAvailability_IsPaused] DEFAULT (0),
  [UpdatedBy] uniqueidentifier NOT NULL,
  [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CollegeAvailability_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_CollegeAvailability] PRIMARY KEY ([CollegeId], [ListingId])
);
GO

-- Submitted application with immutable profile, CV, college requirement, and schedule snapshots.
CREATE TABLE [recruitment].[Application] (
  [ApplicationId] uniqueidentifier NOT NULL CONSTRAINT [DF_Application_ApplicationId] DEFAULT (NEWSEQUENTIALID()),
  [StudentId] uniqueidentifier NOT NULL,
  [CollegeId] uniqueidentifier NOT NULL,
  [CompanyId] uniqueidentifier NOT NULL,
  [ListingId] uniqueidentifier NOT NULL,
  [ListingVersion] int NOT NULL,
  [ProgramVersion] int NOT NULL,
  [RequiredHours] int NOT NULL,
  [MinimumWeeks] int NOT NULL,
  [MaximumWeeklyHours] int NULL,
  [CvVersionId] uniqueidentifier NULL,
  [ProfileName] nvarchar(160) NOT NULL,
  [ProfilePhone] nvarchar(30) NULL,
  [ProfileBio] nvarchar(3000) NULL,
  [Status] nvarchar(20) NOT NULL CONSTRAINT [DF_Application_Status] DEFAULT (N'Pending'),
  [SubmittedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Application_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
  [CompanyAcceptedAt] datetime2(3) NULL,
  [ClosedAt] datetime2(3) NULL,
  [ClosedReason] nvarchar(1000) NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Application] PRIMARY KEY ([ApplicationId]),
  CONSTRAINT [UQ_Application_PlacementScope] UNIQUE ([ApplicationId], [StudentId], [CollegeId], [CompanyId]),
  CONSTRAINT [CK_Application_Status] CHECK ([Status] IN (N'Pending', N'Accepted', N'Placed', N'Rejected', N'Withdrawn', N'Closed')),
  CONSTRAINT [CK_Application_Requirements] CHECK ([RequiredHours]>0 AND [MinimumWeeks] BETWEEN 1 AND 52 AND ([MaximumWeeklyHours] IS NULL OR [MaximumWeeklyHours] BETWEEN 1 AND 168))
);
GO

-- Submitted question wording and answer; later listing edits cannot change them.
CREATE TABLE [recruitment].[ApplicationAnswer] (
  [ApplicationId] uniqueidentifier NOT NULL,
  [Ordinal] int NOT NULL,
  [Question] nvarchar(300) NOT NULL,
  [Answer] nvarchar(3000) NOT NULL,
  CONSTRAINT [PK_ApplicationAnswer] PRIMARY KEY ([ApplicationId], [Ordinal]),
  CONSTRAINT [CK_ApplicationAnswer_Answer] CHECK ([Ordinal] BETWEEN 1 AND 10 AND LEN(LTRIM(RTRIM([Answer])))>0)
);
GO

-- Skills copied at submission time, independent of subsequent profile changes.
CREATE TABLE [recruitment].[ApplicationSkill] (
  [ApplicationId] uniqueidentifier NOT NULL,
  [Skill] nvarchar(40) NOT NULL,
  CONSTRAINT [PK_ApplicationSkill] PRIMARY KEY ([ApplicationId], [Skill])
);
GO

-- Agreed schedule snapshot copied when applying.
CREATE TABLE [recruitment].[ApplicationScheduleWeek] (
  [ApplicationId] uniqueidentifier NOT NULL,
  [WeekNumber] int NOT NULL,
  [Title] nvarchar(160) NOT NULL,
  [AllocatedHours] int NOT NULL,
  CONSTRAINT [PK_ApplicationScheduleWeek] PRIMARY KEY ([ApplicationId], [WeekNumber]),
  CONSTRAINT [CK_ApplicationScheduleWeek_Allocation] CHECK ([WeekNumber] BETWEEN 1 AND 52 AND [AllocatedHours] BETWEEN 1 AND 168)
);
GO

-- Append-only decisions, withdrawal, automatic closure and placement activation.
CREATE TABLE [recruitment].[ApplicationEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_ApplicationEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [ApplicationId] uniqueidentifier NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [Action] nvarchar(32) NOT NULL,
  [Reason] nvarchar(1000) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ApplicationEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ApplicationEvent] PRIMARY KEY ([EventId])
);
GO

-- Company interview identity owned by one application. Does not create a placement.
CREATE TABLE [recruitment].[Interview] (
  [InterviewId] uniqueidentifier NOT NULL CONSTRAINT [DF_Interview_InterviewId] DEFAULT (NEWSEQUENTIALID()),
  [ApplicationId] uniqueidentifier NOT NULL,
  [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_Interview_Status] DEFAULT (N'Requested'),
  [CurrentRevision] int NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Interview_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Interview] PRIMARY KEY ([InterviewId]),
  CONSTRAINT [UQ_Interview_Application] UNIQUE ([ApplicationId]),
  CONSTRAINT [CK_Interview_Status] CHECK ([Status] IN (N'Requested', N'Confirmed', N'Reschedule requested', N'Cancelled', N'Completed'))
);
GO

-- Immutable interview schedule and provider details. Online links are not converted to Zoom.
CREATE TABLE [recruitment].[InterviewRevision] (
  [InterviewId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [StartsAt] datetime2(3) NOT NULL,
  [DurationMinutes] int NOT NULL,
  [Mode] nvarchar(16) NOT NULL,
  [Location] nvarchar(300) NULL,
  [MeetingUrl] nvarchar(2048) NULL,
  [Preparation] nvarchar(1000) NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_InterviewRevision_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_InterviewRevision] PRIMARY KEY ([InterviewId], [RevisionNumber]),
  CONSTRAINT [CK_InterviewRevision_Mode] CHECK ([Mode] IN (N'Online', N'Phone', N'On site')),
  CONSTRAINT [CK_InterviewRevision_Duration] CHECK ([RevisionNumber]>0 AND [DurationMinutes] IN (15,30,45,60)),
  CONSTRAINT [CK_InterviewRevision_Location] CHECK (([Mode]=N'Online' AND [MeetingUrl] IS NOT NULL AND [MeetingUrl] LIKE N'https://%') OR ([Mode]<>N'Online' AND [Location] IS NOT NULL AND LEN(LTRIM(RTRIM([Location])))>0))
);
GO

-- Interview requests, revisions, student responses and closure history.
CREATE TABLE [recruitment].[InterviewEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_InterviewEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [InterviewId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [Action] nvarchar(32) NOT NULL,
  [Note] nvarchar(1000) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_InterviewEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_InterviewEvent] PRIMARY KEY ([EventId])
);
GO

-- Placement agreement and retained outcome. One active placement per student; every placement has a distinct application.
CREATE TABLE [training].[Placement] (
  [PlacementId] uniqueidentifier NOT NULL CONSTRAINT [DF_Placement_PlacementId] DEFAULT (NEWSEQUENTIALID()),
  [ApplicationId] uniqueidentifier NOT NULL,
  [StudentId] uniqueidentifier NOT NULL,
  [CollegeId] uniqueidentifier NOT NULL,
  [CompanyId] uniqueidentifier NOT NULL,
  [RoleTitle] nvarchar(160) NOT NULL,
  [RequiredHours] int NOT NULL,
  [MinimumWeeks] int NOT NULL,
  [MaximumWeeklyHours] int NULL,
  [StartDate] date NOT NULL,
  [EndDate] date NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Placement_Status] DEFAULT (N'Active'),
  [EndReason] nvarchar(1500) NULL,
  [ActivatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Placement_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Placement] PRIMARY KEY ([PlacementId]),
  CONSTRAINT [UQ_Placement_Application] UNIQUE ([ApplicationId]),
  CONSTRAINT [UQ_Placement_Scope] UNIQUE ([PlacementId], [StudentId], [CollegeId], [CompanyId]),
  CONSTRAINT [CK_Placement_Status] CHECK ([Status] IN (N'Active', N'Completed', N'Left')),
  CONSTRAINT [CK_Placement_Dates] CHECK (([EndDate] IS NULL OR [EndDate]>=[StartDate]) AND ([Status]=N'Active' OR [EndDate] IS NOT NULL)),
  CONSTRAINT [CK_Placement_Requirement] CHECK ([RequiredHours]>0 AND [MinimumWeeks] BETWEEN 1 AND 52 AND ([MaximumWeeklyHours] IS NULL OR [MaximumWeeklyHours] BETWEEN 1 AND 168))
);
GO

-- Agreed immutable week count and allocation, with a mutable work plan and report lifecycle.
CREATE TABLE [training].[PlacementWeek] (
  [WeekId] uniqueidentifier NOT NULL CONSTRAINT [DF_PlacementWeek_WeekId] DEFAULT (NEWSEQUENTIALID()),
  [PlacementId] uniqueidentifier NOT NULL,
  [WeekNumber] int NOT NULL,
  [AgreedTitle] nvarchar(160) NOT NULL,
  [AllocatedHours] int NOT NULL,
  [WorkTitle] nvarchar(160) NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_PlacementWeek_Status] DEFAULT (N'Draft'),
  [PlanRevision] int NOT NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_PlacementWeek] PRIMARY KEY ([WeekId]),
  CONSTRAINT [UQ_PlacementWeek_Ordinal] UNIQUE ([PlacementId], [WeekNumber]),
  CONSTRAINT [UQ_PlacementWeek_Scope] UNIQUE ([WeekId], [PlacementId]),
  CONSTRAINT [CK_PlacementWeek_Status] CHECK ([Status] IN (N'Draft', N'Submitted', N'Revision', N'Verified')),
  CONSTRAINT [CK_PlacementWeek_Allocation] CHECK ([WeekNumber] BETWEEN 1 AND 52 AND [AllocatedHours] BETWEEN 1 AND 168 AND [PlanRevision]>0)
);
GO

-- Historical work-title and objective-plan revisions. Allocation remains fixed.
CREATE TABLE [training].[WeekPlanRevision] (
  [WeekId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [WorkTitle] nvarchar(160) NOT NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_WeekPlanRevision_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_WeekPlanRevision] PRIMARY KEY ([WeekId], [RevisionNumber])
);
GO

-- Company-authored checklist outcome and evidence. Supervisor never scores objectives.
CREATE TABLE [training].[Objective] (
  [ObjectiveId] uniqueidentifier NOT NULL CONSTRAINT [DF_Objective_ObjectiveId] DEFAULT (NEWSEQUENTIALID()),
  [WeekId] uniqueidentifier NOT NULL,
  [Ordinal] int NOT NULL,
  [Text] nvarchar(500) NOT NULL,
  [IsComplete] bit NOT NULL CONSTRAINT [DF_Objective_IsComplete] DEFAULT (0),
  [Evidence] nvarchar(500) NULL,
  [RemovedAt] datetime2(3) NULL,
  [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Objective_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Objective] PRIMARY KEY ([ObjectiveId]),
  CONSTRAINT [UQ_Objective_Scope] UNIQUE ([ObjectiveId], [WeekId]),
  CONSTRAINT [CK_Objective_Ordinal] CHECK ([Ordinal]>0)
);
GO

-- Objective wording in each historical work-plan revision.
CREATE TABLE [training].[WeekPlanObjective] (
  [WeekId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [ObjectiveId] uniqueidentifier NOT NULL,
  [Ordinal] int NOT NULL,
  [Text] nvarchar(500) NOT NULL,
  CONSTRAINT [PK_WeekPlanObjective] PRIMARY KEY ([WeekId], [RevisionNumber], [ObjectiveId])
);
GO

-- Company assignment identity with retained removal history.
CREATE TABLE [training].[Task] (
  [TaskId] uniqueidentifier NOT NULL CONSTRAINT [DF_Task_TaskId] DEFAULT (NEWSEQUENTIALID()),
  [WeekId] uniqueidentifier NOT NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Task_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RemovedAt] datetime2(3) NULL,
  CONSTRAINT [PK_Task] PRIMARY KEY ([TaskId]),
  CONSTRAINT [UQ_Task_Scope] UNIQUE ([TaskId], [WeekId])
);
GO

-- Immutable assignment instructions used by each submitted work version.
CREATE TABLE [training].[TaskRevision] (
  [TaskId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [Title] nvarchar(120) NOT NULL,
  [Instructions] nvarchar(2000) NULL,
  [DueDate] date NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TaskRevision_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_TaskRevision] PRIMARY KEY ([TaskId], [RevisionNumber]),
  CONSTRAINT [CK_TaskRevision_Revision] CHECK ([RevisionNumber]>0)
);
GO

-- Company/student PDF reference, restricted to its task and owner.
CREATE TABLE [training].[TaskAttachment] (
  [AttachmentId] uniqueidentifier NOT NULL CONSTRAINT [DF_TaskAttachment_AttachmentId] DEFAULT (NEWSEQUENTIALID()),
  [TaskId] uniqueidentifier NOT NULL,
  [FileId] uniqueidentifier NOT NULL,
  [OwnerId] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TaskAttachment_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RemovedAt] datetime2(3) NULL,
  CONSTRAINT [PK_TaskAttachment] PRIMARY KEY ([AttachmentId]),
  CONSTRAINT [UQ_TaskAttachment_Scope] UNIQUE ([AttachmentId], [TaskId])
);
GO

-- Immutable student deliverable version referring to the instructions actually submitted against.
CREATE TABLE [training].[TaskSubmission] (
  [SubmissionId] uniqueidentifier NOT NULL CONSTRAINT [DF_TaskSubmission_SubmissionId] DEFAULT (NEWSEQUENTIALID()),
  [TaskId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [TaskRevision] int NOT NULL,
  [Description] nvarchar(3000) NULL,
  [WorkUrl] nvarchar(2048) NULL,
  [SubmittedBy] uniqueidentifier NOT NULL,
  [SubmittedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TaskSubmission_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_TaskSubmission] PRIMARY KEY ([SubmissionId]),
  CONSTRAINT [UQ_TaskSubmission_Version] UNIQUE ([TaskId], [VersionNumber]),
  CONSTRAINT [UQ_TaskSubmission_Scope] UNIQUE ([SubmissionId], [TaskId]),
  CONSTRAINT [CK_TaskSubmission_Version] CHECK ([VersionNumber]>0),
  CONSTRAINT [CK_TaskSubmission_Link] CHECK ([WorkUrl] IS NULL OR [WorkUrl] LIKE N'https://%' OR [WorkUrl] LIKE N'http://%')
);
GO

-- Immutable attachment references copied into a student submission.
CREATE TABLE [training].[SubmissionFile] (
  [SubmissionId] uniqueidentifier NOT NULL,
  [TaskId] uniqueidentifier NOT NULL,
  [AttachmentId] uniqueidentifier NOT NULL,
  CONSTRAINT [PK_SubmissionFile] PRIMARY KEY ([SubmissionId], [AttachmentId])
);
GO

-- Exactly one company review per submission. Revision requests require feedback.
CREATE TABLE [training].[TaskReview] (
  [SubmissionId] uniqueidentifier NOT NULL,
  [Outcome] nvarchar(24) NOT NULL,
  [Feedback] nvarchar(3000) NULL,
  [ReviewedBy] uniqueidentifier NOT NULL,
  [ReviewedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TaskReview_ReviewedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_TaskReview] PRIMARY KEY ([SubmissionId]),
  CONSTRAINT [CK_TaskReview_Outcome] CHECK ([Outcome] IN (N'Completed', N'Changes requested')),
  CONSTRAINT [CK_TaskReview_Feedback] CHECK ([Outcome]=N'Completed' OR ([Feedback] IS NOT NULL AND LEN(LTRIM(RTRIM([Feedback])))>0))
);
GO

-- Immutable company report submission; each revision is another report version.
CREATE TABLE [training].[WeeklyReport] (
  [ReportId] uniqueidentifier NOT NULL CONSTRAINT [DF_WeeklyReport_ReportId] DEFAULT (NEWSEQUENTIALID()),
  [WeekId] uniqueidentifier NOT NULL,
  [SubmissionNumber] int NOT NULL,
  [PlanRevision] int NOT NULL,
  [ReportedHours] int NOT NULL,
  [CompanyFeedback] nvarchar(3000) NOT NULL,
  [SubmittedBy] uniqueidentifier NOT NULL,
  [SubmittedAt] datetime2(3) NOT NULL CONSTRAINT [DF_WeeklyReport_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_WeeklyReport] PRIMARY KEY ([ReportId]),
  CONSTRAINT [UQ_WeeklyReport_Version] UNIQUE ([WeekId], [SubmissionNumber]),
  CONSTRAINT [UQ_WeeklyReport_Scope] UNIQUE ([ReportId], [WeekId]),
  CONSTRAINT [CK_WeeklyReport_Content] CHECK ([SubmissionNumber]>0 AND [ReportedHours] BETWEEN 1 AND 168 AND LEN(LTRIM(RTRIM([CompanyFeedback])))>0)
);
GO

-- Company objective result and wording captured when submitting a weekly report.
CREATE TABLE [training].[ReportObjective] (
  [ReportId] uniqueidentifier NOT NULL,
  [ObjectiveId] uniqueidentifier NOT NULL,
  [WeekId] uniqueidentifier NOT NULL,
  [Text] nvarchar(500) NOT NULL,
  [IsComplete] bit NOT NULL CONSTRAINT [DF_ReportObjective_IsComplete] DEFAULT (0),
  [Evidence] nvarchar(500) NULL,
  CONSTRAINT [PK_ReportObjective] PRIMARY KEY ([ReportId], [ObjectiveId])
);
GO

-- Assigned-supervisor review of a company report, without independent ratings.
CREATE TABLE [training].[ReportReview] (
  [ReportId] uniqueidentifier NOT NULL,
  [SupervisorId] uniqueidentifier NOT NULL,
  [Decision] nvarchar(20) NOT NULL,
  [Notes] nvarchar(3000) NULL,
  [ReviewedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ReportReview_ReviewedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ReportReview] PRIMARY KEY ([ReportId]),
  CONSTRAINT [CK_ReportReview_Decision] CHECK ([Decision] IN (N'Verified', N'Revision requested')),
  CONSTRAINT [CK_ReportReview_Reason] CHECK ([Decision]=N'Verified' OR ([Notes] IS NOT NULL AND LEN(LTRIM(RTRIM([Notes])))>0))
);
GO

-- Exactly one verified allocation per placement week. Attendance never writes this ledger.
CREATE TABLE [training].[HourVerification] (
  [WeekId] uniqueidentifier NOT NULL,
  [ReportId] uniqueidentifier NOT NULL,
  [VerifiedHours] int NOT NULL,
  [VerifiedAt] datetime2(3) NOT NULL CONSTRAINT [DF_HourVerification_VerifiedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_HourVerification] PRIMARY KEY ([WeekId]),
  CONSTRAINT [UQ_HourVerification_Report] UNIQUE ([ReportId]),
  CONSTRAINT [CK_HourVerification_Hours] CHECK ([VerifiedHours] BETWEEN 1 AND 168)
);
GO

-- One supervisor-wide student report visibility policy, covering all assigned students and future weeks.
CREATE TABLE [training].[ReportVisibility] (
  [SupervisorId] uniqueidentifier NOT NULL,
  [IsRestricted] bit NOT NULL CONSTRAINT [DF_ReportVisibility_IsRestricted] DEFAULT (0),
  [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ReportVisibility_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ReportVisibility] PRIMARY KEY ([SupervisorId])
);
GO

-- Versioned final company evaluation, retained for its original placement.
CREATE TABLE [training].[CompanyEvaluation] (
  [EvaluationId] uniqueidentifier NOT NULL CONSTRAINT [DF_CompanyEvaluation_EvaluationId] DEFAULT (NEWSEQUENTIALID()),
  [PlacementId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Comments] nvarchar(3000) NULL,
  [SubmittedBy] uniqueidentifier NOT NULL,
  [SubmittedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CompanyEvaluation_SubmittedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_CompanyEvaluation] PRIMARY KEY ([EvaluationId]),
  CONSTRAINT [UQ_CompanyEvaluation_Version] UNIQUE ([PlacementId], [VersionNumber]),
  CONSTRAINT [UQ_CompanyEvaluation_Scope] UNIQUE ([EvaluationId], [PlacementId])
);
GO

-- Eight company-authored rubric scores. Attendance is an evaluation criterion, not QR-derived hour credit.
CREATE TABLE [training].[CompanyEvaluationScore] (
  [EvaluationId] uniqueidentifier NOT NULL,
  [Criterion] tinyint NOT NULL,
  [Score] tinyint NOT NULL,
  CONSTRAINT [PK_CompanyEvaluationScore] PRIMARY KEY ([EvaluationId], [Criterion]),
  CONSTRAINT [CK_CompanyEvaluationScore_Rubric] CHECK ([Criterion] BETWEEN 1 AND 8 AND [Score] BETWEEN 1 AND 5)
);
GO

-- Separate supervisor assessment bound to a particular company evaluation and placement.
CREATE TABLE [training].[AcademicAssessment] (
  [AssessmentId] uniqueidentifier NOT NULL CONSTRAINT [DF_AcademicAssessment_AssessmentId] DEFAULT (NEWSEQUENTIALID()),
  [PlacementId] uniqueidentifier NOT NULL,
  [EvaluationId] uniqueidentifier NOT NULL,
  [SupervisorId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Notes] nvarchar(3000) NOT NULL,
  [ForwardedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicAssessment_ForwardedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_AcademicAssessment] PRIMARY KEY ([AssessmentId]),
  CONSTRAINT [UQ_AcademicAssessment_Version] UNIQUE ([PlacementId], [VersionNumber]),
  CONSTRAINT [UQ_AcademicAssessment_Scope] UNIQUE ([AssessmentId], [PlacementId], [EvaluationId]),
  CONSTRAINT [CK_AcademicAssessment_Notes] CHECK (([Notes] IS NOT NULL AND LEN(LTRIM(RTRIM([Notes])))>0))
);
GO

-- Three academic outcomes, never company objective scores.
CREATE TABLE [training].[AcademicCriterion] (
  [AssessmentId] uniqueidentifier NOT NULL,
  [Criterion] tinyint NOT NULL,
  [Outcome] nvarchar(24) NOT NULL,
  CONSTRAINT [PK_AcademicCriterion] PRIMARY KEY ([AssessmentId], [Criterion]),
  CONSTRAINT [CK_AcademicCriterion_Outcome] CHECK ([Outcome] IN (N'Meets requirements', N'Needs follow-up')),
  CONSTRAINT [CK_AcademicCriterion_Criterion] CHECK ([Criterion] BETWEEN 1 AND 3)
);
GO

-- College confirmation after all report, hours, task, company and academic gates pass.
CREATE TABLE [training].[CompletionApproval] (
  [PlacementId] uniqueidentifier NOT NULL,
  [EvaluationId] uniqueidentifier NOT NULL,
  [AssessmentId] uniqueidentifier NOT NULL,
  [ApprovedBy] uniqueidentifier NOT NULL,
  [ApprovedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CompletionApproval_ApprovedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_CompletionApproval] PRIMARY KEY ([PlacementId])
);
GO

-- Immutable issued certificate identity and display snapshot. Prior placements retain their own certificate.
CREATE TABLE [training].[Certificate] (
  [CertificateId] uniqueidentifier NOT NULL CONSTRAINT [DF_Certificate_CertificateId] DEFAULT (NEWSEQUENTIALID()),
  [PlacementId] uniqueidentifier NOT NULL,
  [SerialNumber] nvarchar(40) NOT NULL,
  [StudentName] nvarchar(160) NOT NULL,
  [StudentNumber] nvarchar(40) NOT NULL,
  [CollegeName] nvarchar(200) NOT NULL,
  [CompanyName] nvarchar(200) NOT NULL,
  [RoleTitle] nvarchar(160) NOT NULL,
  [StartDate] date NOT NULL,
  [EndDate] date NOT NULL,
  [VerifiedHours] int NOT NULL,
  [IssuedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Certificate_IssuedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Certificate] PRIMARY KEY ([CertificateId]),
  CONSTRAINT [UQ_Certificate_Placement] UNIQUE ([PlacementId]),
  CONSTRAINT [UQ_Certificate_Serial] UNIQUE ([SerialNumber]),
  CONSTRAINT [CK_Certificate_Content] CHECK ([VerifiedHours]>0 AND [EndDate]>=[StartDate])
);
GO

-- Opaque attendance session. Individual codes bind to a placement; shared codes bind to a company and training date.
CREATE TABLE [attendance].[QrSession] (
  [SessionId] uniqueidentifier NOT NULL CONSTRAINT [DF_QrSession_SessionId] DEFAULT (NEWSEQUENTIALID()),
  [CompanyId] uniqueidentifier NOT NULL,
  [PlacementId] uniqueidentifier NULL,
  [Kind] nvarchar(16) NOT NULL,
  [Action] nvarchar(16) NOT NULL,
  [TrainingDate] date NOT NULL,
  [TokenHash] binary(32) NOT NULL,
  [IssuedAt] datetime2(3) NOT NULL,
  [ExpiresAt] datetime2(3) NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_QrSession_Status] DEFAULT (N'Open'),
  [IssuedBy] uniqueidentifier NOT NULL,
  CONSTRAINT [PK_QrSession] PRIMARY KEY ([SessionId]),
  CONSTRAINT [UQ_QrSession_TokenHash] UNIQUE ([TokenHash]),
  CONSTRAINT [CK_QrSession_Kind] CHECK ([Kind] IN (N'Individual', N'Shared')),
  CONSTRAINT [CK_QrSession_Action] CHECK ([Action] IN (N'CheckIn', N'CheckOut')),
  CONSTRAINT [CK_QrSession_Status] CHECK ([Status] IN (N'Open', N'Consumed', N'Closed', N'Replaced')),
  CONSTRAINT [CK_QrSession_Expiry] CHECK (DATEDIFF_BIG(millisecond,[IssuedAt],[ExpiresAt])=120000),
  CONSTRAINT [CK_QrSession_Binding] CHECK (([Kind]=N'Individual' AND [PlacementId] IS NOT NULL) OR ([Kind]=N'Shared' AND [PlacementId] IS NULL))
);
GO

-- One record per placement and Amman calendar date. Missing rows mean Not recorded, never automatically absent.
CREATE TABLE [attendance].[AttendanceRecord] (
  [RecordId] uniqueidentifier NOT NULL CONSTRAINT [DF_AttendanceRecord_RecordId] DEFAULT (NEWSEQUENTIALID()),
  [PlacementId] uniqueidentifier NOT NULL,
  [TrainingDate] date NOT NULL,
  [Status] nvarchar(16) NOT NULL,
  [CheckInAt] datetime2(3) NULL,
  [CheckOutAt] datetime2(3) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AttendanceRecord_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_AttendanceRecord] PRIMARY KEY ([RecordId]),
  CONSTRAINT [UQ_AttendanceRecord_Day] UNIQUE ([PlacementId], [TrainingDate]),
  CONSTRAINT [UQ_AttendanceRecord_Placement] UNIQUE ([RecordId], [PlacementId]),
  CONSTRAINT [CK_AttendanceRecord_Status] CHECK ([Status] IN (N'Present', N'Absent', N'Excused')),
  CONSTRAINT [CK_AttendanceRecord_Times] CHECK ([CheckOutAt] IS NULL OR ([CheckInAt] IS NOT NULL AND [CheckOutAt]>=[CheckInAt]))
);
GO

-- Successful session consumption per placement, preventing shared-code replay for the same participant.
CREATE TABLE [attendance].[QrRedemption] (
  [SessionId] uniqueidentifier NOT NULL,
  [PlacementId] uniqueidentifier NOT NULL,
  [RecordId] uniqueidentifier NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [RedeemedAt] datetime2(3) NOT NULL CONSTRAINT [DF_QrRedemption_RedeemedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_QrRedemption] PRIMARY KEY ([SessionId], [PlacementId])
);
GO

-- Append-only scans and manual corrections. Original timestamps are retained after corrections.
CREATE TABLE [attendance].[AttendanceEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_AttendanceEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [RecordId] uniqueidentifier NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [Action] nvarchar(20) NOT NULL,
  [BeforeStatus] nvarchar(16) NULL,
  [AfterStatus] nvarchar(16) NOT NULL,
  [Reason] nvarchar(1000) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AttendanceEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_AttendanceEvent] PRIMARY KEY ([EventId]),
  CONSTRAINT [CK_AttendanceEvent_Action] CHECK ([Action] IN (N'CheckIn', N'CheckOut', N'Correction')),
  CONSTRAINT [CK_AttendanceEvent_Reason] CHECK ([Action]<>N'Correction' OR ([Reason] IS NOT NULL AND LEN(LTRIM(RTRIM([Reason])))>0))
);
GO

-- Student correction concern, resolved explicitly by a host-company correction.
CREATE TABLE [attendance].[CorrectionRequest] (
  [RequestId] uniqueidentifier NOT NULL CONSTRAINT [DF_CorrectionRequest_RequestId] DEFAULT (NEWSEQUENTIALID()),
  [RecordId] uniqueidentifier NOT NULL,
  [StudentId] uniqueidentifier NOT NULL,
  [Reason] nvarchar(1000) NOT NULL,
  [RequestedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CorrectionRequest_RequestedAt] DEFAULT (SYSUTCDATETIME()),
  [ResolvedAt] datetime2(3) NULL,
  [ResolvedBy] uniqueidentifier NULL,
  CONSTRAINT [PK_CorrectionRequest] PRIMARY KEY ([RequestId]),
  CONSTRAINT [CK_CorrectionRequest_Reason] CHECK (([Reason] IS NOT NULL AND LEN(LTRIM(RTRIM([Reason])))>0))
);
GO

-- Private academic request bound to its original assignment. Reassignment does not transfer old links.
CREATE TABLE [meetings].[AcademicMeeting] (
  [MeetingId] uniqueidentifier NOT NULL CONSTRAINT [DF_AcademicMeeting_MeetingId] DEFAULT (NEWSEQUENTIALID()),
  [AssignmentId] uniqueidentifier NOT NULL,
  [StudentId] uniqueidentifier NOT NULL,
  [SupervisorId] uniqueidentifier NOT NULL,
  [CollegeId] uniqueidentifier NOT NULL,
  [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_AcademicMeeting_Status] DEFAULT (N'Requested'),
  [CurrentRevision] int NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicMeeting_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_AcademicMeeting] PRIMARY KEY ([MeetingId]),
  CONSTRAINT [CK_AcademicMeeting_Status] CHECK ([Status] IN (N'Requested', N'Confirmed', N'Reschedule requested', N'Cancelled', N'Completed'))
);
GO

-- Immutable supplied Zoom link and UTC meeting schedule; the application never fabricates a room.
CREATE TABLE [meetings].[AcademicMeetingRevision] (
  [MeetingId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [Title] nvarchar(120) NOT NULL,
  [StartsAt] datetime2(3) NOT NULL,
  [DurationMinutes] int NOT NULL,
  [ZoomUrl] nvarchar(2048) NOT NULL,
  [Agenda] nvarchar(2000) NULL,
  [CreatedBy] uniqueidentifier NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicMeetingRevision_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_AcademicMeetingRevision] PRIMARY KEY ([MeetingId], [RevisionNumber]),
  CONSTRAINT [CK_AcademicMeetingRevision_Duration] CHECK ([RevisionNumber]>0 AND [DurationMinutes] IN (15,30,45,60,90)),
  CONSTRAINT [CK_AcademicMeetingRevision_Https] CHECK ([ZoomUrl] LIKE N'https://%')
);
GO

-- Request, revision, student response, cancellation and explicit completion history.
CREATE TABLE [meetings].[AcademicMeetingEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_AcademicMeetingEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [MeetingId] uniqueidentifier NOT NULL,
  [RevisionNumber] int NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [Action] nvarchar(32) NOT NULL,
  [Note] nvarchar(1000) NULL,
  [AlternativeStartsAt] datetime2(3) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AcademicMeetingEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_AcademicMeetingEvent] PRIMARY KEY ([EventId])
);
GO

-- Routed support conversation. Unassigned student tickets wait for assignment while remaining In progress.
CREATE TABLE [support].[Ticket] (
  [TicketId] uniqueidentifier NOT NULL CONSTRAINT [DF_Ticket_TicketId] DEFAULT (NEWSEQUENTIALID()),
  [RequesterId] uniqueidentifier NOT NULL,
  [Subject] nvarchar(120) NOT NULL,
  [Category] nvarchar(40) NOT NULL,
  [Priority] nvarchar(16) NOT NULL CONSTRAINT [DF_Ticket_Priority] DEFAULT (N'Normal'),
  [Context] nvarchar(180) NULL,
  [PlacementId] uniqueidentifier NULL,
  [ListingId] uniqueidentifier NULL,
  [WeekId] uniqueidentifier NULL,
  [RecipientRole] nvarchar(20) NOT NULL,
  [RecipientOrganizationId] uniqueidentifier NULL,
  [RecipientSupervisorId] uniqueidentifier NULL,
  [Status] nvarchar(24) NOT NULL CONSTRAINT [DF_Ticket_Status] DEFAULT (N'In progress'),
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Ticket_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [UpdatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Ticket_UpdatedAt] DEFAULT (SYSUTCDATETIME()),
  [ResolvedAt] datetime2(3) NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Ticket] PRIMARY KEY ([TicketId]),
  CONSTRAINT [CK_Ticket_Status] CHECK ([Status] IN (N'In progress', N'Awaiting requester', N'Resolved')),
  CONSTRAINT [CK_Ticket_Priority] CHECK ([Priority] IN (N'Normal')),
  CONSTRAINT [CK_Ticket_RecipientRole] CHECK ([RecipientRole] IN (N'PlatformAdmin', N'CollegeAdmin', N'Supervisor')),
  CONSTRAINT [CK_Ticket_Resolution] CHECK (([Status]=N'Resolved' AND [ResolvedAt] IS NOT NULL) OR ([Status]<>N'Resolved' AND [ResolvedAt] IS NULL))
);
GO

-- Immutable requester or receiving-handler message.
CREATE TABLE [support].[TicketMessage] (
  [MessageId] uniqueidentifier NOT NULL CONSTRAINT [DF_TicketMessage_MessageId] DEFAULT (NEWSEQUENTIALID()),
  [MessageNumber] bigint IDENTITY(1,1) NOT NULL,
  [TicketId] uniqueidentifier NOT NULL,
  [SenderId] uniqueidentifier NOT NULL,
  [Body] nvarchar(3000) NOT NULL,
  [SentAt] datetime2(3) NOT NULL CONSTRAINT [DF_TicketMessage_SentAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_TicketMessage] PRIMARY KEY ([MessageId]),
  CONSTRAINT [UQ_TicketMessage_Sequence] UNIQUE ([MessageNumber]),
  CONSTRAINT [CK_TicketMessage_Body] CHECK (LEN(LTRIM(RTRIM([Body])))>0)
);
GO

-- Routing and status history, including assignment handoff and explicit resolution.
CREATE TABLE [support].[TicketEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_TicketEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [TicketId] uniqueidentifier NOT NULL,
  [ActorId] uniqueidentifier NOT NULL,
  [Action] nvarchar(32) NOT NULL,
  [FromStatus] nvarchar(24) NULL,
  [ToStatus] nvarchar(24) NOT NULL,
  [RecipientSupervisorId] uniqueidentifier NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_TicketEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_TicketEvent] PRIMARY KEY ([EventId])
);
GO

-- Planned course catalogue identity. No enrolments or purchases are fabricated.
CREATE TABLE [learning].[Course] (
  [CourseId] uniqueidentifier NOT NULL CONSTRAINT [DF_Course_CourseId] DEFAULT (NEWSEQUENTIALID()),
  [Slug] nvarchar(100) NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Course_Status] DEFAULT (N'Draft'),
  [CurrentVersion] int NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Course_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Course] PRIMARY KEY ([CourseId]),
  CONSTRAINT [UQ_Course_Slug] UNIQUE ([Slug]),
  CONSTRAINT [CK_Course_Status] CHECK ([Status] IN (N'Draft', N'Published', N'Retired'))
);
GO

-- Immutable course title and outline used by purchased entitlements.
CREATE TABLE [learning].[CourseVersion] (
  [CourseId] uniqueidentifier NOT NULL,
  [VersionNumber] int NOT NULL,
  [Title] nvarchar(160) NOT NULL,
  [Category] nvarchar(100) NOT NULL,
  [Description] nvarchar(4000) NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CourseVersion_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_CourseVersion] PRIMARY KEY ([CourseId], [VersionNumber])
);
GO

-- Ordered lessons in an immutable course version.
CREATE TABLE [learning].[Lesson] (
  [LessonId] uniqueidentifier NOT NULL CONSTRAINT [DF_Lesson_LessonId] DEFAULT (NEWSEQUENTIALID()),
  [CourseId] uniqueidentifier NOT NULL,
  [CourseVersion] int NOT NULL,
  [Ordinal] int NOT NULL,
  [Title] nvarchar(160) NOT NULL,
  [Summary] nvarchar(2000) NOT NULL,
  [ContentFileId] uniqueidentifier NULL,
  CONSTRAINT [PK_Lesson] PRIMARY KEY ([LessonId]),
  CONSTRAINT [UQ_Lesson_Ordinal] UNIQUE ([CourseId], [CourseVersion], [Ordinal]),
  CONSTRAINT [UQ_Lesson_Scope] UNIQUE ([LessonId], [CourseId], [CourseVersion]),
  CONSTRAINT [CK_Lesson_Ordinal] CHECK ([Ordinal]>0)
);
GO

-- Planned one-time individual-course or bundle offer. No subscriptions are assumed.
CREATE TABLE [commerce].[Product] (
  [ProductId] uniqueidentifier NOT NULL CONSTRAINT [DF_Product_ProductId] DEFAULT (NEWSEQUENTIALID()),
  [Kind] nvarchar(16) NOT NULL,
  [Title] nvarchar(160) NOT NULL,
  [Price] decimal(19,4) NOT NULL,
  [Currency] char(3) NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Product_Status] DEFAULT (N'Draft'),
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Product_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Product] PRIMARY KEY ([ProductId]),
  CONSTRAINT [CK_Product_Kind] CHECK ([Kind] IN (N'Course', N'Bundle')),
  CONSTRAINT [CK_Product_Status] CHECK ([Status] IN (N'Draft', N'Active', N'Retired')),
  CONSTRAINT [CK_Product_Price] CHECK ([Price]>=0 AND [Currency] COLLATE Latin1_General_100_BIN2 LIKE '[A-Z][A-Z][A-Z]')
);
GO

-- Courses and exact versions offered by a product. Bundle contents are copied into each order.
CREATE TABLE [commerce].[ProductCourse] (
  [ProductId] uniqueidentifier NOT NULL,
  [CourseId] uniqueidentifier NOT NULL,
  [CourseVersion] int NOT NULL,
  CONSTRAINT [PK_ProductCourse] PRIMARY KEY ([ProductId], [CourseId])
);
GO

-- Planned one-time checkout with currency and immutable quoted total; no card data.
CREATE TABLE [commerce].[PurchaseOrder] (
  [OrderId] uniqueidentifier NOT NULL CONSTRAINT [DF_PurchaseOrder_OrderId] DEFAULT (NEWSEQUENTIALID()),
  [BuyerId] uniqueidentifier NOT NULL,
  [Status] nvarchar(20) NOT NULL CONSTRAINT [DF_PurchaseOrder_Status] DEFAULT (N'Pending'),
  [Currency] char(3) NOT NULL,
  [TotalAmount] decimal(19,4) NOT NULL,
  [CheckoutKey] nvarchar(100) NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PurchaseOrder_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [PaidAt] datetime2(3) NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_PurchaseOrder] PRIMARY KEY ([OrderId]),
  CONSTRAINT [UQ_PurchaseOrder_Checkout] UNIQUE ([BuyerId], [CheckoutKey]),
  CONSTRAINT [CK_PurchaseOrder_Status] CHECK ([Status] IN (N'Pending', N'Paid', N'Cancelled', N'Refunded', N'Partially refunded')),
  CONSTRAINT [CK_PurchaseOrder_Total] CHECK ([TotalAmount]>=0)
);
GO

-- Immutable product-title and price snapshot at checkout. Quantity is one for digital course access.
CREATE TABLE [commerce].[OrderItem] (
  [OrderItemId] uniqueidentifier NOT NULL CONSTRAINT [DF_OrderItem_OrderItemId] DEFAULT (NEWSEQUENTIALID()),
  [OrderId] uniqueidentifier NOT NULL,
  [ProductId] uniqueidentifier NOT NULL,
  [ProductTitle] nvarchar(160) NOT NULL,
  [UnitPrice] decimal(19,4) NOT NULL,
  CONSTRAINT [PK_OrderItem] PRIMARY KEY ([OrderItemId]),
  CONSTRAINT [UQ_OrderItem_Product] UNIQUE ([OrderId], [ProductId]),
  CONSTRAINT [CK_OrderItem_Price] CHECK ([UnitPrice]>=0)
);
GO

-- Immutable purchased bundle composition and entitled course version.
CREATE TABLE [commerce].[OrderItemCourse] (
  [OrderItemId] uniqueidentifier NOT NULL,
  [CourseId] uniqueidentifier NOT NULL,
  [CourseVersion] int NOT NULL,
  CONSTRAINT [PK_OrderItemCourse] PRIMARY KEY ([OrderItemId], [CourseId]),
  CONSTRAINT [UQ_OrderItemCourse_VersionScope] UNIQUE ([OrderItemId], [CourseId], [CourseVersion])
);
GO

-- Provider-referenced payment attempt. Secrets and payment-card details do not belong here.
CREATE TABLE [commerce].[Payment] (
  [PaymentId] uniqueidentifier NOT NULL CONSTRAINT [DF_Payment_PaymentId] DEFAULT (NEWSEQUENTIALID()),
  [OrderId] uniqueidentifier NOT NULL,
  [Provider] nvarchar(40) NOT NULL,
  [ProviderPaymentId] nvarchar(160) NOT NULL,
  [Status] nvarchar(20) NOT NULL CONSTRAINT [DF_Payment_Status] DEFAULT (N'Pending'),
  [Amount] decimal(19,4) NOT NULL,
  [Currency] char(3) NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Payment_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [ConfirmedAt] datetime2(3) NULL,
  CONSTRAINT [PK_Payment] PRIMARY KEY ([PaymentId]),
  CONSTRAINT [UQ_Payment_Provider] UNIQUE ([Provider], [ProviderPaymentId]),
  CONSTRAINT [CK_Payment_Status] CHECK ([Status] IN (N'Pending', N'Succeeded', N'Failed')),
  CONSTRAINT [CK_Payment_Amount] CHECK ([Amount]>=0)
);
GO

-- Idempotent provider callback reference. Signature verification belongs to the future backend.
CREATE TABLE [commerce].[PaymentEvent] (
  [EventId] uniqueidentifier NOT NULL CONSTRAINT [DF_PaymentEvent_EventId] DEFAULT (NEWSEQUENTIALID()),
  [PaymentId] uniqueidentifier NOT NULL,
  [Provider] nvarchar(40) NOT NULL,
  [ProviderEventId] nvarchar(160) NOT NULL,
  [EventType] nvarchar(80) NOT NULL,
  [ReceivedAt] datetime2(3) NOT NULL CONSTRAINT [DF_PaymentEvent_ReceivedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_PaymentEvent] PRIMARY KEY ([EventId]),
  CONSTRAINT [UQ_PaymentEvent_ProviderEvent] UNIQUE ([Provider], [ProviderEventId])
);
GO

-- Provider-referenced partial or full refund, retained independently of the original payment.
CREATE TABLE [commerce].[Refund] (
  [RefundId] uniqueidentifier NOT NULL CONSTRAINT [DF_Refund_RefundId] DEFAULT (NEWSEQUENTIALID()),
  [PaymentId] uniqueidentifier NOT NULL,
  [ProviderRefundId] nvarchar(160) NOT NULL,
  [Amount] decimal(19,4) NOT NULL,
  [Reason] nvarchar(1000) NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Refund_Status] DEFAULT (N'Pending'),
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Refund_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_Refund] PRIMARY KEY ([RefundId]),
  CONSTRAINT [UQ_Refund_ProviderReference] UNIQUE ([PaymentId], [ProviderRefundId]),
  CONSTRAINT [CK_Refund_Status] CHECK ([Status] IN (N'Pending', N'Succeeded', N'Failed')),
  CONSTRAINT [CK_Refund_Amount] CHECK ([Amount]>0)
);
GO

-- Planned access entitlement granted by a verified paid order; revocation is explicit.
CREATE TABLE [learning].[Enrollment] (
  [EnrollmentId] uniqueidentifier NOT NULL CONSTRAINT [DF_Enrollment_EnrollmentId] DEFAULT (NEWSEQUENTIALID()),
  [StudentId] uniqueidentifier NOT NULL,
  [CourseId] uniqueidentifier NOT NULL,
  [CourseVersion] int NOT NULL,
  [OrderItemId] uniqueidentifier NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Enrollment_Status] DEFAULT (N'Active'),
  [GrantedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Enrollment_GrantedAt] DEFAULT (SYSUTCDATETIME()),
  [RevokedAt] datetime2(3) NULL,
  [RevocationReason] nvarchar(1000) NULL,
  CONSTRAINT [PK_Enrollment] PRIMARY KEY ([EnrollmentId]),
  CONSTRAINT [UQ_Enrollment_Scope] UNIQUE ([EnrollmentId], [CourseId], [CourseVersion]),
  CONSTRAINT [UQ_Enrollment_Source] UNIQUE ([StudentId], [OrderItemId], [CourseId]),
  CONSTRAINT [CK_Enrollment_Status] CHECK ([Status] IN (N'Active', N'Completed', N'Revoked'))
);
GO

-- Planned progress against the enrolled course version; never contributes internship hours.
CREATE TABLE [learning].[LessonProgress] (
  [EnrollmentId] uniqueidentifier NOT NULL,
  [CourseId] uniqueidentifier NOT NULL,
  [CourseVersion] int NOT NULL,
  [LessonId] uniqueidentifier NOT NULL,
  [CompletedAt] datetime2(3) NOT NULL CONSTRAINT [DF_LessonProgress_CompletedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_LessonProgress] PRIMARY KEY ([EnrollmentId], [LessonId])
);
GO

-- Planned AI matching model/configuration version. No provider keys are stored.
CREATE TABLE [ai].[ModelVersion] (
  [ModelVersionId] uniqueidentifier NOT NULL CONSTRAINT [DF_ModelVersion_ModelVersionId] DEFAULT (NEWSEQUENTIALID()),
  [Provider] nvarchar(80) NOT NULL,
  [ModelName] nvarchar(160) NOT NULL,
  [ModelVersion] nvarchar(100) NOT NULL,
  [PromptVersion] nvarchar(100) NOT NULL,
  [Configuration] nvarchar(4000) NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_ModelVersion_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_ModelVersion] PRIMARY KEY ([ModelVersionId]),
  CONSTRAINT [UQ_ModelVersion_Version] UNIQUE ([Provider], [ModelName], [ModelVersion], [PromptVersion]),
  CONSTRAINT [CK_ModelVersion_Json] CHECK ([Configuration] IS NULL OR ISJSON([Configuration])=1)
);
GO

-- Planned asynchronous CV-to-role fit job pinned to exact CV, listing, and model versions.
CREATE TABLE [ai].[CvMatchRun] (
  [RunId] uniqueidentifier NOT NULL CONSTRAINT [DF_CvMatchRun_RunId] DEFAULT (NEWSEQUENTIALID()),
  [StudentId] uniqueidentifier NOT NULL,
  [CvVersionId] uniqueidentifier NOT NULL,
  [ListingId] uniqueidentifier NOT NULL,
  [ListingVersion] int NOT NULL,
  [ModelVersionId] uniqueidentifier NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_CvMatchRun_Status] DEFAULT (N'Pending'),
  [RequestKey] nvarchar(100) NOT NULL,
  [FailureReason] nvarchar(1000) NULL,
  [RequestedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CvMatchRun_RequestedAt] DEFAULT (SYSUTCDATETIME()),
  [StartedAt] datetime2(3) NULL,
  [FinishedAt] datetime2(3) NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_CvMatchRun] PRIMARY KEY ([RunId]),
  CONSTRAINT [UQ_CvMatchRun_Request] UNIQUE ([StudentId], [RequestKey]),
  CONSTRAINT [CK_CvMatchRun_Status] CHECK ([Status] IN (N'Pending', N'Running', N'Succeeded', N'Failed', N'Cancelled'))
);
GO

-- Planned actual model output: role fit, never hiring probability. No fabricated scores or Why this match feature.
CREATE TABLE [ai].[CvMatchResult] (
  [RunId] uniqueidentifier NOT NULL,
  [RoleFitScore] decimal(5,2) NOT NULL,
  [Summary] nvarchar(3000) NULL,
  [AnalyzedAt] datetime2(3) NOT NULL CONSTRAINT [DF_CvMatchResult_AnalyzedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_CvMatchResult] PRIMARY KEY ([RunId]),
  CONSTRAINT [CK_CvMatchResult_Score] CHECK ([RoleFitScore] BETWEEN 0 AND 100)
);
GO

-- Planned per-recipient notification queue. Queuing never proves an invitation or message was delivered.
CREATE TABLE [notifications].[Notification] (
  [NotificationId] uniqueidentifier NOT NULL CONSTRAINT [DF_Notification_NotificationId] DEFAULT (NEWSEQUENTIALID()),
  [RecipientId] uniqueidentifier NOT NULL,
  [Channel] nvarchar(16) NOT NULL,
  [TemplateKey] nvarchar(100) NOT NULL,
  [Subject] nvarchar(200) NOT NULL,
  [Body] nvarchar(4000) NOT NULL,
  [Status] nvarchar(16) NOT NULL CONSTRAINT [DF_Notification_Status] DEFAULT (N'Pending'),
  [IdempotencyKey] nvarchar(160) NOT NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_Notification_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  [ReadAt] datetime2(3) NULL,
  [RowVersion] rowversion NOT NULL,
  CONSTRAINT [PK_Notification] PRIMARY KEY ([NotificationId]),
  CONSTRAINT [UQ_Notification_Idempotency] UNIQUE ([RecipientId], [Channel], [IdempotencyKey]),
  CONSTRAINT [CK_Notification_Channel] CHECK ([Channel] IN (N'InApp', N'Email')),
  CONSTRAINT [CK_Notification_Status] CHECK ([Status] IN (N'Pending', N'Attempted', N'Delivered', N'Failed', N'Cancelled'))
);
GO

-- Planned actual dispatch attempt and provider outcome, distinct from notification creation.
CREATE TABLE [notifications].[DeliveryAttempt] (
  [AttemptId] uniqueidentifier NOT NULL CONSTRAINT [DF_DeliveryAttempt_AttemptId] DEFAULT (NEWSEQUENTIALID()),
  [NotificationId] uniqueidentifier NOT NULL,
  [AttemptNumber] int NOT NULL,
  [Provider] nvarchar(80) NOT NULL,
  [ProviderMessageId] nvarchar(160) NULL,
  [Status] nvarchar(16) NOT NULL,
  [FailureReason] nvarchar(1000) NULL,
  [AttemptedAt] datetime2(3) NOT NULL CONSTRAINT [DF_DeliveryAttempt_AttemptedAt] DEFAULT (SYSUTCDATETIME()),
  [FinishedAt] datetime2(3) NULL,
  CONSTRAINT [PK_DeliveryAttempt] PRIMARY KEY ([AttemptId]),
  CONSTRAINT [UQ_DeliveryAttempt_Ordinal] UNIQUE ([NotificationId], [AttemptNumber]),
  CONSTRAINT [CK_DeliveryAttempt_Status] CHECK ([Status] IN (N'Attempted', N'Delivered', N'Failed')),
  CONSTRAINT [CK_DeliveryAttempt_Attempt] CHECK ([AttemptNumber]>0)
);
GO

-- Append-only action trail, including account/access changes and retained legacy audit messages. Entity references are descriptive audit context, not polymorphic foreign keys.
CREATE TABLE [core].[AuditEvent] (
  [AuditId] uniqueidentifier NOT NULL CONSTRAINT [DF_AuditEvent_AuditId] DEFAULT (NEWSEQUENTIALID()),
  [ActorId] uniqueidentifier NULL,
  [ActorRole] nvarchar(20) NOT NULL,
  [Action] nvarchar(300) NOT NULL,
  [EntityType] nvarchar(100) NULL,
  [EntityId] uniqueidentifier NULL,
  [CorrelationId] uniqueidentifier NULL,
  [CreatedAt] datetime2(3) NOT NULL CONSTRAINT [DF_AuditEvent_CreatedAt] DEFAULT (SYSUTCDATETIME()),
  CONSTRAINT [PK_AuditEvent] PRIMARY KEY ([AuditId]),
  CONSTRAINT [CK_AuditEvent_Action] CHECK (LEN(LTRIM(RTRIM([Action])))>0)
);
GO

ALTER TABLE [core].[College] WITH CHECK ADD CONSTRAINT [FK_College_CollegeId_Kind] FOREIGN KEY ([CollegeId], [Kind]) REFERENCES [core].[Organization] ([OrganizationId], [Kind]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Company] WITH CHECK ADD CONSTRAINT [FK_Company_CompanyId_Kind] FOREIGN KEY ([CompanyId], [Kind]) REFERENCES [core].[Organization] ([OrganizationId], [Kind]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[UserAccount] WITH CHECK ADD CONSTRAINT [FK_UserAccount_OrganizationId] FOREIGN KEY ([OrganizationId]) REFERENCES [core].[Organization] ([OrganizationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[UserAccount] WITH CHECK ADD CONSTRAINT [FK_UserAccount_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Student] WITH CHECK ADD CONSTRAINT [FK_Student_UserId_CollegeId_Role] FOREIGN KEY ([UserId], [CollegeId], [Role]) REFERENCES [core].[UserAccount] ([UserId], [OrganizationId], [Role]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Student] WITH CHECK ADD CONSTRAINT [FK_Student_CollegeId] FOREIGN KEY ([CollegeId]) REFERENCES [core].[College] ([CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Supervisor] WITH CHECK ADD CONSTRAINT [FK_Supervisor_UserId_CollegeId_Role] FOREIGN KEY ([UserId], [CollegeId], [Role]) REFERENCES [core].[UserAccount] ([UserId], [OrganizationId], [Role]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Supervisor] WITH CHECK ADD CONSTRAINT [FK_Supervisor_CollegeId] FOREIGN KEY ([CollegeId]) REFERENCES [core].[College] ([CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[AcademicAssignment] WITH CHECK ADD CONSTRAINT [FK_AcademicAssignment_StudentId_CollegeId] FOREIGN KEY ([StudentId], [CollegeId]) REFERENCES [core].[Student] ([StudentId], [CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[AcademicAssignment] WITH CHECK ADD CONSTRAINT [FK_AcademicAssignment_SupervisorId_CollegeId] FOREIGN KEY ([SupervisorId], [CollegeId]) REFERENCES [core].[Supervisor] ([SupervisorId], [CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[AcademicAssignment] WITH CHECK ADD CONSTRAINT [FK_AcademicAssignment_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[AcademicAssignment] WITH CHECK ADD CONSTRAINT [FK_AcademicAssignment_EndedBy] FOREIGN KEY ([EndedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Partnership] WITH CHECK ADD CONSTRAINT [FK_Partnership_CollegeId] FOREIGN KEY ([CollegeId]) REFERENCES [core].[College] ([CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Partnership] WITH CHECK ADD CONSTRAINT [FK_Partnership_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [core].[Company] ([CompanyId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[Partnership] WITH CHECK ADD CONSTRAINT [FK_Partnership_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[PartnershipEvent] WITH CHECK ADD CONSTRAINT [FK_PartnershipEvent_PartnershipId] FOREIGN KEY ([PartnershipId]) REFERENCES [core].[Partnership] ([PartnershipId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[PartnershipEvent] WITH CHECK ADD CONSTRAINT [FK_PartnershipEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[UserPreference] WITH CHECK ADD CONSTRAINT [FK_UserPreference_UserId] FOREIGN KEY ([UserId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[ActivityReceipt] WITH CHECK ADD CONSTRAINT [FK_ActivityReceipt_UserId] FOREIGN KEY ([UserId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[FileAsset] WITH CHECK ADD CONSTRAINT [FK_FileAsset_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[StudentProfile] WITH CHECK ADD CONSTRAINT [FK_StudentProfile_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [core].[Student] ([StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[StudentSkill] WITH CHECK ADD CONSTRAINT [FK_StudentSkill_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [core].[Student] ([StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[StudentCvVersion] WITH CHECK ADD CONSTRAINT [FK_StudentCvVersion_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [core].[Student] ([StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[StudentCvVersion] WITH CHECK ADD CONSTRAINT [FK_StudentCvVersion_FileId] FOREIGN KEY ([FileId]) REFERENCES [core].[FileAsset] ([FileId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CollegeProgram] WITH CHECK ADD CONSTRAINT [FK_CollegeProgram_CollegeId] FOREIGN KEY ([CollegeId]) REFERENCES [core].[College] ([CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CollegeProgram] WITH CHECK ADD CONSTRAINT [FK_CollegeProgram_CollegeId_CurrentVersion] FOREIGN KEY ([CollegeId], [CurrentVersion]) REFERENCES [training].[CollegeProgramVersion] ([CollegeId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CollegeProgramVersion] WITH CHECK ADD CONSTRAINT [FK_CollegeProgramVersion_CollegeId] FOREIGN KEY ([CollegeId]) REFERENCES [training].[CollegeProgram] ([CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CollegeProgramVersion] WITH CHECK ADD CONSTRAINT [FK_CollegeProgramVersion_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Listing] WITH CHECK ADD CONSTRAINT [FK_Listing_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [core].[Company] ([CompanyId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Listing] WITH CHECK ADD CONSTRAINT [FK_Listing_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Listing] WITH CHECK ADD CONSTRAINT [FK_Listing_ListingId_CurrentVersion] FOREIGN KEY ([ListingId], [CurrentVersion]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingVersion] WITH CHECK ADD CONSTRAINT [FK_ListingVersion_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [recruitment].[Listing] ([ListingId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingVersion] WITH CHECK ADD CONSTRAINT [FK_ListingVersion_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingSkill] WITH CHECK ADD CONSTRAINT [FK_ListingSkill_ListingId_VersionNumber] FOREIGN KEY ([ListingId], [VersionNumber]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingPrerequisite] WITH CHECK ADD CONSTRAINT [FK_ListingPrerequisite_ListingId_VersionNumber] FOREIGN KEY ([ListingId], [VersionNumber]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingQuestion] WITH CHECK ADD CONSTRAINT [FK_ListingQuestion_ListingId_VersionNumber] FOREIGN KEY ([ListingId], [VersionNumber]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingScheduleWeek] WITH CHECK ADD CONSTRAINT [FK_ListingScheduleWeek_ListingId_VersionNumber] FOREIGN KEY ([ListingId], [VersionNumber]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingDecision] WITH CHECK ADD CONSTRAINT [FK_ListingDecision_ListingId_VersionNumber] FOREIGN KEY ([ListingId], [VersionNumber]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ListingDecision] WITH CHECK ADD CONSTRAINT [FK_ListingDecision_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[CollegeAvailability] WITH CHECK ADD CONSTRAINT [FK_CollegeAvailability_CollegeId] FOREIGN KEY ([CollegeId]) REFERENCES [core].[College] ([CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[CollegeAvailability] WITH CHECK ADD CONSTRAINT [FK_CollegeAvailability_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [recruitment].[Listing] ([ListingId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[CollegeAvailability] WITH CHECK ADD CONSTRAINT [FK_CollegeAvailability_UpdatedBy] FOREIGN KEY ([UpdatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Application] WITH CHECK ADD CONSTRAINT [FK_Application_StudentId_CollegeId] FOREIGN KEY ([StudentId], [CollegeId]) REFERENCES [core].[Student] ([StudentId], [CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Application] WITH CHECK ADD CONSTRAINT [FK_Application_ListingId_CompanyId] FOREIGN KEY ([ListingId], [CompanyId]) REFERENCES [recruitment].[Listing] ([ListingId], [CompanyId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Application] WITH CHECK ADD CONSTRAINT [FK_Application_ListingId_ListingVersion] FOREIGN KEY ([ListingId], [ListingVersion]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Application] WITH CHECK ADD CONSTRAINT [FK_Application_CollegeId_ProgramVersion] FOREIGN KEY ([CollegeId], [ProgramVersion]) REFERENCES [training].[CollegeProgramVersion] ([CollegeId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Application] WITH CHECK ADD CONSTRAINT [FK_Application_CvVersionId_StudentId] FOREIGN KEY ([CvVersionId], [StudentId]) REFERENCES [core].[StudentCvVersion] ([CvVersionId], [StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ApplicationAnswer] WITH CHECK ADD CONSTRAINT [FK_ApplicationAnswer_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [recruitment].[Application] ([ApplicationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ApplicationSkill] WITH CHECK ADD CONSTRAINT [FK_ApplicationSkill_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [recruitment].[Application] ([ApplicationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ApplicationScheduleWeek] WITH CHECK ADD CONSTRAINT [FK_ApplicationScheduleWeek_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [recruitment].[Application] ([ApplicationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ApplicationEvent] WITH CHECK ADD CONSTRAINT [FK_ApplicationEvent_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [recruitment].[Application] ([ApplicationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[ApplicationEvent] WITH CHECK ADD CONSTRAINT [FK_ApplicationEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Interview] WITH CHECK ADD CONSTRAINT [FK_Interview_ApplicationId] FOREIGN KEY ([ApplicationId]) REFERENCES [recruitment].[Application] ([ApplicationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[Interview] WITH CHECK ADD CONSTRAINT [FK_Interview_InterviewId_CurrentRevision] FOREIGN KEY ([InterviewId], [CurrentRevision]) REFERENCES [recruitment].[InterviewRevision] ([InterviewId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[InterviewRevision] WITH CHECK ADD CONSTRAINT [FK_InterviewRevision_InterviewId] FOREIGN KEY ([InterviewId]) REFERENCES [recruitment].[Interview] ([InterviewId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[InterviewRevision] WITH CHECK ADD CONSTRAINT [FK_InterviewRevision_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[InterviewEvent] WITH CHECK ADD CONSTRAINT [FK_InterviewEvent_InterviewId_RevisionNumber] FOREIGN KEY ([InterviewId], [RevisionNumber]) REFERENCES [recruitment].[InterviewRevision] ([InterviewId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [recruitment].[InterviewEvent] WITH CHECK ADD CONSTRAINT [FK_InterviewEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[Placement] WITH CHECK ADD CONSTRAINT [FK_Placement_ApplicationId_StudentId_CollegeId_CompanyId] FOREIGN KEY ([ApplicationId], [StudentId], [CollegeId], [CompanyId]) REFERENCES [recruitment].[Application] ([ApplicationId], [StudentId], [CollegeId], [CompanyId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[Placement] WITH CHECK ADD CONSTRAINT [FK_Placement_ActivatedBy] FOREIGN KEY ([ActivatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[PlacementWeek] WITH CHECK ADD CONSTRAINT [FK_PlacementWeek_PlacementId] FOREIGN KEY ([PlacementId]) REFERENCES [training].[Placement] ([PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[WeekPlanRevision] WITH CHECK ADD CONSTRAINT [FK_WeekPlanRevision_WeekId] FOREIGN KEY ([WeekId]) REFERENCES [training].[PlacementWeek] ([WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[WeekPlanRevision] WITH CHECK ADD CONSTRAINT [FK_WeekPlanRevision_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[Objective] WITH CHECK ADD CONSTRAINT [FK_Objective_WeekId] FOREIGN KEY ([WeekId]) REFERENCES [training].[PlacementWeek] ([WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[WeekPlanObjective] WITH CHECK ADD CONSTRAINT [FK_WeekPlanObjective_WeekId_RevisionNumber] FOREIGN KEY ([WeekId], [RevisionNumber]) REFERENCES [training].[WeekPlanRevision] ([WeekId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[WeekPlanObjective] WITH CHECK ADD CONSTRAINT [FK_WeekPlanObjective_ObjectiveId_WeekId] FOREIGN KEY ([ObjectiveId], [WeekId]) REFERENCES [training].[Objective] ([ObjectiveId], [WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[Task] WITH CHECK ADD CONSTRAINT [FK_Task_WeekId] FOREIGN KEY ([WeekId]) REFERENCES [training].[PlacementWeek] ([WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[Task] WITH CHECK ADD CONSTRAINT [FK_Task_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskRevision] WITH CHECK ADD CONSTRAINT [FK_TaskRevision_TaskId] FOREIGN KEY ([TaskId]) REFERENCES [training].[Task] ([TaskId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskRevision] WITH CHECK ADD CONSTRAINT [FK_TaskRevision_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskAttachment] WITH CHECK ADD CONSTRAINT [FK_TaskAttachment_TaskId] FOREIGN KEY ([TaskId]) REFERENCES [training].[Task] ([TaskId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskAttachment] WITH CHECK ADD CONSTRAINT [FK_TaskAttachment_FileId] FOREIGN KEY ([FileId]) REFERENCES [core].[FileAsset] ([FileId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskAttachment] WITH CHECK ADD CONSTRAINT [FK_TaskAttachment_OwnerId] FOREIGN KEY ([OwnerId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskSubmission] WITH CHECK ADD CONSTRAINT [FK_TaskSubmission_TaskId_TaskRevision] FOREIGN KEY ([TaskId], [TaskRevision]) REFERENCES [training].[TaskRevision] ([TaskId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskSubmission] WITH CHECK ADD CONSTRAINT [FK_TaskSubmission_SubmittedBy] FOREIGN KEY ([SubmittedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[SubmissionFile] WITH CHECK ADD CONSTRAINT [FK_SubmissionFile_SubmissionId_TaskId] FOREIGN KEY ([SubmissionId], [TaskId]) REFERENCES [training].[TaskSubmission] ([SubmissionId], [TaskId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[SubmissionFile] WITH CHECK ADD CONSTRAINT [FK_SubmissionFile_AttachmentId_TaskId] FOREIGN KEY ([AttachmentId], [TaskId]) REFERENCES [training].[TaskAttachment] ([AttachmentId], [TaskId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskReview] WITH CHECK ADD CONSTRAINT [FK_TaskReview_SubmissionId] FOREIGN KEY ([SubmissionId]) REFERENCES [training].[TaskSubmission] ([SubmissionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[TaskReview] WITH CHECK ADD CONSTRAINT [FK_TaskReview_ReviewedBy] FOREIGN KEY ([ReviewedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[WeeklyReport] WITH CHECK ADD CONSTRAINT [FK_WeeklyReport_WeekId_PlanRevision] FOREIGN KEY ([WeekId], [PlanRevision]) REFERENCES [training].[WeekPlanRevision] ([WeekId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[WeeklyReport] WITH CHECK ADD CONSTRAINT [FK_WeeklyReport_SubmittedBy] FOREIGN KEY ([SubmittedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[ReportObjective] WITH CHECK ADD CONSTRAINT [FK_ReportObjective_ReportId_WeekId] FOREIGN KEY ([ReportId], [WeekId]) REFERENCES [training].[WeeklyReport] ([ReportId], [WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[ReportObjective] WITH CHECK ADD CONSTRAINT [FK_ReportObjective_ObjectiveId_WeekId] FOREIGN KEY ([ObjectiveId], [WeekId]) REFERENCES [training].[Objective] ([ObjectiveId], [WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[ReportReview] WITH CHECK ADD CONSTRAINT [FK_ReportReview_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [training].[WeeklyReport] ([ReportId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[ReportReview] WITH CHECK ADD CONSTRAINT [FK_ReportReview_SupervisorId] FOREIGN KEY ([SupervisorId]) REFERENCES [core].[Supervisor] ([SupervisorId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[HourVerification] WITH CHECK ADD CONSTRAINT [FK_HourVerification_ReportId_WeekId] FOREIGN KEY ([ReportId], [WeekId]) REFERENCES [training].[WeeklyReport] ([ReportId], [WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[HourVerification] WITH CHECK ADD CONSTRAINT [FK_HourVerification_ReportId] FOREIGN KEY ([ReportId]) REFERENCES [training].[ReportReview] ([ReportId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[ReportVisibility] WITH CHECK ADD CONSTRAINT [FK_ReportVisibility_SupervisorId] FOREIGN KEY ([SupervisorId]) REFERENCES [core].[Supervisor] ([SupervisorId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CompanyEvaluation] WITH CHECK ADD CONSTRAINT [FK_CompanyEvaluation_PlacementId] FOREIGN KEY ([PlacementId]) REFERENCES [training].[Placement] ([PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CompanyEvaluation] WITH CHECK ADD CONSTRAINT [FK_CompanyEvaluation_SubmittedBy] FOREIGN KEY ([SubmittedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CompanyEvaluationScore] WITH CHECK ADD CONSTRAINT [FK_CompanyEvaluationScore_EvaluationId] FOREIGN KEY ([EvaluationId]) REFERENCES [training].[CompanyEvaluation] ([EvaluationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[AcademicAssessment] WITH CHECK ADD CONSTRAINT [FK_AcademicAssessment_EvaluationId_PlacementId] FOREIGN KEY ([EvaluationId], [PlacementId]) REFERENCES [training].[CompanyEvaluation] ([EvaluationId], [PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[AcademicAssessment] WITH CHECK ADD CONSTRAINT [FK_AcademicAssessment_SupervisorId] FOREIGN KEY ([SupervisorId]) REFERENCES [core].[Supervisor] ([SupervisorId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[AcademicCriterion] WITH CHECK ADD CONSTRAINT [FK_AcademicCriterion_AssessmentId] FOREIGN KEY ([AssessmentId]) REFERENCES [training].[AcademicAssessment] ([AssessmentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CompletionApproval] WITH CHECK ADD CONSTRAINT [FK_CompletionApproval_AssessmentId_PlacementId_EvaluationId] FOREIGN KEY ([AssessmentId], [PlacementId], [EvaluationId]) REFERENCES [training].[AcademicAssessment] ([AssessmentId], [PlacementId], [EvaluationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[CompletionApproval] WITH CHECK ADD CONSTRAINT [FK_CompletionApproval_ApprovedBy] FOREIGN KEY ([ApprovedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [training].[Certificate] WITH CHECK ADD CONSTRAINT [FK_Certificate_PlacementId] FOREIGN KEY ([PlacementId]) REFERENCES [training].[CompletionApproval] ([PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[QrSession] WITH CHECK ADD CONSTRAINT [FK_QrSession_CompanyId] FOREIGN KEY ([CompanyId]) REFERENCES [core].[Company] ([CompanyId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[QrSession] WITH CHECK ADD CONSTRAINT [FK_QrSession_PlacementId] FOREIGN KEY ([PlacementId]) REFERENCES [training].[Placement] ([PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[QrSession] WITH CHECK ADD CONSTRAINT [FK_QrSession_IssuedBy] FOREIGN KEY ([IssuedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[AttendanceRecord] WITH CHECK ADD CONSTRAINT [FK_AttendanceRecord_PlacementId] FOREIGN KEY ([PlacementId]) REFERENCES [training].[Placement] ([PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[QrRedemption] WITH CHECK ADD CONSTRAINT [FK_QrRedemption_SessionId] FOREIGN KEY ([SessionId]) REFERENCES [attendance].[QrSession] ([SessionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[QrRedemption] WITH CHECK ADD CONSTRAINT [FK_QrRedemption_RecordId_PlacementId] FOREIGN KEY ([RecordId], [PlacementId]) REFERENCES [attendance].[AttendanceRecord] ([RecordId], [PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[QrRedemption] WITH CHECK ADD CONSTRAINT [FK_QrRedemption_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[AttendanceEvent] WITH CHECK ADD CONSTRAINT [FK_AttendanceEvent_RecordId] FOREIGN KEY ([RecordId]) REFERENCES [attendance].[AttendanceRecord] ([RecordId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[AttendanceEvent] WITH CHECK ADD CONSTRAINT [FK_AttendanceEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[CorrectionRequest] WITH CHECK ADD CONSTRAINT [FK_CorrectionRequest_RecordId] FOREIGN KEY ([RecordId]) REFERENCES [attendance].[AttendanceRecord] ([RecordId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[CorrectionRequest] WITH CHECK ADD CONSTRAINT [FK_CorrectionRequest_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [core].[Student] ([StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [attendance].[CorrectionRequest] WITH CHECK ADD CONSTRAINT [FK_CorrectionRequest_ResolvedBy] FOREIGN KEY ([ResolvedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [meetings].[AcademicMeeting] WITH CHECK ADD CONSTRAINT [FK_AcademicMeeting_AssignmentId_StudentId_SupervisorId_CollegeId] FOREIGN KEY ([AssignmentId], [StudentId], [SupervisorId], [CollegeId]) REFERENCES [core].[AcademicAssignment] ([AssignmentId], [StudentId], [SupervisorId], [CollegeId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [meetings].[AcademicMeeting] WITH CHECK ADD CONSTRAINT [FK_AcademicMeeting_MeetingId_CurrentRevision] FOREIGN KEY ([MeetingId], [CurrentRevision]) REFERENCES [meetings].[AcademicMeetingRevision] ([MeetingId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [meetings].[AcademicMeetingRevision] WITH CHECK ADD CONSTRAINT [FK_AcademicMeetingRevision_MeetingId] FOREIGN KEY ([MeetingId]) REFERENCES [meetings].[AcademicMeeting] ([MeetingId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [meetings].[AcademicMeetingRevision] WITH CHECK ADD CONSTRAINT [FK_AcademicMeetingRevision_CreatedBy] FOREIGN KEY ([CreatedBy]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [meetings].[AcademicMeetingEvent] WITH CHECK ADD CONSTRAINT [FK_AcademicMeetingEvent_MeetingId_RevisionNumber] FOREIGN KEY ([MeetingId], [RevisionNumber]) REFERENCES [meetings].[AcademicMeetingRevision] ([MeetingId], [RevisionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [meetings].[AcademicMeetingEvent] WITH CHECK ADD CONSTRAINT [FK_AcademicMeetingEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[Ticket] WITH CHECK ADD CONSTRAINT [FK_Ticket_RequesterId] FOREIGN KEY ([RequesterId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[Ticket] WITH CHECK ADD CONSTRAINT [FK_Ticket_RecipientOrganizationId] FOREIGN KEY ([RecipientOrganizationId]) REFERENCES [core].[Organization] ([OrganizationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[Ticket] WITH CHECK ADD CONSTRAINT [FK_Ticket_RecipientSupervisorId] FOREIGN KEY ([RecipientSupervisorId]) REFERENCES [core].[Supervisor] ([SupervisorId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[Ticket] WITH CHECK ADD CONSTRAINT [FK_Ticket_PlacementId] FOREIGN KEY ([PlacementId]) REFERENCES [training].[Placement] ([PlacementId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[Ticket] WITH CHECK ADD CONSTRAINT [FK_Ticket_ListingId] FOREIGN KEY ([ListingId]) REFERENCES [recruitment].[Listing] ([ListingId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[Ticket] WITH CHECK ADD CONSTRAINT [FK_Ticket_WeekId] FOREIGN KEY ([WeekId]) REFERENCES [training].[PlacementWeek] ([WeekId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[TicketMessage] WITH CHECK ADD CONSTRAINT [FK_TicketMessage_TicketId] FOREIGN KEY ([TicketId]) REFERENCES [support].[Ticket] ([TicketId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[TicketMessage] WITH CHECK ADD CONSTRAINT [FK_TicketMessage_SenderId] FOREIGN KEY ([SenderId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[TicketEvent] WITH CHECK ADD CONSTRAINT [FK_TicketEvent_TicketId] FOREIGN KEY ([TicketId]) REFERENCES [support].[Ticket] ([TicketId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[TicketEvent] WITH CHECK ADD CONSTRAINT [FK_TicketEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [support].[TicketEvent] WITH CHECK ADD CONSTRAINT [FK_TicketEvent_RecipientSupervisorId] FOREIGN KEY ([RecipientSupervisorId]) REFERENCES [core].[Supervisor] ([SupervisorId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[Course] WITH CHECK ADD CONSTRAINT [FK_Course_CourseId_CurrentVersion] FOREIGN KEY ([CourseId], [CurrentVersion]) REFERENCES [learning].[CourseVersion] ([CourseId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[CourseVersion] WITH CHECK ADD CONSTRAINT [FK_CourseVersion_CourseId] FOREIGN KEY ([CourseId]) REFERENCES [learning].[Course] ([CourseId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[Lesson] WITH CHECK ADD CONSTRAINT [FK_Lesson_CourseId_CourseVersion] FOREIGN KEY ([CourseId], [CourseVersion]) REFERENCES [learning].[CourseVersion] ([CourseId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[Lesson] WITH CHECK ADD CONSTRAINT [FK_Lesson_ContentFileId] FOREIGN KEY ([ContentFileId]) REFERENCES [core].[FileAsset] ([FileId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[ProductCourse] WITH CHECK ADD CONSTRAINT [FK_ProductCourse_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [commerce].[Product] ([ProductId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[ProductCourse] WITH CHECK ADD CONSTRAINT [FK_ProductCourse_CourseId_CourseVersion] FOREIGN KEY ([CourseId], [CourseVersion]) REFERENCES [learning].[CourseVersion] ([CourseId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[PurchaseOrder] WITH CHECK ADD CONSTRAINT [FK_PurchaseOrder_BuyerId] FOREIGN KEY ([BuyerId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[OrderItem] WITH CHECK ADD CONSTRAINT [FK_OrderItem_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [commerce].[PurchaseOrder] ([OrderId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[OrderItem] WITH CHECK ADD CONSTRAINT [FK_OrderItem_ProductId] FOREIGN KEY ([ProductId]) REFERENCES [commerce].[Product] ([ProductId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[OrderItemCourse] WITH CHECK ADD CONSTRAINT [FK_OrderItemCourse_OrderItemId] FOREIGN KEY ([OrderItemId]) REFERENCES [commerce].[OrderItem] ([OrderItemId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[OrderItemCourse] WITH CHECK ADD CONSTRAINT [FK_OrderItemCourse_CourseId_CourseVersion] FOREIGN KEY ([CourseId], [CourseVersion]) REFERENCES [learning].[CourseVersion] ([CourseId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[Payment] WITH CHECK ADD CONSTRAINT [FK_Payment_OrderId] FOREIGN KEY ([OrderId]) REFERENCES [commerce].[PurchaseOrder] ([OrderId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[PaymentEvent] WITH CHECK ADD CONSTRAINT [FK_PaymentEvent_PaymentId] FOREIGN KEY ([PaymentId]) REFERENCES [commerce].[Payment] ([PaymentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [commerce].[Refund] WITH CHECK ADD CONSTRAINT [FK_Refund_PaymentId] FOREIGN KEY ([PaymentId]) REFERENCES [commerce].[Payment] ([PaymentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[Enrollment] WITH CHECK ADD CONSTRAINT [FK_Enrollment_StudentId] FOREIGN KEY ([StudentId]) REFERENCES [core].[Student] ([StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[Enrollment] WITH CHECK ADD CONSTRAINT [FK_Enrollment_OrderItemId_CourseId_CourseVersion] FOREIGN KEY ([OrderItemId], [CourseId], [CourseVersion]) REFERENCES [commerce].[OrderItemCourse] ([OrderItemId], [CourseId], [CourseVersion]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[Enrollment] WITH CHECK ADD CONSTRAINT [FK_Enrollment_CourseId_CourseVersion] FOREIGN KEY ([CourseId], [CourseVersion]) REFERENCES [learning].[CourseVersion] ([CourseId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[LessonProgress] WITH CHECK ADD CONSTRAINT [FK_LessonProgress_EnrollmentId_CourseId_CourseVersion] FOREIGN KEY ([EnrollmentId], [CourseId], [CourseVersion]) REFERENCES [learning].[Enrollment] ([EnrollmentId], [CourseId], [CourseVersion]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [learning].[LessonProgress] WITH CHECK ADD CONSTRAINT [FK_LessonProgress_LessonId_CourseId_CourseVersion] FOREIGN KEY ([LessonId], [CourseId], [CourseVersion]) REFERENCES [learning].[Lesson] ([LessonId], [CourseId], [CourseVersion]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [ai].[CvMatchRun] WITH CHECK ADD CONSTRAINT [FK_CvMatchRun_CvVersionId_StudentId] FOREIGN KEY ([CvVersionId], [StudentId]) REFERENCES [core].[StudentCvVersion] ([CvVersionId], [StudentId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [ai].[CvMatchRun] WITH CHECK ADD CONSTRAINT [FK_CvMatchRun_ListingId_ListingVersion] FOREIGN KEY ([ListingId], [ListingVersion]) REFERENCES [recruitment].[ListingVersion] ([ListingId], [VersionNumber]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [ai].[CvMatchRun] WITH CHECK ADD CONSTRAINT [FK_CvMatchRun_ModelVersionId] FOREIGN KEY ([ModelVersionId]) REFERENCES [ai].[ModelVersion] ([ModelVersionId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [ai].[CvMatchResult] WITH CHECK ADD CONSTRAINT [FK_CvMatchResult_RunId] FOREIGN KEY ([RunId]) REFERENCES [ai].[CvMatchRun] ([RunId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [notifications].[Notification] WITH CHECK ADD CONSTRAINT [FK_Notification_RecipientId] FOREIGN KEY ([RecipientId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [notifications].[DeliveryAttempt] WITH CHECK ADD CONSTRAINT [FK_DeliveryAttempt_NotificationId] FOREIGN KEY ([NotificationId]) REFERENCES [notifications].[Notification] ([NotificationId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

ALTER TABLE [core].[AuditEvent] WITH CHECK ADD CONSTRAINT [FK_AuditEvent_ActorId] FOREIGN KEY ([ActorId]) REFERENCES [core].[UserAccount] ([UserId]) ON DELETE NO ACTION ON UPDATE NO ACTION;
GO

CREATE INDEX [IX_College_CollegeId_Kind] ON [core].[College] ([CollegeId], [Kind]);
GO

CREATE INDEX [IX_Company_CompanyId_Kind] ON [core].[Company] ([CompanyId], [Kind]);
GO

CREATE UNIQUE INDEX [UX_UserAccount_AuthSubject] ON [core].[UserAccount] ([ExternalAuthSubject]) WHERE [ExternalAuthSubject] IS NOT NULL;
GO

CREATE INDEX [IX_UserAccount_OrganizationId] ON [core].[UserAccount] ([OrganizationId]);
GO

CREATE INDEX [IX_UserAccount_CreatedBy] ON [core].[UserAccount] ([CreatedBy]);
GO

CREATE INDEX [IX_Student_UserId_CollegeId_Role] ON [core].[Student] ([UserId], [CollegeId], [Role]);
GO

CREATE INDEX [IX_Supervisor_UserId_CollegeId_Role] ON [core].[Supervisor] ([UserId], [CollegeId], [Role]);
GO

CREATE UNIQUE INDEX [UX_AcademicAssignment_Current] ON [core].[AcademicAssignment] ([StudentId]) WHERE [EndedAt] IS NULL;
GO

CREATE INDEX [IX_AcademicAssignment_StudentId_CollegeId] ON [core].[AcademicAssignment] ([StudentId], [CollegeId]);
GO

CREATE INDEX [IX_AcademicAssignment_SupervisorId_CollegeId] ON [core].[AcademicAssignment] ([SupervisorId], [CollegeId]);
GO

CREATE INDEX [IX_AcademicAssignment_CreatedBy] ON [core].[AcademicAssignment] ([CreatedBy]);
GO

CREATE INDEX [IX_AcademicAssignment_EndedBy] ON [core].[AcademicAssignment] ([EndedBy]);
GO

CREATE INDEX [IX_Partnership_CompanyId] ON [core].[Partnership] ([CompanyId]);
GO

CREATE INDEX [IX_Partnership_CreatedBy] ON [core].[Partnership] ([CreatedBy]);
GO

CREATE INDEX [IX_PartnershipEvent_PartnershipId] ON [core].[PartnershipEvent] ([PartnershipId]);
GO

CREATE INDEX [IX_PartnershipEvent_ActorId] ON [core].[PartnershipEvent] ([ActorId]);
GO

CREATE INDEX [IX_FileAsset_OwnerId] ON [core].[FileAsset] ([OwnerId]);
GO

CREATE INDEX [IX_StudentCvVersion_FileId] ON [core].[StudentCvVersion] ([FileId]);
GO

CREATE INDEX [IX_CollegeProgram_CollegeId_CurrentVersion] ON [training].[CollegeProgram] ([CollegeId], [CurrentVersion]);
GO

CREATE INDEX [IX_CollegeProgramVersion_CreatedBy] ON [training].[CollegeProgramVersion] ([CreatedBy]);
GO

CREATE INDEX [IX_Listing_CompanyId] ON [recruitment].[Listing] ([CompanyId]);
GO

CREATE INDEX [IX_Listing_CreatedBy] ON [recruitment].[Listing] ([CreatedBy]);
GO

CREATE INDEX [IX_Listing_ListingId_CurrentVersion] ON [recruitment].[Listing] ([ListingId], [CurrentVersion]);
GO

CREATE INDEX [IX_ListingVersion_CreatedBy] ON [recruitment].[ListingVersion] ([CreatedBy]);
GO

CREATE INDEX [IX_ListingDecision_ListingId_VersionNumber] ON [recruitment].[ListingDecision] ([ListingId], [VersionNumber]);
GO

CREATE INDEX [IX_ListingDecision_ActorId] ON [recruitment].[ListingDecision] ([ActorId]);
GO

CREATE INDEX [IX_CollegeAvailability_ListingId] ON [recruitment].[CollegeAvailability] ([ListingId]);
GO

CREATE INDEX [IX_CollegeAvailability_UpdatedBy] ON [recruitment].[CollegeAvailability] ([UpdatedBy]);
GO

CREATE UNIQUE INDEX [UX_Application_NonWithdrawn] ON [recruitment].[Application] ([StudentId], [ListingId]) WHERE [Status]<>N'Withdrawn';
GO

CREATE UNIQUE INDEX [UX_Application_AcceptedOffer] ON [recruitment].[Application] ([StudentId]) WHERE [Status]=N'Accepted';
GO

CREATE INDEX [IX_Application_CompanyQueue] ON [recruitment].[Application] ([CompanyId], [Status], [SubmittedAt]);
GO

CREATE INDEX [IX_Application_StudentId_CollegeId] ON [recruitment].[Application] ([StudentId], [CollegeId]);
GO

CREATE INDEX [IX_Application_ListingId_CompanyId] ON [recruitment].[Application] ([ListingId], [CompanyId]);
GO

CREATE INDEX [IX_Application_ListingId_ListingVersion] ON [recruitment].[Application] ([ListingId], [ListingVersion]);
GO

CREATE INDEX [IX_Application_CollegeId_ProgramVersion] ON [recruitment].[Application] ([CollegeId], [ProgramVersion]);
GO

CREATE INDEX [IX_Application_CvVersionId_StudentId] ON [recruitment].[Application] ([CvVersionId], [StudentId]);
GO

CREATE INDEX [IX_ApplicationEvent_ApplicationId] ON [recruitment].[ApplicationEvent] ([ApplicationId]);
GO

CREATE INDEX [IX_ApplicationEvent_ActorId] ON [recruitment].[ApplicationEvent] ([ActorId]);
GO

CREATE INDEX [IX_Interview_InterviewId_CurrentRevision] ON [recruitment].[Interview] ([InterviewId], [CurrentRevision]);
GO

CREATE INDEX [IX_InterviewRevision_CreatedBy] ON [recruitment].[InterviewRevision] ([CreatedBy]);
GO

CREATE INDEX [IX_InterviewEvent_InterviewId_RevisionNumber] ON [recruitment].[InterviewEvent] ([InterviewId], [RevisionNumber]);
GO

CREATE INDEX [IX_InterviewEvent_ActorId] ON [recruitment].[InterviewEvent] ([ActorId]);
GO

CREATE UNIQUE INDEX [UX_Placement_ActiveStudent] ON [training].[Placement] ([StudentId]) WHERE [Status]=N'Active';
GO

CREATE INDEX [IX_Placement_ApplicationId_StudentId_CollegeId_CompanyId] ON [training].[Placement] ([ApplicationId], [StudentId], [CollegeId], [CompanyId]);
GO

CREATE INDEX [IX_Placement_ActivatedBy] ON [training].[Placement] ([ActivatedBy]);
GO

CREATE INDEX [IX_WeekPlanRevision_CreatedBy] ON [training].[WeekPlanRevision] ([CreatedBy]);
GO

CREATE INDEX [IX_Objective_WeekId] ON [training].[Objective] ([WeekId]);
GO

CREATE INDEX [IX_WeekPlanObjective_ObjectiveId_WeekId] ON [training].[WeekPlanObjective] ([ObjectiveId], [WeekId]);
GO

CREATE INDEX [IX_Task_WeekId] ON [training].[Task] ([WeekId]);
GO

CREATE INDEX [IX_Task_CreatedBy] ON [training].[Task] ([CreatedBy]);
GO

CREATE INDEX [IX_TaskRevision_CreatedBy] ON [training].[TaskRevision] ([CreatedBy]);
GO

CREATE INDEX [IX_TaskAttachment_TaskId] ON [training].[TaskAttachment] ([TaskId]);
GO

CREATE INDEX [IX_TaskAttachment_FileId] ON [training].[TaskAttachment] ([FileId]);
GO

CREATE INDEX [IX_TaskAttachment_OwnerId] ON [training].[TaskAttachment] ([OwnerId]);
GO

CREATE INDEX [IX_TaskSubmission_TaskId_TaskRevision] ON [training].[TaskSubmission] ([TaskId], [TaskRevision]);
GO

CREATE INDEX [IX_TaskSubmission_SubmittedBy] ON [training].[TaskSubmission] ([SubmittedBy]);
GO

CREATE INDEX [IX_SubmissionFile_SubmissionId_TaskId] ON [training].[SubmissionFile] ([SubmissionId], [TaskId]);
GO

CREATE INDEX [IX_SubmissionFile_AttachmentId_TaskId] ON [training].[SubmissionFile] ([AttachmentId], [TaskId]);
GO

CREATE INDEX [IX_TaskReview_ReviewedBy] ON [training].[TaskReview] ([ReviewedBy]);
GO

CREATE INDEX [IX_WeeklyReport_WeekId_PlanRevision] ON [training].[WeeklyReport] ([WeekId], [PlanRevision]);
GO

CREATE INDEX [IX_WeeklyReport_SubmittedBy] ON [training].[WeeklyReport] ([SubmittedBy]);
GO

CREATE INDEX [IX_ReportObjective_ReportId_WeekId] ON [training].[ReportObjective] ([ReportId], [WeekId]);
GO

CREATE INDEX [IX_ReportObjective_ObjectiveId_WeekId] ON [training].[ReportObjective] ([ObjectiveId], [WeekId]);
GO

CREATE INDEX [IX_ReportReview_SupervisorId] ON [training].[ReportReview] ([SupervisorId]);
GO

CREATE INDEX [IX_HourVerification_ReportId_WeekId] ON [training].[HourVerification] ([ReportId], [WeekId]);
GO

CREATE INDEX [IX_CompanyEvaluation_SubmittedBy] ON [training].[CompanyEvaluation] ([SubmittedBy]);
GO

CREATE INDEX [IX_AcademicAssessment_EvaluationId_PlacementId] ON [training].[AcademicAssessment] ([EvaluationId], [PlacementId]);
GO

CREATE INDEX [IX_AcademicAssessment_SupervisorId] ON [training].[AcademicAssessment] ([SupervisorId]);
GO

CREATE INDEX [IX_CompletionApproval_AssessmentId_PlacementId_EvaluationId] ON [training].[CompletionApproval] ([AssessmentId], [PlacementId], [EvaluationId]);
GO

CREATE INDEX [IX_CompletionApproval_ApprovedBy] ON [training].[CompletionApproval] ([ApprovedBy]);
GO

CREATE INDEX [IX_QrSession_CompanyId] ON [attendance].[QrSession] ([CompanyId]);
GO

CREATE INDEX [IX_QrSession_PlacementId] ON [attendance].[QrSession] ([PlacementId]);
GO

CREATE INDEX [IX_QrSession_IssuedBy] ON [attendance].[QrSession] ([IssuedBy]);
GO

CREATE INDEX [IX_QrRedemption_RecordId_PlacementId] ON [attendance].[QrRedemption] ([RecordId], [PlacementId]);
GO

CREATE INDEX [IX_QrRedemption_ActorId] ON [attendance].[QrRedemption] ([ActorId]);
GO

CREATE INDEX [IX_AttendanceEvent_RecordId] ON [attendance].[AttendanceEvent] ([RecordId]);
GO

CREATE INDEX [IX_AttendanceEvent_ActorId] ON [attendance].[AttendanceEvent] ([ActorId]);
GO

CREATE UNIQUE INDEX [UX_CorrectionRequest_OpenRecord] ON [attendance].[CorrectionRequest] ([RecordId]) WHERE [ResolvedAt] IS NULL;
GO

CREATE INDEX [IX_CorrectionRequest_RecordId] ON [attendance].[CorrectionRequest] ([RecordId]);
GO

CREATE INDEX [IX_CorrectionRequest_StudentId] ON [attendance].[CorrectionRequest] ([StudentId]);
GO

CREATE INDEX [IX_CorrectionRequest_ResolvedBy] ON [attendance].[CorrectionRequest] ([ResolvedBy]);
GO

CREATE INDEX [IX_AcademicMeeting_AssignmentId_StudentId_SupervisorId_CollegeId] ON [meetings].[AcademicMeeting] ([AssignmentId], [StudentId], [SupervisorId], [CollegeId]);
GO

CREATE INDEX [IX_AcademicMeeting_MeetingId_CurrentRevision] ON [meetings].[AcademicMeeting] ([MeetingId], [CurrentRevision]);
GO

CREATE INDEX [IX_AcademicMeetingRevision_CreatedBy] ON [meetings].[AcademicMeetingRevision] ([CreatedBy]);
GO

CREATE INDEX [IX_AcademicMeetingEvent_MeetingId_RevisionNumber] ON [meetings].[AcademicMeetingEvent] ([MeetingId], [RevisionNumber]);
GO

CREATE INDEX [IX_AcademicMeetingEvent_ActorId] ON [meetings].[AcademicMeetingEvent] ([ActorId]);
GO

CREATE INDEX [IX_Ticket_RequesterId] ON [support].[Ticket] ([RequesterId]);
GO

CREATE INDEX [IX_Ticket_RecipientOrganizationId] ON [support].[Ticket] ([RecipientOrganizationId]);
GO

CREATE INDEX [IX_Ticket_RecipientSupervisorId] ON [support].[Ticket] ([RecipientSupervisorId]);
GO

CREATE INDEX [IX_Ticket_PlacementId] ON [support].[Ticket] ([PlacementId]);
GO

CREATE INDEX [IX_Ticket_ListingId] ON [support].[Ticket] ([ListingId]);
GO

CREATE INDEX [IX_Ticket_WeekId] ON [support].[Ticket] ([WeekId]);
GO

CREATE INDEX [IX_TicketMessage_Conversation] ON [support].[TicketMessage] ([TicketId], [SentAt]);
GO

CREATE INDEX [IX_TicketMessage_SenderId] ON [support].[TicketMessage] ([SenderId]);
GO

CREATE INDEX [IX_TicketEvent_TicketId] ON [support].[TicketEvent] ([TicketId]);
GO

CREATE INDEX [IX_TicketEvent_ActorId] ON [support].[TicketEvent] ([ActorId]);
GO

CREATE INDEX [IX_TicketEvent_RecipientSupervisorId] ON [support].[TicketEvent] ([RecipientSupervisorId]);
GO

CREATE INDEX [IX_Course_CourseId_CurrentVersion] ON [learning].[Course] ([CourseId], [CurrentVersion]);
GO

CREATE INDEX [IX_Lesson_ContentFileId] ON [learning].[Lesson] ([ContentFileId]);
GO

CREATE INDEX [IX_ProductCourse_CourseId_CourseVersion] ON [commerce].[ProductCourse] ([CourseId], [CourseVersion]);
GO

CREATE INDEX [IX_OrderItem_ProductId] ON [commerce].[OrderItem] ([ProductId]);
GO

CREATE INDEX [IX_OrderItemCourse_CourseId_CourseVersion] ON [commerce].[OrderItemCourse] ([CourseId], [CourseVersion]);
GO

CREATE UNIQUE INDEX [UX_Payment_SucceededOrder] ON [commerce].[Payment] ([OrderId]) WHERE [Status]=N'Succeeded';
GO

CREATE INDEX [IX_Payment_OrderId] ON [commerce].[Payment] ([OrderId]);
GO

CREATE INDEX [IX_PaymentEvent_PaymentId] ON [commerce].[PaymentEvent] ([PaymentId]);
GO

CREATE UNIQUE INDEX [UX_Enrollment_ActiveCourse] ON [learning].[Enrollment] ([StudentId], [CourseId]) WHERE [Status]<>N'Revoked';
GO

CREATE INDEX [IX_Enrollment_OrderItemId_CourseId_CourseVersion] ON [learning].[Enrollment] ([OrderItemId], [CourseId], [CourseVersion]);
GO

CREATE INDEX [IX_Enrollment_CourseId_CourseVersion] ON [learning].[Enrollment] ([CourseId], [CourseVersion]);
GO

CREATE INDEX [IX_LessonProgress_EnrollmentId_CourseId_CourseVersion] ON [learning].[LessonProgress] ([EnrollmentId], [CourseId], [CourseVersion]);
GO

CREATE INDEX [IX_LessonProgress_LessonId_CourseId_CourseVersion] ON [learning].[LessonProgress] ([LessonId], [CourseId], [CourseVersion]);
GO

CREATE INDEX [IX_CvMatchRun_CvVersionId_StudentId] ON [ai].[CvMatchRun] ([CvVersionId], [StudentId]);
GO

CREATE INDEX [IX_CvMatchRun_ListingId_ListingVersion] ON [ai].[CvMatchRun] ([ListingId], [ListingVersion]);
GO

CREATE INDEX [IX_CvMatchRun_ModelVersionId] ON [ai].[CvMatchRun] ([ModelVersionId]);
GO

CREATE INDEX [IX_AuditEvent_ActorTime] ON [core].[AuditEvent] ([ActorId], [CreatedAt]);
GO

CREATE INDEX [IX_AuditEvent_EntityTime] ON [core].[AuditEvent] ([EntityType], [EntityId], [CreatedAt]);
GO
