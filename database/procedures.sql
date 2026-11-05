-- Bridgeway SQL Server 2025 transactional write boundary.
-- Install after schema.sql. ActorId must come from a trusted authenticated backend.
-- SQL principals for frontend users are NOT created here. No passwords or secrets.
SET ANSI_NULLS ON;
SET QUOTED_IDENTIFIER ON;
GO
IF TYPE_ID(N'api.TextList') IS NULL EXEC(N'CREATE TYPE [api].[TextList] AS TABLE ([Ordinal] int NOT NULL PRIMARY KEY, [Value] nvarchar(300) NOT NULL);');
GO
IF TYPE_ID(N'api.ScheduleInput') IS NULL EXEC(N'CREATE TYPE [api].[ScheduleInput] AS TABLE ([WeekNumber] int NOT NULL PRIMARY KEY, [Title] nvarchar(160) NOT NULL, [Hours] int NOT NULL CHECK ([Hours] BETWEEN 1 AND 168));');
GO
IF TYPE_ID(N'api.AnswerInput') IS NULL EXEC(N'CREATE TYPE [api].[AnswerInput] AS TABLE ([Ordinal] int NOT NULL PRIMARY KEY, [Answer] nvarchar(3000) NOT NULL);');
GO
IF TYPE_ID(N'api.ObjectiveInput') IS NULL EXEC(N'CREATE TYPE [api].[ObjectiveInput] AS TABLE ([Ordinal] int NOT NULL PRIMARY KEY, [ObjectiveId] uniqueidentifier NULL, [Text] nvarchar(500) NOT NULL);');
GO
IF TYPE_ID(N'api.IdList') IS NULL EXEC(N'CREATE TYPE [api].[IdList] AS TABLE ([Id] uniqueidentifier NOT NULL PRIMARY KEY);');
GO
IF TYPE_ID(N'api.ScoreInput') IS NULL EXEC(N'CREATE TYPE [api].[ScoreInput] AS TABLE ([Criterion] tinyint NOT NULL PRIMARY KEY, [Score] tinyint NOT NULL);');
GO
IF TYPE_ID(N'api.AcademicInput') IS NULL EXEC(N'CREATE TYPE [api].[AcademicInput] AS TABLE ([Criterion] tinyint NOT NULL PRIMARY KEY, [Outcome] nvarchar(24) NOT NULL);');
GO
CREATE OR ALTER PROCEDURE [core].[AssertActor]
 @ActorId uniqueidentifier, @Role nvarchar(20) OUTPUT, @OrganizationId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;
 SELECT @Role=Role,@OrganizationId=OrganizationId FROM core.UserAccount WHERE UserId=@ActorId AND Status=N'Active';
 IF @Role IS NULL THROW 51001,'An active authenticated account is required.',1;
 IF @OrganizationId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.Organization WHERE OrganizationId=@OrganizationId AND Status=N'Active') THROW 51002,'The organization account is suspended.',1;
END;
GO
CREATE OR ALTER PROCEDURE [core].[RecordAudit] @ActorId uniqueidentifier,@Action nvarchar(300),@EntityType nvarchar(100),@EntityId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;
 INSERT core.AuditEvent(ActorId,ActorRole,Action,EntityType,EntityId) SELECT @ActorId,Role,@Action,@EntityType,@EntityId FROM core.UserAccount WHERE UserId=@ActorId;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CreateOrganization]
 @ActorId uniqueidentifier,@Kind nvarchar(16),@Name nvarchar(200),@ReferenceCode nvarchar(80),@City nvarchar(100),@Address nvarchar(400),@Phone nvarchar(30),@OrganizationId uniqueidentifier OUTPUT,@Website nvarchar(2048)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier; EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'PlatformAdmin' OR @Kind NOT IN(N'College',N'Company') OR LEN(TRIM(@Name))=0 THROW 51003,'Only Platform Admin can create a college or company.',1;
 BEGIN TRY
  BEGIN TRAN;
  SET @OrganizationId=NEWID();
  INSERT core.Organization(OrganizationId,Kind,Name,ReferenceCode,City,Address,Phone,Website,Status) VALUES(@OrganizationId,@Kind,@Name,@ReferenceCode,@City,@Address,@Phone,@Website,N'Active');
  IF @Kind=N'Company' INSERT core.Company(CompanyId) VALUES(@OrganizationId);
  ELSE BEGIN
   INSERT core.College(CollegeId) VALUES(@OrganizationId);
   INSERT training.CollegeProgram(CollegeId,CurrentVersion) VALUES(@OrganizationId,NULL);
   INSERT training.CollegeProgramVersion(CollegeId,VersionNumber,RequiredHours,MinimumWeeks,MaximumWeeklyHours,CreatedBy) VALUES(@OrganizationId,1,120,8,NULL,@ActorId);
   UPDATE training.CollegeProgram SET CurrentVersion=1 WHERE CollegeId=@OrganizationId;
  END;
  EXEC core.RecordAudit @ActorId,N'Organization created',N'Organization',@OrganizationId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CreateAccount]
 @ActorId uniqueidentifier,@Role nvarchar(20),@OrganizationId uniqueidentifier,@FullName nvarchar(160),@Email nvarchar(254),@UserId uniqueidentifier OUTPUT,
 @Phone nvarchar(30)=NULL,@AcademicNumber nvarchar(80)=NULL,@Faculty nvarchar(160)=NULL,@Department nvarchar(160)=NULL,@StudyYear nvarchar(12)=NULL,@Gpa decimal(3,2)=NULL,@AcademicTitle nvarchar(20)=NULL,@JobTitle nvarchar(160)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @ActorRole nvarchar(20),@ActorOrg uniqueidentifier; EXEC core.AssertActor @ActorId,@ActorRole OUTPUT,@ActorOrg OUTPUT;
 IF NOT ((@ActorRole=N'PlatformAdmin' AND @Role IN(N'CollegeAdmin',N'CompanyAdmin')) OR (@ActorRole=N'CollegeAdmin' AND @ActorOrg=@OrganizationId AND @Role IN(N'Student',N'Supervisor'))) THROW 51004,'This administrator cannot create that account.',1;
 IF LEN(TRIM(@FullName))=0 OR @Email NOT LIKE N'%_@_%._%' THROW 51005,'A name and institutional email are required.',1;
 IF (@Role=N'CompanyAdmin' AND NOT EXISTS(SELECT 1 FROM core.Company WHERE CompanyId=@OrganizationId)) OR (@Role IN(N'CollegeAdmin',N'Student',N'Supervisor') AND NOT EXISTS(SELECT 1 FROM core.College WHERE CollegeId=@OrganizationId)) THROW 51006,'Role and organization type do not match.',1;
 IF @Role IN(N'Student',N'Supervisor') AND (@Phone IS NULL OR @Faculty IS NULL OR @Department IS NULL) THROW 51007,'Academic identity and contact details are required.',1;
 BEGIN TRY
  BEGIN TRAN;
  SET @UserId=NEWID();
  INSERT core.UserAccount(UserId,OrganizationId,Role,FullName,Email,Phone,JobTitle,CreatedBy) VALUES(@UserId,@OrganizationId,@Role,TRIM(@FullName),LOWER(TRIM(@Email)),@Phone,@JobTitle,@ActorId);
  IF @Role=N'Student' BEGIN
   IF @AcademicNumber IS NULL OR LEN(@AcademicNumber)>40 OR @StudyYear IS NULL OR @Gpa IS NULL THROW 51008,'Student number, study year and GPA are required.',1;
   INSERT core.Student(UserId,CollegeId,StudentNumber,Faculty,Department,StudyYear,Gpa) VALUES(@UserId,@OrganizationId,@AcademicNumber,@Faculty,@Department,@StudyYear,@Gpa);
  END;
  IF @Role=N'Supervisor' BEGIN
   IF @AcademicTitle IS NULL THROW 51009,'An academic title is required.',1;
   INSERT core.Supervisor(UserId,CollegeId,StaffNumber,AcademicTitle,Faculty,Department) VALUES(@UserId,@OrganizationId,N'SUP-'+CONVERT(nvarchar(36),NEWID()),@AcademicTitle,@Faculty,@Department);
  END;
  EXEC core.RecordAudit @ActorId,N'Account created',N'UserAccount',@UserId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SetCollegeProgram]
 @ActorId uniqueidentifier,@RequiredHours int,@MinimumWeeks int,@MaximumWeeklyHours int=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@College uniqueidentifier,@Version int; EXEC core.AssertActor @ActorId,@Role OUTPUT,@College OUTPUT;
 IF @Role<>N'CollegeAdmin' THROW 51010,'Only your college administrator can change its program.',1;
 BEGIN TRY
  BEGIN TRAN;
  SELECT @Version=CurrentVersion+1 FROM training.CollegeProgram WITH(UPDLOCK,HOLDLOCK) WHERE CollegeId=@College;
  IF @Version IS NULL THROW 51011,'The college program is not initialized.',1;
  INSERT training.CollegeProgramVersion(CollegeId,VersionNumber,RequiredHours,MinimumWeeks,MaximumWeeklyHours,CreatedBy) VALUES(@College,@Version,@RequiredHours,@MinimumWeeks,NULLIF(@MaximumWeeklyHours,0),@ActorId);
  UPDATE training.CollegeProgram SET CurrentVersion=@Version WHERE CollegeId=@College;
  EXEC core.RecordAudit @ActorId,N'College training requirements changed',N'College',@College;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[AssignSupervisor]
 @ActorId uniqueidentifier,@StudentId uniqueidentifier,@SupervisorId uniqueidentifier=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@College uniqueidentifier,@Current uniqueidentifier; EXEC core.AssertActor @ActorId,@Role OUTPUT,@College OUTPUT;
 IF @Role<>N'CollegeAdmin' THROW 51012,'Only the student college administrator can assign a supervisor.',1;
 BEGIN TRY
  BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId AND CollegeId=@College) THROW 51013,'Student is outside your college.',1;
  IF @SupervisorId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM core.Supervisor s JOIN core.UserAccount u ON u.UserId=s.UserId WHERE s.SupervisorId=@SupervisorId AND s.CollegeId=@College AND u.Status=N'Active') THROW 51014,'Choose an active supervisor from this college.',1;
  SELECT @Current=SupervisorId FROM core.AcademicAssignment WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId AND EndedAt IS NULL;
  IF @Current=@SupervisorId OR (@Current IS NULL AND @SupervisorId IS NULL) BEGIN COMMIT; RETURN; END;
  UPDATE core.AcademicAssignment SET EndedAt=SYSUTCDATETIME(),EndedBy=@ActorId WHERE StudentId=@StudentId AND EndedAt IS NULL;
  IF @SupervisorId IS NOT NULL INSERT core.AcademicAssignment(StudentId,SupervisorId,CollegeId,CreatedBy) VALUES(@StudentId,@SupervisorId,@College,@ActorId);
  DECLARE @Routed TABLE(TicketId uniqueidentifier,OldStatus nvarchar(24),NewStatus nvarchar(24));
  UPDATE t SET RecipientSupervisorId=@SupervisorId,UpdatedAt=SYSUTCDATETIME()
   OUTPUT inserted.TicketId,deleted.Status,inserted.Status INTO @Routed
   FROM support.Ticket t JOIN core.Student s ON s.UserId=t.RequesterId WHERE s.StudentId=@StudentId AND t.Status<>N'Resolved';
  INSERT support.TicketEvent(TicketId,ActorId,Action,FromStatus,ToStatus,RecipientSupervisorId) SELECT TicketId,@ActorId,N'Reassigned',OldStatus,NewStatus,@SupervisorId FROM @Routed;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CreatePartnership]
 @ActorId uniqueidentifier,@CollegeId uniqueidentifier,@CompanyId uniqueidentifier,@PartnershipId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier; EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'PlatformAdmin' THROW 51015,'Only Platform Admin creates partnerships.',1;
 IF (SELECT COUNT(*) FROM core.Organization WHERE OrganizationId IN(@CollegeId,@CompanyId) AND Status=N'Active')<>2 THROW 51016,'Both organization accounts must be active.',1;
 BEGIN TRY BEGIN TRAN;
  SET @PartnershipId=NEWID();
  INSERT core.Partnership(PartnershipId,CollegeId,CompanyId,CreatedBy) VALUES(@PartnershipId,@CollegeId,@CompanyId,@ActorId);
  INSERT core.PartnershipEvent(PartnershipId,ActorId,Action) VALUES(@PartnershipId,@ActorId,N'Created');
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SetPartnershipStatus]
 @ActorId uniqueidentifier,@PartnershipId uniqueidentifier,@Status nvarchar(16),@Reason nvarchar(1000)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@College uniqueidentifier,@Company uniqueidentifier,@Old nvarchar(16); EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 BEGIN TRY BEGIN TRAN;
  SELECT @College=CollegeId,@Company=CompanyId,@Old=Status FROM core.Partnership WITH(UPDLOCK,HOLDLOCK) WHERE PartnershipId=@PartnershipId;
  IF @Old IS NULL OR @Status NOT IN(N'Active',N'Inactive') OR NOT(@Role=N'PlatformAdmin' OR (@Role=N'CollegeAdmin' AND @Org=@College) OR (@Role=N'CompanyAdmin' AND @Org=@Company AND @Status=N'Inactive')) THROW 51017,'This account cannot make that partnership change.',1;
  IF @Status=N'Active' AND (SELECT COUNT(*) FROM core.Organization WITH(HOLDLOCK) WHERE OrganizationId IN(@College,@Company) AND Status=N'Active')<>2 THROW 51018,'Both organization accounts must be active to resume.',1;
  IF @Status<>@Old BEGIN
   UPDATE core.Partnership SET Status=@Status WHERE PartnershipId=@PartnershipId;
   INSERT core.PartnershipEvent(PartnershipId,ActorId,Action,Reason) VALUES(@PartnershipId,@ActorId,CASE @Status WHEN N'Active' THEN N'Resumed' ELSE N'Paused' END,@Reason);
  END;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SubmitListingVersion]
 @ActorId uniqueidentifier,@ListingId uniqueidentifier OUTPUT,@Title nvarchar(160),@Category nvarchar(100),@City nvarchar(100),@Mode nvarchar(16),@Description nvarchar(max),@Capacity int,@Deadline date,
 @Schedule api.ScheduleInput READONLY,@Skills api.TextList READONLY,@Prerequisites api.TextList READONLY,@Questions api.TextList READONLY
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Company uniqueidentifier,@Version int,@Weeks int=(SELECT COUNT(*) FROM @Schedule); EXEC core.AssertActor @ActorId,@Role OUTPUT,@Company OUTPUT;
 IF @Role<>N'CompanyAdmin' THROW 51019,'Only a company administrator authors its listings.',1;
 IF @Weeks NOT BETWEEN 1 AND 52 OR (SELECT MIN(WeekNumber) FROM @Schedule)<>1 OR (SELECT MAX(WeekNumber) FROM @Schedule)<>@Weeks OR EXISTS(SELECT 1 FROM @Schedule WHERE LEN(TRIM(Title))=0) THROW 51020,'Provide one to fifty-two contiguous weeks with positive allocations and titles.',1;
 IF LEN(TRIM(@Title))=0 OR LEN(TRIM(@Description))=0 OR @Deadline<CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time') OR @Capacity NOT BETWEEN 1 AND 500 THROW 51021,'Listing details, capacity or deadline are invalid.',1;
 IF NOT EXISTS(SELECT 1 FROM @Skills) OR EXISTS(SELECT 1 FROM @Skills WHERE LEN(TRIM(Value))=0 OR LEN(Value)>80) OR EXISTS(SELECT 1 FROM @Questions WHERE Ordinal NOT BETWEEN 1 AND 10 OR LEN(TRIM(Value))=0) THROW 51022,'Add required skills and no more than ten nonempty questions.',1;
 BEGIN TRY BEGIN TRAN;
  IF @ListingId IS NULL BEGIN SET @ListingId=NEWID(); SET @Version=1; INSERT recruitment.Listing(ListingId,CompanyId,CurrentVersion,CreatedBy) VALUES(@ListingId,@Company,NULL,@ActorId); END
  ELSE BEGIN
   SELECT @Version=CurrentVersion+1 FROM recruitment.Listing WITH(UPDLOCK,HOLDLOCK) WHERE ListingId=@ListingId AND CompanyId=@Company AND Status<>N'Deleted';
   IF @Version IS NULL THROW 51023,'The listing is not editable by this company.',1;
  END;
  INSERT recruitment.ListingVersion(ListingId,VersionNumber,Title,Category,City,WorkplaceMode,Description,Capacity,ApplicationDeadline,CreatedBy) VALUES(@ListingId,@Version,@Title,@Category,@City,@Mode,@Description,@Capacity,@Deadline,@ActorId);
  INSERT recruitment.ListingScheduleWeek SELECT @ListingId,@Version,WeekNumber,Title,Hours FROM @Schedule;
  INSERT recruitment.ListingSkill SELECT @ListingId,@Version,Ordinal,Value FROM @Skills;
  INSERT recruitment.ListingPrerequisite SELECT @ListingId,@Version,Ordinal,Value FROM @Prerequisites;
  INSERT recruitment.ListingQuestion SELECT @ListingId,@Version,Ordinal,Value FROM @Questions;
  UPDATE recruitment.Listing SET CurrentVersion=@Version,Status=N'Pending review' WHERE ListingId=@ListingId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ModerateListing]
 @ActorId uniqueidentifier,@ListingId uniqueidentifier,@Decision nvarchar(20),@Reason nvarchar(2000)=NULL
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Company uniqueidentifier,@Old nvarchar(20),@Version int; EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 BEGIN TRY BEGIN TRAN;
  SELECT @Company=CompanyId,@Old=Status,@Version=CurrentVersion FROM recruitment.Listing WITH(UPDLOCK,HOLDLOCK) WHERE ListingId=@ListingId;
  IF NOT(@Role=N'PlatformAdmin' OR (@Role=N'CompanyAdmin' AND @Org=@Company AND @Decision=N'Paused')) THROW 51024,'This role cannot moderate that listing.',1;
  IF NOT ((@Decision=N'Published' AND @Old IN(N'Pending review',N'Paused')) OR (@Decision=N'Rejected' AND @Old=N'Pending review') OR (@Decision=N'Paused' AND @Old=N'Published')) THROW 51025,'This publication transition is not available.',1;
  IF @Decision<>N'Published' AND NULLIF(TRIM(@Reason),N'') IS NULL THROW 51026,'A reason is required.',1;
  UPDATE recruitment.Listing SET Status=@Decision WHERE ListingId=@ListingId;
  INSERT recruitment.ListingDecision(ListingId,VersionNumber,Decision,Reason,ActorId) VALUES(@ListingId,@Version,@Decision,@Reason,@ActorId);
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SetCollegeAvailability]
 @ActorId uniqueidentifier,@ListingId uniqueidentifier,@IsPaused bit
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@College uniqueidentifier; EXEC core.AssertActor @ActorId,@Role OUTPUT,@College OUTPUT;
 IF @Role<>N'CollegeAdmin' THROW 51027,'Only a college administrator changes local availability.',1;
 BEGIN TRY BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM recruitment.Listing WITH(HOLDLOCK) WHERE ListingId=@ListingId AND Status IN(N'Published',N'Paused')) THROW 51028,'Listing is unavailable.',1;
  UPDATE recruitment.CollegeAvailability WITH(UPDLOCK,HOLDLOCK) SET IsPaused=@IsPaused,UpdatedBy=@ActorId,UpdatedAt=SYSUTCDATETIME() WHERE CollegeId=@College AND ListingId=@ListingId;
  IF @@ROWCOUNT=0 INSERT recruitment.CollegeAvailability(CollegeId,ListingId,IsPaused,UpdatedBy) VALUES(@College,@ListingId,@IsPaused,@ActorId);
  EXEC core.RecordAudit @ActorId,N'College availability changed',N'Listing',@ListingId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[Apply]
 @ActorId uniqueidentifier,@ListingId uniqueidentifier,@CvVersionId uniqueidentifier,@Answers api.AnswerInput READONLY,@ApplicationId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@College uniqueidentifier,@Student uniqueidentifier,@Company uniqueidentifier,@Version int,@Program int,@Hours int,@Weeks int,@Max int; EXEC core.AssertActor @ActorId,@Role OUTPUT,@College OUTPUT;
 IF @Role<>N'Student' THROW 51029,'Only a student can apply.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorId;
  SELECT @Company=l.CompanyId,@Version=l.CurrentVersion FROM recruitment.Listing l WITH(UPDLOCK,HOLDLOCK) JOIN core.Organization o ON o.OrganizationId=l.CompanyId AND o.Status=N'Active' JOIN recruitment.ListingVersion v ON v.ListingId=l.ListingId AND v.VersionNumber=l.CurrentVersion WHERE l.ListingId=@ListingId AND l.Status=N'Published' AND v.ApplicationDeadline>=CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time');
  IF @Student IS NULL OR @Version IS NULL THROW 51030,'This published opportunity is not open for applications.',1;
  IF EXISTS(SELECT 1 FROM training.Placement WHERE StudentId=@Student AND Status=N'Active') THROW 51031,'An active placement already exists.',1;
  IF EXISTS(SELECT 1 FROM core.Partnership WITH(HOLDLOCK) WHERE CollegeId=@College AND CompanyId=@Company AND Status<>N'Active') OR EXISTS(SELECT 1 FROM recruitment.CollegeAvailability WITH(HOLDLOCK) WHERE CollegeId=@College AND ListingId=@ListingId AND IsPaused=1) THROW 51032,'This opportunity is paused for your college.',1;
  SELECT @Program=p.CurrentVersion,@Hours=v.RequiredHours,@Weeks=v.MinimumWeeks,@Max=v.MaximumWeeklyHours FROM training.CollegeProgram p WITH(HOLDLOCK) JOIN training.CollegeProgramVersion v ON v.CollegeId=p.CollegeId AND v.VersionNumber=p.CurrentVersion WHERE p.CollegeId=@College;
  IF @Program IS NULL THROW 51033,'College requirements are not configured.',1;
  IF (SELECT ISNULL(SUM(AllocatedHours),0) FROM recruitment.ListingScheduleWeek WHERE ListingId=@ListingId AND VersionNumber=@Version)<@Hours THROW 51034,'The listing schedule falls short of required college hours.',1;
  IF (SELECT COUNT(*) FROM recruitment.ListingScheduleWeek WHERE ListingId=@ListingId AND VersionNumber=@Version)<@Weeks THROW 51035,'The listing schedule has too few training weeks.',1;
  IF @Max IS NOT NULL AND EXISTS(SELECT 1 FROM recruitment.ListingScheduleWeek WHERE ListingId=@ListingId AND VersionNumber=@Version AND AllocatedHours>@Max) THROW 51036,'The listing exceeds the college weekly hour limit.',1;
  IF NOT EXISTS(SELECT 1 FROM core.StudentCvVersion WHERE CvVersionId=@CvVersionId AND StudentId=@Student) THROW 51037,'Select one of your own CV versions.',1;
  IF EXISTS(SELECT 1 FROM recruitment.ListingQuestion q LEFT JOIN @Answers a ON a.Ordinal=q.Ordinal WHERE q.ListingId=@ListingId AND q.VersionNumber=@Version AND NULLIF(TRIM(a.Answer),N'') IS NULL) OR EXISTS(SELECT 1 FROM @Answers a WHERE NOT EXISTS(SELECT 1 FROM recruitment.ListingQuestion q WHERE q.ListingId=@ListingId AND q.VersionNumber=@Version AND q.Ordinal=a.Ordinal)) THROW 51038,'Answer every application question, without additional question identifiers.',1;
  SET @ApplicationId=NEWID();
  INSERT recruitment.Application(ApplicationId,StudentId,CollegeId,CompanyId,ListingId,ListingVersion,ProgramVersion,RequiredHours,MinimumWeeks,MaximumWeeklyHours,CvVersionId,ProfileName,ProfilePhone,ProfileBio)
   SELECT @ApplicationId,@Student,@College,@Company,@ListingId,@Version,@Program,@Hours,@Weeks,@Max,@CvVersionId,COALESCE(p.DisplayName,u.FullName),COALESCE(p.Phone,u.Phone),p.Bio FROM core.UserAccount u LEFT JOIN core.StudentProfile p ON p.StudentId=@Student WHERE u.UserId=@ActorId;
  INSERT recruitment.ApplicationScheduleWeek SELECT @ApplicationId,WeekNumber,Title,AllocatedHours FROM recruitment.ListingScheduleWeek WHERE ListingId=@ListingId AND VersionNumber=@Version;
  INSERT recruitment.ApplicationAnswer SELECT @ApplicationId,q.Ordinal,q.Question,a.Answer FROM recruitment.ListingQuestion q JOIN @Answers a ON a.Ordinal=q.Ordinal WHERE q.ListingId=@ListingId AND q.VersionNumber=@Version;
  INSERT recruitment.ApplicationSkill SELECT @ApplicationId,Skill FROM core.StudentSkill WHERE StudentId=@Student;
  INSERT recruitment.ApplicationEvent(ApplicationId,ActorId,Action) VALUES(@ApplicationId,@ActorId,N'Applied');
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[DecideApplication]
 @ActorId uniqueidentifier,@ApplicationId uniqueidentifier,@Decision nvarchar(20)
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Company uniqueidentifier,@Student uniqueidentifier,@Listing uniqueidentifier,@Version int,@Lock uniqueidentifier,@Capacity int; EXEC core.AssertActor @ActorId,@Role OUTPUT,@Company OUTPUT;
 IF @Role<>N'CompanyAdmin' OR @Decision NOT IN(N'Accepted',N'Rejected') THROW 51039,'Only the host company makes this hiring decision.',1;
 SELECT @Student=StudentId FROM recruitment.Application WHERE ApplicationId=@ApplicationId AND CompanyId=@Company;
 BEGIN TRY BEGIN TRAN;
  SELECT @Lock=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@Student;
  SELECT @Listing=ListingId,@Version=ListingVersion FROM recruitment.Application WITH(UPDLOCK,HOLDLOCK) WHERE ApplicationId=@ApplicationId AND CompanyId=@Company AND Status=N'Pending';
  IF @Listing IS NULL THROW 51040,'Only your pending application may be decided.',1;
  IF @Decision=N'Accepted' BEGIN
   IF EXISTS(SELECT 1 FROM training.Placement WHERE StudentId=@Student AND Status=N'Active') OR EXISTS(SELECT 1 FROM recruitment.Application WHERE StudentId=@Student AND Status=N'Accepted') THROW 51041,'The student already has an accepted offer or active placement.',1;
   SELECT @Lock=ListingId FROM recruitment.Listing WITH(UPDLOCK,HOLDLOCK) WHERE ListingId=@Listing;
   SELECT @Capacity=Capacity FROM recruitment.ListingVersion WHERE ListingId=@Listing AND VersionNumber=@Version;
   IF (SELECT COUNT(*) FROM recruitment.Application a LEFT JOIN training.Placement p ON p.ApplicationId=a.ApplicationId WHERE a.ListingId=@Listing AND (a.Status=N'Accepted' OR p.Status=N'Active'))>=@Capacity THROW 51042,'No open places remain for this opportunity.',1;
   DECLARE @Closed TABLE(ApplicationId uniqueidentifier,Reason nvarchar(1000));
   UPDATE a SET Status=N'Closed',ClosedAt=SYSUTCDATETIME(),ClosedReason=N'Another company accepted this student.' OUTPUT inserted.ApplicationId,inserted.ClosedReason INTO @Closed FROM recruitment.Application a WHERE a.StudentId=@Student AND a.ApplicationId<>@ApplicationId AND a.Status=N'Pending';
   INSERT recruitment.ApplicationEvent(ApplicationId,ActorId,Action,Reason) SELECT ApplicationId,@ActorId,N'Automatically closed',Reason FROM @Closed;
  END;
  UPDATE recruitment.Application SET Status=@Decision,CompanyAcceptedAt=CASE WHEN @Decision=N'Accepted' THEN SYSUTCDATETIME() ELSE NULL END WHERE ApplicationId=@ApplicationId;
  INSERT recruitment.ApplicationEvent(ApplicationId,ActorId,Action) VALUES(@ApplicationId,@ActorId,@Decision);
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[WithdrawApplication] @ActorId uniqueidentifier,@ApplicationId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 BEGIN TRY BEGIN TRAN;
  UPDATE a WITH(UPDLOCK,HOLDLOCK) SET Status=N'Withdrawn',ClosedAt=SYSUTCDATETIME(),ClosedReason=N'Withdrawn by student.' FROM recruitment.Application a JOIN core.Student s ON s.StudentId=a.StudentId WHERE a.ApplicationId=@ApplicationId AND a.Status=N'Pending' AND s.UserId=@ActorId AND @Role=N'Student';
  IF @@ROWCOUNT<>1 THROW 51043,'Only your pending application can be withdrawn.',1;
  INSERT recruitment.ApplicationEvent(ApplicationId,ActorId,Action) VALUES(@ApplicationId,@ActorId,N'Withdrawn');COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ActivatePlacement]
 @ActorId uniqueidentifier,@ApplicationId uniqueidentifier,@PlacementId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Student uniqueidentifier,@College uniqueidentifier,@Company uniqueidentifier,@Listing uniqueidentifier,@Version int,@Lock uniqueidentifier;
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 SELECT @Student=StudentId FROM recruitment.Application WHERE ApplicationId=@ApplicationId;
 BEGIN TRY BEGIN TRAN;
  SELECT @Lock=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@Student;
  SELECT @College=a.CollegeId,@Company=a.CompanyId,@Listing=a.ListingId,@Version=a.ListingVersion FROM recruitment.Application a WITH(UPDLOCK,HOLDLOCK) JOIN core.Student s ON s.StudentId=a.StudentId WHERE a.ApplicationId=@ApplicationId AND a.Status=N'Accepted' AND ((@Role=N'Student' AND s.UserId=@ActorId) OR (@Role=N'CollegeAdmin' AND @Org=a.CollegeId));
  IF @Listing IS NULL THROW 51044,'Placement activation requires company acceptance and the student or their college administrator.',1;
  IF EXISTS(SELECT 1 FROM core.Partnership WITH(HOLDLOCK) WHERE CollegeId=@College AND CompanyId=@Company AND Status<>N'Active') THROW 51045,'This partnership is paused; new placement activation is blocked.',1;
  IF (SELECT COUNT(*) FROM core.Organization WITH(HOLDLOCK) WHERE OrganizationId IN(@College,@Company) AND Status=N'Active')<>2 THROW 51046,'Both organizations must be active for a new placement.',1;
  SET @PlacementId=NEWID();
  INSERT training.Placement(PlacementId,ApplicationId,StudentId,CollegeId,CompanyId,RoleTitle,RequiredHours,MinimumWeeks,MaximumWeeklyHours,StartDate,ActivatedBy)
   SELECT @PlacementId,a.ApplicationId,a.StudentId,a.CollegeId,a.CompanyId,v.Title,a.RequiredHours,a.MinimumWeeks,a.MaximumWeeklyHours,CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time'),@ActorId FROM recruitment.Application a JOIN recruitment.ListingVersion v ON v.ListingId=a.ListingId AND v.VersionNumber=a.ListingVersion WHERE a.ApplicationId=@ApplicationId;
  INSERT training.PlacementWeek(PlacementId,WeekNumber,AgreedTitle,AllocatedHours,WorkTitle,PlanRevision) SELECT @PlacementId,WeekNumber,Title,AllocatedHours,Title,1 FROM recruitment.ApplicationScheduleWeek WHERE ApplicationId=@ApplicationId;
  INSERT training.WeekPlanRevision(WeekId,RevisionNumber,WorkTitle,CreatedBy) SELECT WeekId,1,WorkTitle,@ActorId FROM training.PlacementWeek WHERE PlacementId=@PlacementId;
  UPDATE recruitment.Application SET Status=N'Placed' WHERE ApplicationId=@ApplicationId;
  INSERT recruitment.ApplicationEvent(ApplicationId,ActorId,Action) VALUES(@ApplicationId,@ActorId,N'Placement activated');
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [training].[AssertWritableWeek]
 @ActorId uniqueidentifier,@WeekId uniqueidentifier,@AllowStudent bit=0
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier; EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF NOT EXISTS(SELECT 1 FROM training.PlacementWeek w WITH(UPDLOCK,HOLDLOCK) JOIN training.Placement p WITH(UPDLOCK,HOLDLOCK) ON p.PlacementId=w.PlacementId JOIN core.Student s ON s.StudentId=p.StudentId WHERE w.WeekId=@WeekId AND w.Status IN(N'Draft',N'Revision') AND p.Status=N'Active' AND ((@Role=N'CompanyAdmin' AND p.CompanyId=@Org) OR (@AllowStudent=1 AND @Role=N'Student' AND s.UserId=@ActorId))) THROW 51100,'The week is read-only or outside your active placement.',1;
END;
GO
CREATE OR ALTER PROCEDURE [api].[UpdateWeekPlan]
 @ActorId uniqueidentifier,@WeekId uniqueidentifier,@Title nvarchar(160),@Objectives api.ObjectiveInput READONLY
AS
BEGIN
 SET NOCOUNT ON; SET XACT_ABORT ON;
 IF LEN(TRIM(@Title))=0 OR NOT EXISTS(SELECT 1 FROM @Objectives) OR EXISTS(SELECT 1 FROM @Objectives WHERE LEN(TRIM(Text))=0 OR Ordinal<1) THROW 51101,'Provide a week title and distinct checklist objectives.',1;
 IF EXISTS(SELECT Text FROM @Objectives GROUP BY Text HAVING COUNT(*)>1) THROW 51102,'Objective wording must be distinct within a week.',1;
 BEGIN TRY BEGIN TRAN;
  EXEC training.AssertWritableWeek @ActorId,@WeekId;
  IF EXISTS(SELECT 1 FROM @Objectives o WHERE o.ObjectiveId IS NOT NULL AND NOT EXISTS(SELECT 1 FROM training.Objective e WHERE e.ObjectiveId=o.ObjectiveId AND e.WeekId=@WeekId AND e.RemovedAt IS NULL)) THROW 51103,'An objective belongs to another week or was removed.',1;
  DECLARE @Revision int; DECLARE @Rows TABLE(ObjectiveId uniqueidentifier,Ordinal int,Text nvarchar(500));
  SELECT @Revision=PlanRevision+1 FROM training.PlacementWeek WHERE WeekId=@WeekId;
  INSERT @Rows SELECT COALESCE(ObjectiveId,NEWID()),Ordinal,Text FROM @Objectives;
  UPDATE training.Objective SET RemovedAt=SYSUTCDATETIME() WHERE WeekId=@WeekId AND RemovedAt IS NULL AND ObjectiveId NOT IN(SELECT ObjectiveId FROM @Rows);
  UPDATE e SET IsComplete=CASE WHEN e.Text=r.Text THEN e.IsComplete ELSE 0 END,Evidence=CASE WHEN e.Text=r.Text THEN e.Evidence ELSE NULL END,Text=r.Text,Ordinal=r.Ordinal,UpdatedAt=SYSUTCDATETIME() FROM training.Objective e JOIN @Rows r ON r.ObjectiveId=e.ObjectiveId;
  INSERT training.Objective(ObjectiveId,WeekId,Ordinal,Text) SELECT r.ObjectiveId,@WeekId,r.Ordinal,r.Text FROM @Rows r WHERE NOT EXISTS(SELECT 1 FROM training.Objective e WHERE e.ObjectiveId=r.ObjectiveId);
  INSERT training.WeekPlanRevision(WeekId,RevisionNumber,WorkTitle,CreatedBy) VALUES(@WeekId,@Revision,@Title,@ActorId);
  INSERT training.WeekPlanObjective SELECT @WeekId,@Revision,ObjectiveId,Ordinal,Text FROM @Rows;
  UPDATE training.PlacementWeek SET WorkTitle=@Title,PlanRevision=@Revision WHERE WeekId=@WeekId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK; THROW; END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SetObjectiveResult] @ActorId uniqueidentifier,@ObjectiveId uniqueidentifier,@IsComplete bit,@Evidence nvarchar(500)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Week uniqueidentifier;SELECT @Week=WeekId FROM training.Objective WHERE ObjectiveId=@ObjectiveId AND RemovedAt IS NULL;
 BEGIN TRY BEGIN TRAN;EXEC training.AssertWritableWeek @ActorId,@Week;
 UPDATE training.Objective SET IsComplete=@IsComplete,Evidence=@Evidence,UpdatedAt=SYSUTCDATETIME() WHERE ObjectiveId=@ObjectiveId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SaveTask]
 @ActorId uniqueidentifier,@WeekId uniqueidentifier,@TaskId uniqueidentifier OUTPUT,@Title nvarchar(120),@Instructions nvarchar(2000)=NULL,@DueDate date=NULL,@Remove bit=0
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 IF LEN(TRIM(@Title))=0 THROW 51104,'A task title is required.',1;
 BEGIN TRY BEGIN TRAN;
  EXEC training.AssertWritableWeek @ActorId,@WeekId;
  IF @TaskId IS NULL BEGIN SET @TaskId=NEWID();INSERT training.Task(TaskId,WeekId,CreatedBy) VALUES(@TaskId,@WeekId,@ActorId);END;
  IF NOT EXISTS(SELECT 1 FROM training.Task WHERE TaskId=@TaskId AND WeekId=@WeekId AND RemovedAt IS NULL) THROW 51105,'Task is unavailable in this week.',1;
  IF @Remove=1 UPDATE training.Task SET RemovedAt=SYSUTCDATETIME() WHERE TaskId=@TaskId;
  ELSE BEGIN
   DECLARE @Revision int=(SELECT ISNULL(MAX(RevisionNumber),0)+1 FROM training.TaskRevision WHERE TaskId=@TaskId);
   INSERT training.TaskRevision(TaskId,RevisionNumber,Title,Instructions,DueDate,CreatedBy) VALUES(@TaskId,@Revision,@Title,@Instructions,@DueDate,@ActorId);
  END;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[AttachTaskPdf] @ActorId uniqueidentifier,@TaskId uniqueidentifier,@FileId uniqueidentifier,@AttachmentId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Week uniqueidentifier;SELECT @Week=WeekId FROM training.Task WHERE TaskId=@TaskId AND RemovedAt IS NULL;
 BEGIN TRY BEGIN TRAN;EXEC training.AssertWritableWeek @ActorId,@Week,1;
  IF NOT EXISTS(SELECT 1 FROM core.FileAsset WHERE FileId=@FileId AND OwnerId=@ActorId AND ByteSize<=1048576 AND MediaType=N'application/pdf' AND FileName LIKE N'%.pdf' AND StorageState IN(N'MetadataOnly',N'Available')) THROW 51106,'Use an owned PDF of up to one MB. The upload service must validate file bytes.',1;
  SET @AttachmentId=NEWID();INSERT training.TaskAttachment(AttachmentId,TaskId,FileId,OwnerId) VALUES(@AttachmentId,@TaskId,@FileId,@ActorId);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RemoveTaskAttachment] @ActorId uniqueidentifier,@AttachmentId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Week uniqueidentifier;SELECT @Week=t.WeekId FROM training.TaskAttachment f JOIN training.Task t ON t.TaskId=f.TaskId WHERE f.AttachmentId=@AttachmentId AND f.OwnerId=@ActorId AND t.RemovedAt IS NULL;
 BEGIN TRY BEGIN TRAN;EXEC training.AssertWritableWeek @ActorId,@Week,1;
  IF EXISTS(SELECT 1 FROM training.SubmissionFile WHERE AttachmentId=@AttachmentId) THROW 51107,'Submitted attachment references must be retained.',1;
  UPDATE training.TaskAttachment SET RemovedAt=SYSUTCDATETIME() WHERE AttachmentId=@AttachmentId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SubmitTask]
 @ActorId uniqueidentifier,@TaskId uniqueidentifier,@Description nvarchar(3000),@WorkUrl nvarchar(2048),@Attachments api.IdList READONLY,@SubmissionId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Week uniqueidentifier,@Version int,@Revision int,@Last uniqueidentifier,@Role nvarchar(20),@Org uniqueidentifier;
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Student' THROW 51108,'Only the placed student submits work.',1;
 SELECT @Week=t.WeekId FROM training.Task t JOIN training.PlacementWeek w ON w.WeekId=t.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId JOIN core.Student s ON s.StudentId=p.StudentId WHERE t.TaskId=@TaskId AND t.RemovedAt IS NULL AND s.UserId=@ActorId;
 BEGIN TRY BEGIN TRAN;EXEC training.AssertWritableWeek @ActorId,@Week,1;
  SELECT TOP(1) @Last=SubmissionId FROM training.TaskSubmission WHERE TaskId=@TaskId ORDER BY VersionNumber DESC;
  IF @Last IS NOT NULL AND NOT EXISTS(SELECT 1 FROM training.TaskReview WHERE SubmissionId=@Last AND Outcome=N'Changes requested') THROW 51109,'Wait for a company revision request before resubmitting.',1;
  IF EXISTS(SELECT 1 FROM @Attachments a WHERE NOT EXISTS(SELECT 1 FROM training.TaskAttachment f WHERE f.AttachmentId=a.Id AND f.TaskId=@TaskId AND f.OwnerId=@ActorId AND f.RemovedAt IS NULL)) THROW 51110,'Submission files must be your own active task attachments.',1;
  IF NULLIF(TRIM(@Description),N'') IS NULL AND NULLIF(TRIM(@WorkUrl),N'') IS NULL AND NOT EXISTS(SELECT 1 FROM @Attachments) THROW 51111,'Add a description, work link or PDF.',1;
  SELECT @Version=ISNULL(MAX(VersionNumber),0)+1 FROM training.TaskSubmission WHERE TaskId=@TaskId;
  SELECT @Revision=MAX(RevisionNumber) FROM training.TaskRevision WHERE TaskId=@TaskId;
  SET @SubmissionId=NEWID();INSERT training.TaskSubmission(SubmissionId,TaskId,VersionNumber,TaskRevision,Description,WorkUrl,SubmittedBy) VALUES(@SubmissionId,@TaskId,@Version,@Revision,NULLIF(TRIM(@Description),N''),NULLIF(TRIM(@WorkUrl),N''),@ActorId);
  INSERT training.SubmissionFile SELECT @SubmissionId,@TaskId,Id FROM @Attachments;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ReviewTask] @ActorId uniqueidentifier,@SubmissionId uniqueidentifier,@Outcome nvarchar(24),@Feedback nvarchar(3000)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Week uniqueidentifier,@Task uniqueidentifier,@Version int;
 SELECT @Week=t.WeekId,@Task=t.TaskId,@Version=s.VersionNumber FROM training.TaskSubmission s JOIN training.Task t ON t.TaskId=s.TaskId WHERE s.SubmissionId=@SubmissionId AND t.RemovedAt IS NULL;
 BEGIN TRY BEGIN TRAN;EXEC training.AssertWritableWeek @ActorId,@Week;
  IF EXISTS(SELECT 1 FROM training.TaskSubmission WHERE TaskId=@Task AND VersionNumber>@Version) THROW 51112,'Only the latest submission may be reviewed.',1;
  INSERT training.TaskReview(SubmissionId,Outcome,Feedback,ReviewedBy) VALUES(@SubmissionId,@Outcome,NULLIF(TRIM(@Feedback),N''),@ActorId);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER FUNCTION [training].[HasIncompleteTasks](@PlacementId uniqueidentifier,@WeekId uniqueidentifier)
RETURNS bit
AS
BEGIN
 DECLARE @Missing bit=0;
 IF EXISTS(SELECT 1 FROM training.Task t JOIN training.PlacementWeek w ON w.WeekId=t.WeekId OUTER APPLY(SELECT TOP(1) s.SubmissionId FROM training.TaskSubmission s WHERE s.TaskId=t.TaskId ORDER BY s.VersionNumber DESC) latest LEFT JOIN training.TaskReview r ON r.SubmissionId=latest.SubmissionId WHERE w.PlacementId=@PlacementId AND (@WeekId IS NULL OR w.WeekId=@WeekId) AND t.RemovedAt IS NULL AND ISNULL(r.Outcome,N'')<>N'Completed') SET @Missing=1;
 RETURN @Missing;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SubmitWeeklyReport] @ActorId uniqueidentifier,@WeekId uniqueidentifier,@Feedback nvarchar(3000),@ReportId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Placement uniqueidentifier,@Hours int,@Plan int,@Number int;
 IF NULLIF(TRIM(@Feedback),N'') IS NULL THROW 51113,'Weekly feedback is required.',1;
 BEGIN TRY BEGIN TRAN;EXEC training.AssertWritableWeek @ActorId,@WeekId;
  SELECT @Placement=PlacementId,@Hours=AllocatedHours,@Plan=PlanRevision FROM training.PlacementWeek WHERE WeekId=@WeekId;
  IF training.HasIncompleteTasks(@Placement,@WeekId)=1 THROW 51114,'Every active task needs a latest company review of Completed.',1;
  SELECT @Number=ISNULL(MAX(SubmissionNumber),0)+1 FROM training.WeeklyReport WHERE WeekId=@WeekId;
  SET @ReportId=NEWID();INSERT training.WeeklyReport(ReportId,WeekId,SubmissionNumber,PlanRevision,ReportedHours,CompanyFeedback,SubmittedBy) VALUES(@ReportId,@WeekId,@Number,@Plan,@Hours,@Feedback,@ActorId);
  INSERT training.ReportObjective SELECT @ReportId,ObjectiveId,@WeekId,Text,IsComplete,Evidence FROM training.Objective WHERE WeekId=@WeekId AND RemovedAt IS NULL;
  UPDATE training.PlacementWeek SET Status=N'Submitted' WHERE WeekId=@WeekId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ReviewWeeklyReport] @ActorId uniqueidentifier,@ReportId uniqueidentifier,@Decision nvarchar(20),@Notes nvarchar(3000)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Week uniqueidentifier,@Placement uniqueidentifier,@Supervisor uniqueidentifier,@Student uniqueidentifier,@Hours int;
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Supervisor' THROW 51115,'Only the assigned academic supervisor reviews reports.',1;
 SELECT @Week=WeekId FROM training.WeeklyReport WHERE ReportId=@ReportId;
 BEGIN TRY BEGIN TRAN;
  SELECT @Placement=w.PlacementId,@Hours=w.AllocatedHours,@Student=p.StudentId FROM training.PlacementWeek w WITH(UPDLOCK,HOLDLOCK) JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.WeekId=@Week AND w.Status=N'Submitted' AND p.Status=N'Active';
  SELECT @Supervisor=s.SupervisorId FROM core.Supervisor s JOIN core.AcademicAssignment a WITH(HOLDLOCK) ON a.SupervisorId=s.SupervisorId AND a.StudentId=@Student AND a.EndedAt IS NULL WHERE s.UserId=@ActorId;
  IF @Supervisor IS NULL OR @Placement IS NULL OR EXISTS(SELECT 1 FROM training.ReportReview WHERE ReportId=@ReportId) OR NOT EXISTS(SELECT 1 FROM training.WeeklyReport WHERE ReportId=@ReportId AND ReportedHours=@Hours AND SubmissionNumber=(SELECT MAX(SubmissionNumber) FROM training.WeeklyReport WHERE WeekId=@Week)) THROW 51116,'This report is not awaiting your review.',1;
  IF @Decision NOT IN(N'Verified',N'Revision requested') THROW 51117,'Choose verification or revision.',1;
  IF @Decision=N'Verified' AND training.HasIncompleteTasks(@Placement,@Week)=1 THROW 51118,'Incomplete tasks block verification.',1;
  INSERT training.ReportReview(ReportId,SupervisorId,Decision,Notes) VALUES(@ReportId,@Supervisor,@Decision,NULLIF(TRIM(@Notes),N''));
  IF @Decision=N'Verified' INSERT training.HourVerification(WeekId,ReportId,VerifiedHours) VALUES(@Week,@ReportId,@Hours);
  UPDATE training.PlacementWeek SET Status=CASE @Decision WHEN N'Verified' THEN N'Verified' ELSE N'Revision' END WHERE WeekId=@Week;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SetReportVisibility] @ActorId uniqueidentifier,@IsRestricted bit
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Supervisor uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Supervisor' THROW 51119,'Only a supervisor changes their report policy.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Supervisor=SupervisorId FROM core.Supervisor WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorId;
  UPDATE training.ReportVisibility SET IsRestricted=@IsRestricted,UpdatedAt=SYSUTCDATETIME() WHERE SupervisorId=@Supervisor;
  IF @@ROWCOUNT=0 INSERT training.ReportVisibility(SupervisorId,IsRestricted) VALUES(@Supervisor,@IsRestricted);EXEC core.RecordAudit @ActorId,N'Supervisor report visibility changed',N'Supervisor',@Supervisor;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SubmitCompanyEvaluation] @ActorId uniqueidentifier,@PlacementId uniqueidentifier,@Scores api.ScoreInput READONLY,@Comments nvarchar(3000),@EvaluationId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Company uniqueidentifier,@Version int,@Lock uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Company OUTPUT;
 IF @Role<>N'CompanyAdmin' OR (SELECT COUNT(*) FROM @Scores)<>8 OR EXISTS(SELECT 1 FROM @Scores WHERE Criterion NOT BETWEEN 1 AND 8 OR Score NOT BETWEEN 1 AND 5) THROW 51120,'The company must rate all eight criteria from one to five.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Lock=PlacementId FROM training.Placement WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@PlacementId AND CompanyId=@Company AND Status=N'Active';
  IF @Lock IS NULL OR EXISTS(SELECT 1 FROM training.Certificate WHERE PlacementId=@PlacementId) OR NOT EXISTS(SELECT 1 FROM training.PlacementWeek WHERE PlacementId=@PlacementId) OR EXISTS(SELECT 1 FROM training.PlacementWeek w LEFT JOIN training.HourVerification h ON h.WeekId=w.WeekId WHERE w.PlacementId=@PlacementId AND (w.Status<>N'Verified' OR h.VerifiedHours IS NULL OR h.VerifiedHours<>w.AllocatedHours)) OR training.HasIncompleteTasks(@PlacementId,NULL)=1 THROW 51121,'All agreed reports, allocations and tasks must be verified before evaluation.',1;
  SELECT @Version=ISNULL(MAX(VersionNumber),0)+1 FROM training.CompanyEvaluation WHERE PlacementId=@PlacementId;
  SET @EvaluationId=NEWID();INSERT training.CompanyEvaluation(EvaluationId,PlacementId,VersionNumber,Comments,SubmittedBy) VALUES(@EvaluationId,@PlacementId,@Version,@Comments,@ActorId);
  INSERT training.CompanyEvaluationScore SELECT @EvaluationId,Criterion,Score FROM @Scores;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ForwardAcademicAssessment] @ActorId uniqueidentifier,@PlacementId uniqueidentifier,@Criteria api.AcademicInput READONLY,@Notes nvarchar(3000),@AssessmentId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Supervisor uniqueidentifier,@Evaluation uniqueidentifier,@Student uniqueidentifier,@Version int;
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Supervisor' OR (SELECT COUNT(*) FROM @Criteria)<>3 OR EXISTS(SELECT 1 FROM @Criteria WHERE Criterion NOT BETWEEN 1 AND 3 OR Outcome NOT IN(N'Meets requirements',N'Needs follow-up')) OR NULLIF(TRIM(@Notes),N'') IS NULL THROW 51122,'Complete all three academic outcomes and assessment notes.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=StudentId FROM training.Placement WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@PlacementId AND Status IN(N'Active',N'Completed');
  SELECT @Supervisor=s.SupervisorId FROM core.Supervisor s JOIN core.AcademicAssignment a WITH(HOLDLOCK) ON a.SupervisorId=s.SupervisorId AND a.StudentId=@Student AND a.EndedAt IS NULL WHERE s.UserId=@ActorId;
  SELECT TOP(1) @Evaluation=EvaluationId FROM training.CompanyEvaluation WHERE PlacementId=@PlacementId ORDER BY VersionNumber DESC;
  IF @Student IS NULL OR @Supervisor IS NULL OR @Evaluation IS NULL OR EXISTS(SELECT 1 FROM training.Certificate WHERE PlacementId=@PlacementId) THROW 51123,'This company evaluation is unavailable for your academic assessment.',1;
  SELECT @Version=ISNULL(MAX(VersionNumber),0)+1 FROM training.AcademicAssessment WHERE PlacementId=@PlacementId;
  SET @AssessmentId=NEWID();INSERT training.AcademicAssessment(AssessmentId,PlacementId,EvaluationId,SupervisorId,VersionNumber,Notes) VALUES(@AssessmentId,@PlacementId,@Evaluation,@Supervisor,@Version,@Notes);
  INSERT training.AcademicCriterion SELECT @AssessmentId,Criterion,Outcome FROM @Criteria;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ApproveCompletion] @ActorId uniqueidentifier,@PlacementId uniqueidentifier,@Confirmed bit,@CertificateId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@College uniqueidentifier,@Student uniqueidentifier,@Hours int,@Required int,@Evaluation uniqueidentifier,@Assessment uniqueidentifier;
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@College OUTPUT;
 IF @Role<>N'CollegeAdmin' OR @Confirmed<>1 THROW 51124,'Explicit college completion confirmation is required.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=StudentId,@Required=RequiredHours FROM training.Placement WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@PlacementId AND CollegeId=@College AND Status=N'Active';
  SELECT @Hours=ISNULL(SUM(h.VerifiedHours),0) FROM training.PlacementWeek w LEFT JOIN training.HourVerification h ON h.WeekId=w.WeekId WHERE w.PlacementId=@PlacementId;
  SELECT TOP(1) @Evaluation=EvaluationId FROM training.CompanyEvaluation WHERE PlacementId=@PlacementId ORDER BY VersionNumber DESC;
  SELECT TOP(1) @Assessment=AssessmentId FROM training.AcademicAssessment WHERE PlacementId=@PlacementId ORDER BY VersionNumber DESC;
  IF @Student IS NULL OR @Hours<@Required OR @Evaluation IS NULL OR @Assessment IS NULL OR NOT EXISTS(SELECT 1 FROM training.AcademicAssessment WHERE AssessmentId=@Assessment AND EvaluationId=@Evaluation) OR (SELECT COUNT(*) FROM training.AcademicCriterion WHERE AssessmentId=@Assessment AND Outcome=N'Meets requirements')<>3 OR training.HasIncompleteTasks(@PlacementId,NULL)=1 OR NOT EXISTS(SELECT 1 FROM training.PlacementWeek WHERE PlacementId=@PlacementId) OR EXISTS(SELECT 1 FROM training.PlacementWeek w LEFT JOIN training.HourVerification h ON h.WeekId=w.WeekId WHERE w.PlacementId=@PlacementId AND (w.Status<>N'Verified' OR h.VerifiedHours IS NULL OR h.VerifiedHours<>w.AllocatedHours)) THROW 51125,'Completion prerequisites are not all satisfied.',1;
  INSERT training.CompletionApproval(PlacementId,EvaluationId,AssessmentId,ApprovedBy) VALUES(@PlacementId,@Evaluation,@Assessment,@ActorId);
  SET @CertificateId=NEWID();
  INSERT training.Certificate(CertificateId,PlacementId,SerialNumber,StudentName,StudentNumber,CollegeName,CompanyName,RoleTitle,StartDate,EndDate,VerifiedHours)
   SELECT @CertificateId,p.PlacementId,N'BW-'+CONVERT(nvarchar(36),@CertificateId),u.FullName,s.StudentNumber,col.Name,co.Name,p.RoleTitle,p.StartDate,CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time'),@Hours FROM training.Placement p JOIN core.Student s ON s.StudentId=p.StudentId JOIN core.UserAccount u ON u.UserId=s.UserId JOIN core.Organization col ON col.OrganizationId=p.CollegeId JOIN core.Organization co ON co.OrganizationId=p.CompanyId WHERE p.PlacementId=@PlacementId;
  UPDATE training.Placement SET Status=N'Completed',EndDate=CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time') WHERE PlacementId=@PlacementId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[EndPlacement] @ActorId uniqueidentifier,@PlacementId uniqueidentifier,@Reason nvarchar(1500)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@College uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@College OUTPUT;
 IF @Role<>N'CollegeAdmin' OR NULLIF(TRIM(@Reason),N'') IS NULL THROW 51126,'A college administrator must record an end reason.',1;
 BEGIN TRY BEGIN TRAN;
  UPDATE training.Placement WITH(UPDLOCK,HOLDLOCK) SET Status=N'Left',EndReason=@Reason,EndDate=CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time') WHERE PlacementId=@PlacementId AND CollegeId=@College AND Status=N'Active';
  IF @@ROWCOUNT<>1 THROW 51127,'Choose an active placement in your own college.',1;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[IssueAttendanceQr]
 @ActorId uniqueidentifier,@Kind nvarchar(16),@Action nvarchar(16),@PlacementId uniqueidentifier=NULL,@SessionId uniqueidentifier OUTPUT,@Token varbinary(32) OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Company uniqueidentifier,@Lock uniqueidentifier,@Now datetime2(3)=SYSUTCDATETIME(),@Date date=CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time');
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Company OUTPUT;
 IF @Role<>N'CompanyAdmin' OR @Kind NOT IN(N'Individual',N'Shared') OR @Action NOT IN(N'CheckIn',N'CheckOut') THROW 51200,'Only the host company issues valid attendance codes.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Lock=CompanyId FROM core.Company WITH(UPDLOCK,HOLDLOCK) WHERE CompanyId=@Company;
  SET @Now=SYSUTCDATETIME();SET @Date=CONVERT(date,@Now AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time');
  IF @Kind=N'Individual' AND NOT EXISTS(SELECT 1 FROM training.Placement WITH(HOLDLOCK) WHERE PlacementId=@PlacementId AND CompanyId=@Company AND Status=N'Active') THROW 51201,'Choose one of your active placements.',1;
  IF @Kind=N'Shared' BEGIN SET @PlacementId=NULL;IF NOT EXISTS(SELECT 1 FROM training.Placement WHERE CompanyId=@Company AND Status=N'Active') THROW 51202,'There are no active interns for this shared code.',1;END;
  UPDATE attendance.QrSession SET Status=N'Replaced' WHERE CompanyId=@Company AND Kind=@Kind AND Action=@Action AND Status=N'Open' AND (PlacementId=@PlacementId OR (@PlacementId IS NULL AND PlacementId IS NULL));
  SET @Token=CRYPT_GEN_RANDOM(32);SET @SessionId=NEWID();
  INSERT attendance.QrSession(SessionId,CompanyId,PlacementId,Kind,Action,TrainingDate,TokenHash,IssuedAt,ExpiresAt,IssuedBy) VALUES(@SessionId,@Company,@PlacementId,@Kind,@Action,@Date,HASHBYTES('SHA2_256',@Token),@Now,DATEADD(second,120,@Now),@ActorId);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CloseAttendanceQr] @ActorId uniqueidentifier,@SessionId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 UPDATE attendance.QrSession SET Status=N'Closed' WHERE SessionId=@SessionId AND CompanyId=@Org AND @Role=N'CompanyAdmin' AND Status=N'Open';
 IF @@ROWCOUNT<>1 THROW 51203,'Only the issuing company closes an open code.',1;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RedeemAttendanceQr] @ActorId uniqueidentifier,@Token varbinary(32),@RecordId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Session uniqueidentifier,@Company uniqueidentifier,@Placement uniqueidentifier,@Kind nvarchar(16),@Action nvarchar(16),@Expires datetime2(3),@Date date,@Now datetime2(3)=SYSUTCDATETIME(),@State nvarchar(16),@In datetime2(3),@Out datetime2(3);
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;SET @RecordId=NULL;
 BEGIN TRY BEGIN TRAN;
  SELECT @Session=SessionId,@Company=CompanyId,@Placement=PlacementId,@Kind=Kind,@Action=Action,@Expires=ExpiresAt,@Date=TrainingDate,@State=Status FROM attendance.QrSession WITH(UPDLOCK,HOLDLOCK) WHERE TokenHash=HASHBYTES('SHA2_256',@Token);
  SET @Now=SYSUTCDATETIME();
  IF @Session IS NULL OR @State<>N'Open' THROW 51204,'Attendance code is unavailable, consumed, closed or replaced.',1;
  IF @Expires<=@Now OR @Date<>CONVERT(date,@Now AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time') THROW 51205,'This attendance code has expired.',1;
  IF @Kind=N'Individual' AND NOT(@Role=N'CompanyAdmin' AND @Org=@Company) THROW 51206,'Only the issuing company scans an individual student code.',1;
  IF @Kind=N'Shared' BEGIN
   IF @Role<>N'Student' THROW 51207,'Shared company codes are scanned from a student account.',1;
   SELECT @Placement=p.PlacementId FROM training.Placement p WITH(UPDLOCK,HOLDLOCK) JOIN core.Student s ON s.StudentId=p.StudentId WHERE s.UserId=@ActorId AND p.CompanyId=@Company AND p.Status=N'Active';
  END;
  IF @Placement IS NULL OR NOT EXISTS(SELECT 1 FROM training.Placement WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@Placement AND CompanyId=@Company AND Status=N'Active' AND StartDate<=@Date) THROW 51208,'Code does not belong to a current eligible placement.',1;
  SELECT @RecordId=RecordId,@In=CheckInAt,@Out=CheckOutAt FROM attendance.AttendanceRecord WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@Placement AND TrainingDate=@Date;
  IF (@Action=N'CheckIn' AND @In IS NOT NULL) OR (@Action=N'CheckOut' AND (@In IS NULL OR @Out IS NOT NULL)) THROW 51209,'Duplicate attendance or check-out without an open check-in is not allowed.',1;
  IF @RecordId IS NULL BEGIN SET @RecordId=NEWID();INSERT attendance.AttendanceRecord(RecordId,PlacementId,TrainingDate,Status) VALUES(@RecordId,@Placement,@Date,N'Present');END;
  UPDATE attendance.AttendanceRecord SET Status=N'Present',CheckInAt=CASE @Action WHEN N'CheckIn' THEN @Now ELSE CheckInAt END,CheckOutAt=CASE @Action WHEN N'CheckOut' THEN @Now ELSE CheckOutAt END WHERE RecordId=@RecordId;
  INSERT attendance.QrRedemption(SessionId,PlacementId,RecordId,ActorId) VALUES(@Session,@Placement,@RecordId,@ActorId);
  INSERT attendance.AttendanceEvent(RecordId,ActorId,Action,AfterStatus) VALUES(@RecordId,@ActorId,@Action,N'Present');
  IF @Kind=N'Individual' UPDATE attendance.QrSession SET Status=N'Consumed' WHERE SessionId=@Session;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CorrectAttendance] @ActorId uniqueidentifier,@PlacementId uniqueidentifier,@Date date,@Status nvarchar(16),@Reason nvarchar(1000)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Company uniqueidentifier,@Record uniqueidentifier,@Old nvarchar(16);EXEC core.AssertActor @ActorId,@Role OUTPUT,@Company OUTPUT;
 IF @Role<>N'CompanyAdmin' OR @Status NOT IN(N'Present',N'Absent',N'Excused') OR NULLIF(TRIM(@Reason),N'') IS NULL THROW 51210,'Host-company corrections require a status and reason.',1;
 BEGIN TRY BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM training.Placement WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@PlacementId AND CompanyId=@Company AND Status=N'Active' AND StartDate<=@Date) OR @Date>CONVERT(date,SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time') THROW 51211,'Choose a valid date in your active placement, up to today.',1;
  SELECT @Record=RecordId,@Old=Status FROM attendance.AttendanceRecord WITH(UPDLOCK,HOLDLOCK) WHERE PlacementId=@PlacementId AND TrainingDate=@Date;
  IF @Record IS NULL BEGIN SET @Record=NEWID();INSERT attendance.AttendanceRecord(RecordId,PlacementId,TrainingDate,Status) VALUES(@Record,@PlacementId,@Date,@Status);END;
  ELSE UPDATE attendance.AttendanceRecord SET Status=@Status WHERE RecordId=@Record;
  INSERT attendance.AttendanceEvent(RecordId,ActorId,Action,BeforeStatus,AfterStatus,Reason) VALUES(@Record,@ActorId,N'Correction',@Old,@Status,@Reason);
  UPDATE attendance.CorrectionRequest SET ResolvedAt=SYSUTCDATETIME(),ResolvedBy=@ActorId WHERE RecordId=@Record AND ResolvedAt IS NULL;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RequestAttendanceCorrection] @ActorId uniqueidentifier,@RecordId uniqueidentifier,@Reason nvarchar(1000)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Student uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=s.StudentId FROM attendance.AttendanceRecord r WITH(UPDLOCK,HOLDLOCK) JOIN training.Placement p ON p.PlacementId=r.PlacementId JOIN core.Student s ON s.StudentId=p.StudentId WHERE r.RecordId=@RecordId AND s.UserId=@ActorId;
  IF @Role<>N'Student' OR @Student IS NULL OR NULLIF(TRIM(@Reason),N'') IS NULL THROW 51212,'A student may flag only their own recorded attendance.',1;
  INSERT attendance.CorrectionRequest(RecordId,StudentId,Reason) VALUES(@RecordId,@Student,@Reason);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[AcademicMeetingAction]
 @ActorId uniqueidentifier,@MeetingId uniqueidentifier OUTPUT,@Action nvarchar(24),@StudentId uniqueidentifier=NULL,@Title nvarchar(120)=NULL,@StartsAt datetime2(3)=NULL,@DurationMinutes int=NULL,@ZoomUrl nvarchar(2048)=NULL,@Agenda nvarchar(2000)=NULL,@Note nvarchar(1000)=NULL,@AlternativeStartsAt datetime2(3)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Supervisor uniqueidentifier,@Assignment uniqueidentifier,@Revision int,@State nvarchar(24),@CurrentStart datetime2(3),@CurrentDuration int,@Lock uniqueidentifier;
 EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Action NOT IN(N'Save',N'Confirmed',N'Reschedule requested',N'Cancelled',N'Completed') THROW 51213,'Unknown academic meeting action.',1;
 BEGIN TRY BEGIN TRAN;
  IF @MeetingId IS NOT NULL SELECT @StudentId=m.StudentId,@Supervisor=m.SupervisorId,@Assignment=m.AssignmentId,@Revision=m.CurrentRevision,@State=m.Status,@CurrentStart=r.StartsAt,@CurrentDuration=r.DurationMinutes FROM meetings.AcademicMeeting m WITH(UPDLOCK,HOLDLOCK) JOIN meetings.AcademicMeetingRevision r ON r.MeetingId=m.MeetingId AND r.RevisionNumber=m.CurrentRevision WHERE m.MeetingId=@MeetingId;
  ELSE BEGIN
   SELECT @Assignment=a.AssignmentId,@Supervisor=a.SupervisorId FROM core.AcademicAssignment a JOIN core.Supervisor s ON s.SupervisorId=a.SupervisorId WHERE a.StudentId=@StudentId AND a.EndedAt IS NULL AND s.UserId=@ActorId;
   SET @Revision=0;SET @State=N'Requested';
  END;
  SELECT @Lock=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@StudentId;
  SELECT @Lock=SupervisorId FROM core.Supervisor WITH(UPDLOCK,HOLDLOCK) WHERE SupervisorId=@Supervisor;
  IF @Assignment IS NULL OR NOT EXISTS(SELECT 1 FROM core.AcademicAssignment WITH(HOLDLOCK) WHERE AssignmentId=@Assignment AND EndedAt IS NULL) OR @State NOT IN(N'Requested',N'Confirmed',N'Reschedule requested') THROW 51214,'This request is closed or belongs to a previous academic assignment.',1;
  IF @Action IN(N'Save',N'Cancelled',N'Completed') AND NOT EXISTS(SELECT 1 FROM core.Supervisor WHERE SupervisorId=@Supervisor AND UserId=@ActorId AND @Role=N'Supervisor') THROW 51215,'Only the original currently assigned supervisor manages this meeting.',1;
  IF @Action IN(N'Confirmed',N'Reschedule requested') AND NOT EXISTS(SELECT 1 FROM core.Student WHERE StudentId=@StudentId AND UserId=@ActorId AND @Role=N'Student') THROW 51216,'Only this student responds to the request.',1;
  IF @Action=N'Save' BEGIN
   DECLARE @Slash int=CHARINDEX(N'/',@ZoomUrl,9),@Host nvarchar(2048),@Path nvarchar(2048);
   SET @Host=LOWER(SUBSTRING(@ZoomUrl,9,CASE WHEN @Slash>9 THEN @Slash-9 ELSE 0 END));SET @Path=SUBSTRING(@ZoomUrl,CASE WHEN @Slash>0 THEN @Slash ELSE 1 END,2048);
   IF @StartsAt IS NULL OR @StartsAt<=SYSUTCDATETIME() OR @DurationMinutes NOT IN(15,30,45,60,90) OR NULLIF(TRIM(@Title),N'') IS NULL OR @ZoomUrl IS NULL OR LEFT(@ZoomUrl,8)<>N'https://' OR NOT(@Host=N'zoom.us' OR RIGHT(@Host,8)=N'.zoom.us') OR CHARINDEX(N'@',@Host)>0 OR CHARINDEX(N':',@Host)>0 OR NOT(@Path LIKE N'/j/[A-Za-z0-9]%' OR @Path LIKE N'/my/[A-Za-z0-9]%' OR @Path LIKE N'/wc/[A-Za-z0-9]%') THROW 51217,'Provide a future Amman-scheduled time, duration and a real HTTPS Zoom meeting URL.',1;
   IF EXISTS(SELECT 1 FROM meetings.AcademicMeeting m JOIN core.AcademicAssignment a ON a.AssignmentId=m.AssignmentId AND a.EndedAt IS NULL JOIN meetings.AcademicMeetingRevision r ON r.MeetingId=m.MeetingId AND r.RevisionNumber=m.CurrentRevision WHERE (@MeetingId IS NULL OR m.MeetingId<>@MeetingId) AND (m.SupervisorId=@Supervisor OR m.StudentId=@StudentId) AND m.Status IN(N'Requested',N'Confirmed',N'Reschedule requested') AND @StartsAt<DATEADD(minute,r.DurationMinutes,r.StartsAt) AND DATEADD(minute,@DurationMinutes,@StartsAt)>r.StartsAt) THROW 51218,'This time overlaps another active academic meeting.',1;
   IF @MeetingId IS NULL BEGIN SET @MeetingId=NEWID();INSERT meetings.AcademicMeeting(MeetingId,AssignmentId,StudentId,SupervisorId,CollegeId,CurrentRevision) SELECT @MeetingId,@Assignment,@StudentId,@Supervisor,CollegeId,NULL FROM core.AcademicAssignment WHERE AssignmentId=@Assignment;END;
   SET @Revision=@Revision+1;
   INSERT meetings.AcademicMeetingRevision(MeetingId,RevisionNumber,Title,StartsAt,DurationMinutes,ZoomUrl,Agenda,CreatedBy) VALUES(@MeetingId,@Revision,@Title,@StartsAt,@DurationMinutes,@ZoomUrl,@Agenda,@ActorId);
   UPDATE meetings.AcademicMeeting SET Status=N'Requested',CurrentRevision=@Revision WHERE MeetingId=@MeetingId;
  END ELSE BEGIN
   IF @Action=N'Confirmed' AND (@State<>N'Requested' OR @CurrentStart<=SYSUTCDATETIME()) THROW 51219,'Only a future requested meeting can be confirmed.',1;
   IF @Action IN(N'Reschedule requested',N'Cancelled') AND NULLIF(TRIM(@Note),N'') IS NULL THROW 51220,'Explain the reschedule or cancellation.',1;
   IF @AlternativeStartsAt IS NOT NULL AND @AlternativeStartsAt<=SYSUTCDATETIME() THROW 51221,'The proposed alternative must be in the future.',1;
   IF @Action=N'Reschedule requested' AND @State=N'Reschedule requested' THROW 51222,'Another-time request is already pending.',1;
   IF @Action=N'Completed' AND (@State<>N'Confirmed' OR DATEADD(minute,@CurrentDuration,@CurrentStart)>SYSUTCDATETIME()) THROW 51223,'A confirmed meeting can be completed only after its scheduled end.',1;
   UPDATE meetings.AcademicMeeting SET Status=@Action WHERE MeetingId=@MeetingId;
  END;
  INSERT meetings.AcademicMeetingEvent(MeetingId,RevisionNumber,ActorId,Action,Note,AlternativeStartsAt) VALUES(@MeetingId,@Revision,@ActorId,CASE @Action WHEN N'Save' THEN N'Requested' ELSE @Action END,@Note,@AlternativeStartsAt);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[InterviewAction]
 @ActorId uniqueidentifier,@ApplicationId uniqueidentifier,@Action nvarchar(24),@StartsAt datetime2(3)=NULL,@DurationMinutes int=NULL,@Mode nvarchar(16)=NULL,@Location nvarchar(300)=NULL,@MeetingUrl nvarchar(2048)=NULL,@Preparation nvarchar(1000)=NULL,@Note nvarchar(1000)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Company uniqueidentifier,@StudentUser uniqueidentifier,@Interview uniqueidentifier,@Revision int,@State nvarchar(24);EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 BEGIN TRY BEGIN TRAN;
  SELECT @Company=a.CompanyId,@StudentUser=s.UserId FROM recruitment.Application a WITH(UPDLOCK,HOLDLOCK) JOIN core.Student s ON s.StudentId=a.StudentId WHERE a.ApplicationId=@ApplicationId AND a.Status=N'Pending';
  IF @Company IS NULL THROW 51224,'Interviews can change only while the application is pending.',1;
  SELECT @Interview=InterviewId,@Revision=CurrentRevision,@State=Status FROM recruitment.Interview WITH(UPDLOCK,HOLDLOCK) WHERE ApplicationId=@ApplicationId;
  IF @Action=N'Save' BEGIN
   IF @Role<>N'CompanyAdmin' OR @Org<>@Company OR @StartsAt IS NULL OR @StartsAt<=SYSUTCDATETIME() OR @DurationMinutes NOT IN(15,30,45,60) THROW 51225,'Only the host company schedules a future interview.',1;
   IF @Interview IS NULL BEGIN SET @Interview=NEWID();SET @Revision=0;INSERT recruitment.Interview(InterviewId,ApplicationId,CurrentRevision) VALUES(@Interview,@ApplicationId,NULL);END;
   SET @Revision=@Revision+1;
   INSERT recruitment.InterviewRevision(InterviewId,RevisionNumber,StartsAt,DurationMinutes,Mode,Location,MeetingUrl,Preparation,CreatedBy) VALUES(@Interview,@Revision,@StartsAt,@DurationMinutes,@Mode,@Location,@MeetingUrl,@Preparation,@ActorId);
   UPDATE recruitment.Interview SET Status=N'Requested',CurrentRevision=@Revision WHERE InterviewId=@Interview;
  END ELSE BEGIN
   IF @Interview IS NULL OR @State IN(N'Cancelled',N'Completed') THROW 51226,'This interview is unavailable for a response.',1;
   IF @Action=N'Cancelled' BEGIN IF @Role<>N'CompanyAdmin' OR @Org<>@Company THROW 51227,'Only the host company cancels this interview.',1;END
   ELSE IF @Action IN(N'Confirmed',N'Reschedule requested') BEGIN
    IF @ActorId<>@StudentUser OR @Role<>N'Student' OR (@Action=N'Confirmed' AND @State<>N'Requested') THROW 51228,'Only this student can respond to a requested interview.',1;
    IF NOT EXISTS(SELECT 1 FROM recruitment.InterviewRevision WHERE InterviewId=@Interview AND RevisionNumber=@Revision AND DATEADD(minute,DurationMinutes,StartsAt)>SYSUTCDATETIME()) THROW 51229,'The interview time has passed.',1;
    IF @Action=N'Reschedule requested' AND NULLIF(TRIM(@Note),N'') IS NULL THROW 51230,'Explain the requested alternative time.',1;
   END ELSE THROW 51231,'Unknown interview action.',1;
   UPDATE recruitment.Interview SET Status=@Action WHERE InterviewId=@Interview;
  END;
  INSERT recruitment.InterviewEvent(InterviewId,RevisionNumber,ActorId,Action,Note) VALUES(@Interview,@Revision,@ActorId,CASE @Action WHEN N'Save' THEN N'Requested' ELSE @Action END,@Note);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER FUNCTION [support].[IsHandler](@ActorId uniqueidentifier,@TicketId uniqueidentifier) RETURNS bit
AS
BEGIN
 DECLARE @Yes bit=0;
 IF EXISTS(SELECT 1 FROM support.Ticket t JOIN core.UserAccount u ON u.UserId=@ActorId AND u.Status=N'Active' LEFT JOIN core.Supervisor s ON s.UserId=u.UserId WHERE t.TicketId=@TicketId AND t.RequesterId<>@ActorId AND u.Role=t.RecipientRole AND (t.RecipientRole=N'PlatformAdmin' OR (t.RecipientRole=N'CollegeAdmin' AND u.OrganizationId=t.RecipientOrganizationId) OR (t.RecipientRole=N'Supervisor' AND s.SupervisorId=t.RecipientSupervisorId))) SET @Yes=1;
 RETURN @Yes;
END;
GO
CREATE OR ALTER PROCEDURE [api].[OpenTicket] @ActorId uniqueidentifier,@Subject nvarchar(120),@Body nvarchar(3000),@TicketId uniqueidentifier OUTPUT,@Category nvarchar(40)=N'General support',@Context nvarchar(180)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Recipient nvarchar(20),@Sup uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role=N'PlatformAdmin' OR NULLIF(TRIM(@Subject),N'') IS NULL OR NULLIF(TRIM(@Body),N'') IS NULL THROW 51232,'A requester account, subject and message are required.',1;
 SET @Recipient=CASE @Role WHEN N'Student' THEN N'Supervisor' WHEN N'Supervisor' THEN N'CollegeAdmin' ELSE N'PlatformAdmin' END;
 BEGIN TRY BEGIN TRAN;
  IF @Role=N'Student' SELECT @Sup=a.SupervisorId FROM core.AcademicAssignment a WITH(UPDLOCK,HOLDLOCK) JOIN core.Student s ON s.StudentId=a.StudentId WHERE s.UserId=@ActorId AND a.EndedAt IS NULL;
  SET @TicketId=NEWID();INSERT support.Ticket(TicketId,RequesterId,Subject,Category,Context,RecipientRole,RecipientOrganizationId,RecipientSupervisorId) VALUES(@TicketId,@ActorId,@Subject,@Category,@Context,@Recipient,CASE WHEN @Recipient=N'PlatformAdmin' THEN NULL ELSE @Org END,@Sup);
  INSERT support.TicketMessage(TicketId,SenderId,Body) VALUES(@TicketId,@ActorId,@Body);
  INSERT support.TicketEvent(TicketId,ActorId,Action,ToStatus,RecipientSupervisorId) VALUES(@TicketId,@ActorId,N'Opened',N'In progress',@Sup);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ReplyTicket] @ActorId uniqueidentifier,@TicketId uniqueidentifier,@Body nvarchar(3000)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Requester uniqueidentifier,@Old nvarchar(24),@New nvarchar(24);EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF NULLIF(TRIM(@Body),N'') IS NULL THROW 51233,'A reply cannot be empty.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Requester=RequesterId,@Old=Status FROM support.Ticket WITH(UPDLOCK,HOLDLOCK) WHERE TicketId=@TicketId;
  IF @Requester IS NULL OR @Old=N'Resolved' OR NOT(@Requester=@ActorId OR support.IsHandler(@ActorId,@TicketId)=1) THROW 51234,'This closed or private conversation cannot receive your reply.',1;
  SET @New=CASE WHEN @Requester=@ActorId THEN N'In progress' ELSE N'Awaiting requester' END;
  INSERT support.TicketMessage(TicketId,SenderId,Body) VALUES(@TicketId,@ActorId,@Body);
  UPDATE support.Ticket SET Status=@New,UpdatedAt=SYSUTCDATETIME() WHERE TicketId=@TicketId;
  INSERT support.TicketEvent(TicketId,ActorId,Action,FromStatus,ToStatus) VALUES(@TicketId,@ActorId,N'Replied',@Old,@New);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[ResolveTicket] @ActorId uniqueidentifier,@TicketId uniqueidentifier,@Confirmed bit
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Old nvarchar(24),@Last uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 BEGIN TRY BEGIN TRAN;
  SELECT @Old=Status FROM support.Ticket WITH(UPDLOCK,HOLDLOCK) WHERE TicketId=@TicketId;
  SELECT TOP(1) @Last=SenderId FROM support.TicketMessage WHERE TicketId=@TicketId ORDER BY MessageNumber DESC;
  IF @Confirmed<>1 OR @Old IS NULL OR @Old=N'Resolved' OR support.IsHandler(@ActorId,@TicketId)=0 OR @Last<>@ActorId THROW 51235,'Only the handler who last replied may explicitly confirm resolution.',1;
  UPDATE support.Ticket SET Status=N'Resolved',ResolvedAt=SYSUTCDATETIME(),UpdatedAt=SYSUTCDATETIME() WHERE TicketId=@TicketId;
  INSERT support.TicketEvent(TicketId,ActorId,Action,FromStatus,ToStatus) VALUES(@TicketId,@ActorId,N'Resolved',@Old,N'Resolved');COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CreateOrder] @ActorId uniqueidentifier,@Products api.IdList READONLY,@CheckoutKey nvarchar(100),@OrderId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Currency char(3),@Total decimal(19,4);EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Student' OR NOT EXISTS(SELECT 1 FROM @Products) OR NULLIF(TRIM(@CheckoutKey),N'') IS NULL THROW 51300,'A student checkout requires selected products and an idempotency key.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @OrderId=OrderId FROM commerce.PurchaseOrder WITH(UPDLOCK,HOLDLOCK) WHERE BuyerId=@ActorId AND CheckoutKey=@CheckoutKey;
  IF @OrderId IS NOT NULL BEGIN COMMIT;RETURN;END;
  IF EXISTS(SELECT 1 FROM @Products x LEFT JOIN commerce.Product p WITH(HOLDLOCK) ON p.ProductId=x.Id WHERE p.ProductId IS NULL OR p.Status<>N'Active') OR (SELECT COUNT(DISTINCT p.Currency) FROM commerce.Product p JOIN @Products x ON x.Id=p.ProductId)<>1 THROW 51301,'Choose active products quoted in one currency.',1;
  IF EXISTS(SELECT 1 FROM @Products x WHERE NOT EXISTS(SELECT 1 FROM commerce.ProductCourse pc JOIN learning.Course c ON c.CourseId=pc.CourseId AND c.Status=N'Published' WHERE pc.ProductId=x.Id)) THROW 51302,'Every product needs published course content.',1;
  SELECT @Currency=MIN(p.Currency),@Total=SUM(p.Price) FROM commerce.Product p JOIN @Products x ON x.Id=p.ProductId;
  SET @OrderId=NEWID();INSERT commerce.PurchaseOrder(OrderId,BuyerId,Currency,TotalAmount,CheckoutKey) VALUES(@OrderId,@ActorId,@Currency,@Total,@CheckoutKey);
  INSERT commerce.OrderItem(OrderId,ProductId,ProductTitle,UnitPrice) SELECT @OrderId,p.ProductId,p.Title,p.Price FROM commerce.Product p JOIN @Products x ON x.Id=p.ProductId;
  INSERT commerce.OrderItemCourse SELECT oi.OrderItemId,pc.CourseId,pc.CourseVersion FROM commerce.OrderItem oi JOIN commerce.ProductCourse pc ON pc.ProductId=oi.ProductId WHERE oi.OrderId=@OrderId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
-- Worker-only: the backend must verify the provider webhook signature BEFORE calling.
CREATE OR ALTER PROCEDURE [api].[ConfirmPayment] @OrderId uniqueidentifier,@Provider nvarchar(40),@ProviderPaymentId nvarchar(160),@ProviderEventId nvarchar(160),@Amount decimal(19,4),@Currency char(3)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @State nvarchar(20),@Expected decimal(19,4),@ExpectedCurrency char(3),@Buyer uniqueidentifier,@Student uniqueidentifier,@Payment uniqueidentifier;
 BEGIN TRY BEGIN TRAN;
  SELECT @State=Status,@Expected=TotalAmount,@ExpectedCurrency=Currency,@Buyer=BuyerId FROM commerce.PurchaseOrder WITH(UPDLOCK,HOLDLOCK) WHERE OrderId=@OrderId;
  IF EXISTS(SELECT 1 FROM commerce.PaymentEvent WHERE Provider=@Provider AND ProviderEventId=@ProviderEventId) BEGIN
   IF NOT EXISTS(SELECT 1 FROM commerce.PaymentEvent e JOIN commerce.Payment p ON p.PaymentId=e.PaymentId WHERE e.Provider=@Provider AND e.ProviderEventId=@ProviderEventId AND p.OrderId=@OrderId AND p.ProviderPaymentId=@ProviderPaymentId AND p.Amount=@Amount AND p.Currency=@Currency) THROW 51303,'Provider event was already used for different payment details.',1;
   COMMIT;RETURN;
  END;
  IF @State IS NULL OR @State NOT IN(N'Pending',N'Paid') OR @Amount<>@Expected OR @Currency<>@ExpectedCurrency THROW 51304,'Verified payment amount and currency must match the order.',1;
  SELECT @Student=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@Buyer;
  IF @Student IS NULL THROW 51305,'The order buyer has no student identity.',1;
  SELECT @Payment=PaymentId FROM commerce.Payment WHERE OrderId=@OrderId AND Status=N'Succeeded';
  IF @Payment IS NOT NULL AND NOT EXISTS(SELECT 1 FROM commerce.Payment WHERE PaymentId=@Payment AND Provider=@Provider AND ProviderPaymentId=@ProviderPaymentId) THROW 51306,'This order already has a successful payment.',1;
  IF @Payment IS NULL BEGIN SET @Payment=NEWID();INSERT commerce.Payment(PaymentId,OrderId,Provider,ProviderPaymentId,Status,Amount,Currency,ConfirmedAt) VALUES(@Payment,@OrderId,@Provider,@ProviderPaymentId,N'Succeeded',@Amount,@Currency,SYSUTCDATETIME());END;
  INSERT commerce.PaymentEvent(PaymentId,Provider,ProviderEventId,EventType) VALUES(@Payment,@Provider,@ProviderEventId,N'Payment confirmed');
  UPDATE commerce.PurchaseOrder SET Status=N'Paid',PaidAt=COALESCE(PaidAt,SYSUTCDATETIME()) WHERE OrderId=@OrderId;
  ;WITH Entitled AS(SELECT ic.*,ROW_NUMBER() OVER(PARTITION BY ic.CourseId ORDER BY oi.OrderItemId) AS Choice FROM commerce.OrderItem oi JOIN commerce.OrderItemCourse ic ON ic.OrderItemId=oi.OrderItemId WHERE oi.OrderId=@OrderId)
  INSERT learning.Enrollment(StudentId,CourseId,CourseVersion,OrderItemId) SELECT @Student,e.CourseId,e.CourseVersion,e.OrderItemId FROM Entitled e WHERE e.Choice=1 AND NOT EXISTS(SELECT 1 FROM learning.Enrollment en WITH(UPDLOCK,HOLDLOCK) WHERE en.StudentId=@Student AND en.CourseId=e.CourseId AND en.Status<>N'Revoked');COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RequestCvMatch] @ActorId uniqueidentifier,@CvVersionId uniqueidentifier,@ListingId uniqueidentifier,@ModelVersionId uniqueidentifier,@RequestKey nvarchar(100),@RunId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Student uniqueidentifier,@Version int;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Student' THROW 51307,'Only the CV owner requests role matching.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorId;
  SELECT @RunId=RunId FROM ai.CvMatchRun WITH(UPDLOCK,HOLDLOCK) WHERE StudentId=@Student AND RequestKey=@RequestKey;
  IF @RunId IS NOT NULL BEGIN COMMIT;RETURN;END;
  IF NOT EXISTS(SELECT 1 FROM core.StudentCvVersion cv JOIN core.FileAsset f ON f.FileId=cv.FileId WHERE cv.CvVersionId=@CvVersionId AND cv.StudentId=@Student AND f.StorageState=N'Available' AND f.ByteSize<=5242880) THROW 51308,'Metadata-only CV selections cannot be analyzed; an available document is required.',1;
  SELECT @Version=CurrentVersion FROM recruitment.Listing WITH(HOLDLOCK) WHERE ListingId=@ListingId AND Status=N'Published';
  IF @Version IS NULL THROW 51309,'Select a published opportunity.',1;
  SET @RunId=NEWID();INSERT ai.CvMatchRun(RunId,StudentId,CvVersionId,ListingId,ListingVersion,ModelVersionId,RequestKey) VALUES(@RunId,@Student,@CvVersionId,@ListingId,@Version,@ModelVersionId,@RequestKey);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[CompleteCvMatch] @RunId uniqueidentifier,@Succeeded bit,@RoleFitScore decimal(5,2)=NULL,@Summary nvarchar(3000)=NULL,@FailureReason nvarchar(1000)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 BEGIN TRY BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM ai.CvMatchRun WITH(UPDLOCK,HOLDLOCK) WHERE RunId=@RunId AND Status IN(N'Pending',N'Running')) THROW 51310,'This matching job is already closed or unavailable.',1;
  IF @Succeeded=1 BEGIN
   IF @RoleFitScore IS NULL OR @RoleFitScore NOT BETWEEN 0 AND 100 THROW 51311,'Provide a real model role-fit score from zero to one hundred.',1;
   INSERT ai.CvMatchResult(RunId,RoleFitScore,Summary) VALUES(@RunId,@RoleFitScore,@Summary);
  END ELSE IF NULLIF(TRIM(@FailureReason),N'') IS NULL THROW 51312,'Record why the matching attempt failed.',1;
  UPDATE ai.CvMatchRun SET Status=CASE @Succeeded WHEN 1 THEN N'Succeeded' ELSE N'Failed' END,StartedAt=COALESCE(StartedAt,SYSUTCDATETIME()),FinishedAt=SYSUTCDATETIME(),FailureReason=@FailureReason WHERE RunId=@RunId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[QueueNotification] @ActorId uniqueidentifier,@RecipientId uniqueidentifier,@Channel nvarchar(16),@TemplateKey nvarchar(100),@Subject nvarchar(200),@Body nvarchar(4000),@IdempotencyKey nvarchar(160),@NotificationId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'PlatformAdmin' THROW 51313,'Notification queuing is a trusted administration/service operation.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @NotificationId=NotificationId FROM notifications.Notification WITH(UPDLOCK,HOLDLOCK) WHERE RecipientId=@RecipientId AND Channel=@Channel AND IdempotencyKey=@IdempotencyKey;
  IF @NotificationId IS NULL BEGIN SET @NotificationId=NEWID();INSERT notifications.Notification(NotificationId,RecipientId,Channel,TemplateKey,Subject,Body,IdempotencyKey) VALUES(@NotificationId,@RecipientId,@Channel,@TemplateKey,@Subject,@Body,@IdempotencyKey);END;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RecordDeliveryAttempt] @NotificationId uniqueidentifier,@Provider nvarchar(80),@Status nvarchar(16),@ProviderMessageId nvarchar(160)=NULL,@FailureReason nvarchar(1000)=NULL
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Number int;
 BEGIN TRY BEGIN TRAN;
  IF NOT EXISTS(SELECT 1 FROM notifications.Notification WITH(UPDLOCK,HOLDLOCK) WHERE NotificationId=@NotificationId AND Status IN(N'Pending',N'Attempted',N'Failed')) THROW 51314,'Delivered or cancelled notifications cannot be dispatched again.',1;
  IF @Status NOT IN(N'Attempted',N'Delivered',N'Failed') OR (@Status=N'Failed' AND NULLIF(TRIM(@FailureReason),N'') IS NULL) THROW 51315,'Record an actual dispatch outcome and a failure reason when needed.',1;
  SELECT @Number=ISNULL(MAX(AttemptNumber),0)+1 FROM notifications.DeliveryAttempt WHERE NotificationId=@NotificationId;
  INSERT notifications.DeliveryAttempt(NotificationId,AttemptNumber,Provider,ProviderMessageId,Status,FailureReason,FinishedAt) VALUES(@NotificationId,@Number,@Provider,@ProviderMessageId,@Status,@FailureReason,CASE WHEN @Status=N'Attempted' THEN NULL ELSE SYSUTCDATETIME() END);
  UPDATE notifications.Notification SET Status=@Status WHERE NotificationId=@NotificationId;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER FUNCTION [core].[CanReadPlacement](@ActorId uniqueidentifier,@PlacementId uniqueidentifier) RETURNS bit
AS
BEGIN
 DECLARE @Allowed bit=0;
 IF EXISTS(SELECT 1 FROM training.Placement p JOIN core.UserAccount u ON u.UserId=@ActorId AND u.Status=N'Active' JOIN core.Student s ON s.StudentId=p.StudentId WHERE p.PlacementId=@PlacementId AND (u.Role=N'PlatformAdmin' OR (u.Role=N'CompanyAdmin' AND u.OrganizationId=p.CompanyId) OR (u.Role=N'CollegeAdmin' AND u.OrganizationId=p.CollegeId) OR (u.Role=N'Student' AND s.UserId=@ActorId) OR (u.Role=N'Supervisor' AND EXISTS(SELECT 1 FROM core.AcademicAssignment a JOIN core.Supervisor sup ON sup.SupervisorId=a.SupervisorId WHERE a.StudentId=p.StudentId AND a.EndedAt IS NULL AND sup.UserId=@ActorId)))) SET @Allowed=1;
 RETURN @Allowed;
END;
GO
CREATE OR ALTER PROCEDURE [api].[GetTraining] @ActorId uniqueidentifier,@PlacementId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Restricted bit=0;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF core.CanReadPlacement(@ActorId,@PlacementId)=0 THROW 51316,'This placement is outside your scope.',1;
 IF @Role=N'Student' SELECT @Restricted=COALESCE(v.IsRestricted,0) FROM training.Placement p JOIN core.AcademicAssignment a ON a.StudentId=p.StudentId AND a.EndedAt IS NULL LEFT JOIN training.ReportVisibility v ON v.SupervisorId=a.SupervisorId WHERE p.PlacementId=@PlacementId;
 SELECT p.PlacementId,p.RoleTitle,p.Status,p.RequiredHours,ISNULL((SELECT SUM(h.VerifiedHours) FROM training.PlacementWeek w JOIN training.HourVerification h ON h.WeekId=w.WeekId WHERE w.PlacementId=p.PlacementId),0) AS VerifiedHours FROM training.Placement p WHERE p.PlacementId=@PlacementId;
 SELECT w.WeekId,w.WeekNumber,w.AgreedTitle,w.WorkTitle,w.AllocatedHours,w.PlanRevision,CASE WHEN @Restricted=1 THEN N'Report hidden' ELSE w.Status END AS ReportStatus,CASE WHEN @Restricted=0 THEN r.CompanyFeedback END AS CompanyFeedback,CASE WHEN @Restricted=0 THEN rr.Notes END AS ReviewNotes FROM training.PlacementWeek w OUTER APPLY(SELECT TOP(1) r.ReportId,r.CompanyFeedback FROM training.WeeklyReport r WHERE r.WeekId=w.WeekId ORDER BY SubmissionNumber DESC) r LEFT JOIN training.ReportReview rr ON rr.ReportId=r.ReportId WHERE w.PlacementId=@PlacementId ORDER BY w.WeekNumber;
 SELECT o.ObjectiveId,o.WeekId,o.Ordinal,o.Text,CASE WHEN @Restricted=0 THEN o.IsComplete END AS IsComplete,CASE WHEN @Restricted=0 THEN o.Evidence END AS Evidence FROM training.Objective o JOIN training.PlacementWeek w ON w.WeekId=o.WeekId WHERE w.PlacementId=@PlacementId AND o.RemovedAt IS NULL;
 SELECT t.TaskId,t.WeekId,r.Title,r.Instructions,r.DueDate FROM training.Task t JOIN training.PlacementWeek w ON w.WeekId=t.WeekId CROSS APPLY(SELECT TOP(1) Title,Instructions,DueDate FROM training.TaskRevision WHERE TaskId=t.TaskId ORDER BY RevisionNumber DESC) r WHERE w.PlacementId=@PlacementId AND t.RemovedAt IS NULL;
END;
GO
CREATE OR ALTER PROCEDURE [api].[GetAttendance] @ActorId uniqueidentifier,@PlacementId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role=N'PlatformAdmin' OR core.CanReadPlacement(@ActorId,@PlacementId)=0 THROW 51317,'Attendance is outside your student, host-company or college scope.',1;
 SELECT RecordId,TrainingDate,Status,CheckInAt,CheckOutAt FROM attendance.AttendanceRecord WHERE PlacementId=@PlacementId ORDER BY TrainingDate;
 SELECT e.* FROM attendance.AttendanceEvent e JOIN attendance.AttendanceRecord r ON r.RecordId=e.RecordId WHERE r.PlacementId=@PlacementId ORDER BY e.CreatedAt;
 SELECT c.* FROM attendance.CorrectionRequest c JOIN attendance.AttendanceRecord r ON r.RecordId=c.RecordId WHERE r.PlacementId=@PlacementId ORDER BY c.RequestedAt;
END;
GO
CREATE OR ALTER PROCEDURE [api].[GetTickets] @ActorId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 SELECT t.* FROM support.Ticket t WHERE t.RequesterId=@ActorId OR support.IsHandler(@ActorId,t.TicketId)=1;
 SELECT m.* FROM support.TicketMessage m JOIN support.Ticket t ON t.TicketId=m.TicketId WHERE t.RequesterId=@ActorId OR support.IsHandler(@ActorId,t.TicketId)=1 ORDER BY m.MessageNumber;
END;
GO
CREATE OR ALTER PROCEDURE [api].[GetStudentMeetings] @ActorId uniqueidentifier
AS
BEGIN
 SET NOCOUNT ON;DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role NOT IN(N'Student',N'Supervisor',N'CompanyAdmin') THROW 51318,'This account does not have access to private meeting links.',1;
 SELECT N'Academic' AS Kind,m.MeetingId AS RecordId,r.Title,r.StartsAt,r.DurationMinutes,N'Zoom' AS Format,r.ZoomUrl AS MeetingUrl,m.Status,CAST(CASE WHEN a.EndedAt IS NULL AND m.Status IN(N'Requested',N'Confirmed',N'Reschedule requested') THEN 1 ELSE 0 END AS bit) AS CanRespond
 FROM meetings.AcademicMeeting m JOIN meetings.AcademicMeetingRevision r ON r.MeetingId=m.MeetingId AND r.RevisionNumber=m.CurrentRevision JOIN core.Student s ON s.StudentId=m.StudentId JOIN core.Supervisor sup ON sup.SupervisorId=m.SupervisorId JOIN core.AcademicAssignment a ON a.AssignmentId=m.AssignmentId WHERE (@Role=N'Student' AND s.UserId=@ActorId) OR (@Role=N'Supervisor' AND sup.UserId=@ActorId)
 UNION ALL
 SELECT N'Company interview',i.InterviewId,v.Title,r.StartsAt,r.DurationMinutes,r.Mode,r.MeetingUrl,i.Status,CAST(CASE WHEN a.Status=N'Pending' AND i.Status IN(N'Requested',N'Confirmed',N'Reschedule requested') THEN 1 ELSE 0 END AS bit)
 FROM recruitment.Interview i JOIN recruitment.InterviewRevision r ON r.InterviewId=i.InterviewId AND r.RevisionNumber=i.CurrentRevision JOIN recruitment.Application a ON a.ApplicationId=i.ApplicationId JOIN recruitment.ListingVersion v ON v.ListingId=a.ListingId AND v.VersionNumber=a.ListingVersion JOIN core.Student s ON s.StudentId=a.StudentId WHERE (@Role=N'Student' AND s.UserId=@ActorId) OR (@Role=N'CompanyAdmin' AND a.CompanyId=@Org);
END;
GO
CREATE OR ALTER VIEW [reporting].[PlacementProgress] AS
 SELECT p.PlacementId,p.StudentId,p.CollegeId,p.CompanyId,p.Status,p.RequiredHours,COUNT(w.WeekId) AS AgreedWeeks,SUM(CASE WHEN w.Status=N'Verified' THEN 1 ELSE 0 END) AS VerifiedWeeks,ISNULL(SUM(h.VerifiedHours),0) AS VerifiedHours FROM training.Placement p LEFT JOIN training.PlacementWeek w ON w.PlacementId=p.PlacementId LEFT JOIN training.HourVerification h ON h.WeekId=w.WeekId GROUP BY p.PlacementId,p.StudentId,p.CollegeId,p.CompanyId,p.Status,p.RequiredHours;
GO
CREATE OR ALTER PROCEDURE [api].[SetAccountStatus] @ActorId uniqueidentifier,@UserId uniqueidentifier,@Status nvarchar(16)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Status NOT IN(N'Active',N'Suspended') THROW 51319,'Choose Active or Suspended.',1;
 BEGIN TRY BEGIN TRAN;
 UPDATE core.UserAccount SET Status=@Status WHERE UserId=@UserId AND ((@Role=N'PlatformAdmin' AND Role IN(N'CollegeAdmin',N'CompanyAdmin')) OR (@Role=N'CollegeAdmin' AND OrganizationId=@Org AND Role IN(N'Student',N'Supervisor')));
 IF @@ROWCOUNT<>1 THROW 51320,'This administrator does not manage that account.',1;
 EXEC core.RecordAudit @ActorId,N'Account access changed',N'UserAccount',@UserId;
 COMMIT;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SetOrganizationStatus] @ActorId uniqueidentifier,@OrganizationId uniqueidentifier,@Status nvarchar(16)
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'PlatformAdmin' OR @Status NOT IN(N'Active',N'Suspended') THROW 51321,'Only Platform Admin manages organization access.',1;
 BEGIN TRY BEGIN TRAN;
 UPDATE core.Organization SET Status=@Status WHERE OrganizationId=@OrganizationId;
 IF @@ROWCOUNT<>1 THROW 51322,'The organization does not exist.',1;
 EXEC core.RecordAudit @ActorId,N'Organization access changed',N'Organization',@OrganizationId;
 COMMIT;END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[SaveStudentProfile] @ActorId uniqueidentifier,@DisplayName nvarchar(160),@Phone nvarchar(30),@Bio nvarchar(3000),@Skills api.TextList READONLY
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Student uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Student' OR NULLIF(TRIM(@DisplayName),N'') IS NULL OR (SELECT COUNT(*) FROM @Skills)>20 OR EXISTS(SELECT 1 FROM @Skills WHERE LEN(TRIM(Value))=0 OR LEN(Value)>40) OR EXISTS(SELECT Value FROM @Skills GROUP BY Value HAVING COUNT(*)>1) THROW 51323,'Provide your name and up to twenty distinct skills, each at most forty characters.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorId;
  UPDATE core.StudentProfile SET DisplayName=@DisplayName,Phone=@Phone,Bio=@Bio,UpdatedAt=SYSUTCDATETIME() WHERE StudentId=@Student;
  IF @@ROWCOUNT=0 INSERT core.StudentProfile(StudentId,DisplayName,Phone,Bio) VALUES(@Student,@DisplayName,@Phone,@Bio);
  DELETE core.StudentSkill WHERE StudentId=@Student;INSERT core.StudentSkill SELECT @Student,TRIM(Value) FROM @Skills;EXEC core.RecordAudit @ActorId,N'Student profile and skills updated',N'Student',@Student;COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RegisterFileMetadata] @ActorId uniqueidentifier,@FileName nvarchar(255),@MediaType nvarchar(120),@ByteSize bigint,@FileId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;DECLARE @Role nvarchar(20),@Org uniqueidentifier;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF NULLIF(TRIM(@FileName),N'') IS NULL OR NULLIF(TRIM(@MediaType),N'') IS NULL OR @ByteSize<=0 THROW 51324,'Valid file metadata is required. No upload occurs in this procedure.',1;
 SET @FileId=NEWID();INSERT core.FileAsset(FileId,OwnerId,FileName,MediaType,ByteSize) VALUES(@FileId,@ActorId,@FileName,@MediaType,@ByteSize);
END;
GO
CREATE OR ALTER PROCEDURE [api].[MarkFileAvailable] @FileId uniqueidentifier,@Provider nvarchar(40),@StorageKey nvarchar(512),@Sha256 binary(32),@ActualByteSize bigint
AS
BEGIN
 SET NOCOUNT ON;
 IF NULLIF(TRIM(@Provider),N'') IS NULL OR NULLIF(TRIM(@StorageKey),N'') IS NULL OR @Sha256 IS NULL THROW 51325,'Only a verified storage reference may make file content available.',1;
 UPDATE core.FileAsset SET StorageState=N'Available',StorageProvider=@Provider,StorageKey=@StorageKey,Sha256=@Sha256 WHERE FileId=@FileId AND StorageState=N'MetadataOnly' AND ByteSize=@ActualByteSize;
 IF @@ROWCOUNT<>1 THROW 51326,'The uploaded content does not match the selected metadata or is already finalized.',1;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RegisterCvSelection] @ActorId uniqueidentifier,@FileId uniqueidentifier,@CvVersionId uniqueidentifier OUTPUT
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Org uniqueidentifier,@Student uniqueidentifier,@Version int;EXEC core.AssertActor @ActorId,@Role OUTPUT,@Org OUTPUT;
 IF @Role<>N'Student' THROW 51327,'Only a student selects their CV.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Student=StudentId FROM core.Student WITH(UPDLOCK,HOLDLOCK) WHERE UserId=@ActorId;
  IF NOT EXISTS(SELECT 1 FROM core.FileAsset WHERE FileId=@FileId AND OwnerId=@ActorId AND ByteSize<=5242880 AND StorageState IN(N'MetadataOnly',N'Available') AND ((MediaType=N'application/pdf' AND FileName LIKE N'%.pdf') OR (MediaType=N'application/vnd.openxmlformats-officedocument.wordprocessingml.document' AND FileName LIKE N'%.docx'))) THROW 51328,'Select your own PDF or DOCX, no larger than five MB.',1;
  SELECT @Version=ISNULL(MAX(VersionNumber),0)+1 FROM core.StudentCvVersion WHERE StudentId=@Student;
  SET @CvVersionId=NEWID();INSERT core.StudentCvVersion(CvVersionId,StudentId,FileId,VersionNumber) VALUES(@CvVersionId,@Student,@FileId,@Version);COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
CREATE OR ALTER PROCEDURE [api].[RetireListing] @ActorId uniqueidentifier,@ListingId uniqueidentifier,@Restore bit=0
AS
BEGIN
 SET NOCOUNT ON;SET XACT_ABORT ON;
 DECLARE @Role nvarchar(20),@Company uniqueidentifier,@Old nvarchar(20);EXEC core.AssertActor @ActorId,@Role OUTPUT,@Company OUTPUT;
 IF @Role<>N'CompanyAdmin' THROW 51329,'Only the author company deletes or restores its listing.',1;
 BEGIN TRY BEGIN TRAN;
  SELECT @Old=Status FROM recruitment.Listing WITH(UPDLOCK,HOLDLOCK) WHERE ListingId=@ListingId AND CompanyId=@Company;
  IF @Old IS NULL OR (@Restore=1 AND @Old<>N'Deleted') OR (@Restore=0 AND @Old=N'Deleted') THROW 51330,'The listing is unavailable for this change.',1;
  IF @Restore=0 UPDATE recruitment.Listing SET DeletedFromStatus=Status,Status=N'Deleted',DeletedAt=SYSUTCDATETIME() WHERE ListingId=@ListingId;
  ELSE UPDATE recruitment.Listing SET Status=DeletedFromStatus,DeletedFromStatus=NULL,DeletedAt=NULL WHERE ListingId=@ListingId;
  COMMIT;
 END TRY BEGIN CATCH IF @@TRANCOUNT>0 ROLLBACK;THROW;END CATCH;
END;
GO
-- Access boundary: trusted backend actors, and separate service worker rights.
IF DATABASE_PRINCIPAL_ID(N'bridgeway_app_executor') IS NULL CREATE ROLE [bridgeway_app_executor] AUTHORIZATION [dbo];
IF DATABASE_PRINCIPAL_ID(N'bridgeway_worker') IS NULL CREATE ROLE [bridgeway_worker] AUTHORIZATION [dbo];
GO
DECLARE @Sql nvarchar(max)=N'';
SELECT @Sql+=N'GRANT EXECUTE ON OBJECT::[api].'+QUOTENAME(name)+N' TO '+CASE WHEN name IN(N'ConfirmPayment',N'CompleteCvMatch',N'RecordDeliveryAttempt',N'MarkFileAvailable') THEN N'[bridgeway_worker]' ELSE N'[bridgeway_app_executor]' END+N';'+CHAR(10) FROM sys.procedures WHERE schema_id=SCHEMA_ID(N'api');
EXEC sys.sp_executesql @Sql;
GRANT REFERENCES ON SCHEMA::[api] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[TextList] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[ScheduleInput] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[AnswerInput] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[IdList] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[ObjectiveInput] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[ScoreInput] TO [bridgeway_app_executor];
GRANT EXECUTE ON TYPE::[api].[AcademicInput] TO [bridgeway_app_executor];
GO

-- BEGIN GENERATED GUARDS. Regenerate with node tools/build-database.cjs.

CREATE OR ALTER TRIGGER [core].[TR_AuditEvent_Immutable] ON [core].[AuditEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [core].[TR_PartnershipEvent_Immutable] ON [core].[PartnershipEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [core].[TR_StudentCvVersion_Immutable] ON [core].[StudentCvVersion] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_CollegeProgramVersion_Immutable] ON [training].[CollegeProgramVersion] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ListingVersion_Immutable] ON [recruitment].[ListingVersion] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ListingSkill_Immutable] ON [recruitment].[ListingSkill] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ListingPrerequisite_Immutable] ON [recruitment].[ListingPrerequisite] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ListingQuestion_Immutable] ON [recruitment].[ListingQuestion] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ListingScheduleWeek_Immutable] ON [recruitment].[ListingScheduleWeek] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ListingDecision_Immutable] ON [recruitment].[ListingDecision] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ApplicationAnswer_Immutable] ON [recruitment].[ApplicationAnswer] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ApplicationSkill_Immutable] ON [recruitment].[ApplicationSkill] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ApplicationScheduleWeek_Immutable] ON [recruitment].[ApplicationScheduleWeek] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_ApplicationEvent_Immutable] ON [recruitment].[ApplicationEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_InterviewRevision_Immutable] ON [recruitment].[InterviewRevision] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_InterviewEvent_Immutable] ON [recruitment].[InterviewEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_WeekPlanRevision_Immutable] ON [training].[WeekPlanRevision] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_WeekPlanObjective_Immutable] ON [training].[WeekPlanObjective] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskRevision_Immutable] ON [training].[TaskRevision] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskSubmission_Immutable] ON [training].[TaskSubmission] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_SubmissionFile_Immutable] ON [training].[SubmissionFile] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskReview_Immutable] ON [training].[TaskReview] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_WeeklyReport_Immutable] ON [training].[WeeklyReport] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_ReportObjective_Immutable] ON [training].[ReportObjective] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_ReportReview_Immutable] ON [training].[ReportReview] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_HourVerification_Immutable] ON [training].[HourVerification] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_CompanyEvaluation_Immutable] ON [training].[CompanyEvaluation] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_CompanyEvaluationScore_Immutable] ON [training].[CompanyEvaluationScore] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_AcademicAssessment_Immutable] ON [training].[AcademicAssessment] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_AcademicCriterion_Immutable] ON [training].[AcademicCriterion] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_CompletionApproval_Immutable] ON [training].[CompletionApproval] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_Certificate_Immutable] ON [training].[Certificate] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [attendance].[TR_QrRedemption_Immutable] ON [attendance].[QrRedemption] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [attendance].[TR_AttendanceEvent_Immutable] ON [attendance].[AttendanceEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [meetings].[TR_AcademicMeetingRevision_Immutable] ON [meetings].[AcademicMeetingRevision] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [meetings].[TR_AcademicMeetingEvent_Immutable] ON [meetings].[AcademicMeetingEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [support].[TR_TicketMessage_Immutable] ON [support].[TicketMessage] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [support].[TR_TicketEvent_Immutable] ON [support].[TicketEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [commerce].[TR_OrderItem_Immutable] ON [commerce].[OrderItem] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [commerce].[TR_OrderItemCourse_Immutable] ON [commerce].[OrderItemCourse] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [commerce].[TR_PaymentEvent_Immutable] ON [commerce].[PaymentEvent] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [ai].[TR_CvMatchResult_Immutable] ON [ai].[CvMatchResult] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; THROW 51900, 'Historical records are append-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_Task_WeekLock] ON [training].[Task] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.PlacementWeek w ON w.WeekId=x.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_Objective_WeekLock] ON [training].[Objective] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.PlacementWeek w ON w.WeekId=x.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskRevision_WeekLock] ON [training].[TaskRevision] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.Task t ON t.TaskId=x.TaskId JOIN training.PlacementWeek w ON w.WeekId=t.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskAttachment_WeekLock] ON [training].[TaskAttachment] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.Task t ON t.TaskId=x.TaskId JOIN training.PlacementWeek w ON w.WeekId=t.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskSubmission_WeekLock] ON [training].[TaskSubmission] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.Task t ON t.TaskId=x.TaskId JOIN training.PlacementWeek w ON w.WeekId=t.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_SubmissionFile_WeekLock] ON [training].[SubmissionFile] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.Task t ON t.TaskId=x.TaskId JOIN training.PlacementWeek w ON w.WeekId=t.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_TaskReview_WeekLock] ON [training].[TaskReview] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.TaskSubmission s ON s.SubmissionId=x.SubmissionId JOIN training.Task t ON t.TaskId=s.TaskId JOIN training.PlacementWeek w ON w.WeekId=t.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_WeekPlanRevision_WeekLock] ON [training].[WeekPlanRevision] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.PlacementWeek w ON w.WeekId=x.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_WeekPlanObjective_WeekLock] ON [training].[WeekPlanObjective] AFTER INSERT, UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM (SELECT * FROM inserted UNION ALL SELECT * FROM deleted) x JOIN training.PlacementWeek w ON w.WeekId=x.WeekId JOIN training.Placement p ON p.PlacementId=w.PlacementId WHERE w.Status NOT IN(N'Draft',N'Revision') OR p.Status<>N'Active') THROW 51901, 'Submitted, verified or ended training is read-only.', 1; END;
GO

CREATE OR ALTER TRIGGER [recruitment].[TR_Application_Agreement] ON [recruitment].[Application] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF NOT EXISTS(SELECT 1 FROM deleted) RETURN; IF NOT EXISTS(SELECT 1 FROM inserted) OR EXISTS(SELECT [ApplicationId],[StudentId],[CollegeId],[CompanyId],[ListingId],[ListingVersion],[ProgramVersion],[RequiredHours],[MinimumWeeks],[MaximumWeeklyHours],[CvVersionId],[ProfileName],[ProfilePhone],[ProfileBio],[SubmittedAt] FROM inserted EXCEPT SELECT [ApplicationId],[StudentId],[CollegeId],[CompanyId],[ListingId],[ListingVersion],[ProgramVersion],[RequiredHours],[MinimumWeeks],[MaximumWeeklyHours],[CvVersionId],[ProfileName],[ProfilePhone],[ProfileBio],[SubmittedAt] FROM deleted) THROW 51902, 'Submitted agreement fields and identities cannot be changed or deleted.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_Placement_Agreement] ON [training].[Placement] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF NOT EXISTS(SELECT 1 FROM deleted) RETURN; IF NOT EXISTS(SELECT 1 FROM inserted) OR EXISTS(SELECT [PlacementId],[ApplicationId],[StudentId],[CollegeId],[CompanyId],[RoleTitle],[RequiredHours],[MinimumWeeks],[MaximumWeeklyHours],[StartDate],[ActivatedBy],[CreatedAt] FROM inserted EXCEPT SELECT [PlacementId],[ApplicationId],[StudentId],[CollegeId],[CompanyId],[RoleTitle],[RequiredHours],[MinimumWeeks],[MaximumWeeklyHours],[StartDate],[ActivatedBy],[CreatedAt] FROM deleted) THROW 51902, 'Submitted agreement fields and identities cannot be changed or deleted.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_PlacementWeek_Agreement] ON [training].[PlacementWeek] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF NOT EXISTS(SELECT 1 FROM deleted) RETURN; IF NOT EXISTS(SELECT 1 FROM inserted) OR EXISTS(SELECT [WeekId],[PlacementId],[WeekNumber],[AgreedTitle],[AllocatedHours] FROM inserted EXCEPT SELECT [WeekId],[PlacementId],[WeekNumber],[AgreedTitle],[AllocatedHours] FROM deleted) THROW 51902, 'Submitted agreement fields and identities cannot be changed or deleted.', 1; END;
GO

CREATE OR ALTER TRIGGER [commerce].[TR_PurchaseOrder_Agreement] ON [commerce].[PurchaseOrder] AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF NOT EXISTS(SELECT 1 FROM deleted) RETURN; IF NOT EXISTS(SELECT 1 FROM inserted) OR EXISTS(SELECT [OrderId],[BuyerId],[Currency],[TotalAmount],[CheckoutKey],[CreatedAt] FROM inserted EXCEPT SELECT [OrderId],[BuyerId],[Currency],[TotalAmount],[CheckoutKey],[CreatedAt] FROM deleted) THROW 51902, 'Submitted agreement fields and identities cannot be changed or deleted.', 1; END;
GO

CREATE OR ALTER TRIGGER [core].[TR_FileAsset_Content] ON core.FileAsset AFTER UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT i.FileId,i.OwnerId,i.FileName,i.MediaType,i.ByteSize,i.StorageProvider,i.StorageKey,i.Sha256 FROM inserted i JOIN deleted d ON d.FileId=i.FileId WHERE d.StorageKey IS NOT NULL EXCEPT SELECT d.FileId,d.OwnerId,d.FileName,d.MediaType,d.ByteSize,d.StorageProvider,d.StorageKey,d.Sha256 FROM deleted d WHERE d.StorageKey IS NOT NULL) THROW 51907, 'Finalized content references are immutable; register a new file version.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_PlacementWeek_Lifecycle] ON training.PlacementWeek AFTER UPDATE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i JOIN deleted d ON d.WeekId=i.WeekId WHERE (d.Status=N'Verified' AND (i.Status<>d.Status OR i.WorkTitle<>d.WorkTitle OR i.PlanRevision<>d.PlanRevision)) OR (d.Status=N'Submitted' AND (i.WorkTitle<>d.WorkTitle OR i.PlanRevision<>d.PlanRevision OR i.Status NOT IN(N'Submitted',N'Revision',N'Verified')))) THROW 51903, 'The weekly report lifecycle is locked.', 1; END;
GO

CREATE OR ALTER TRIGGER [training].[TR_HourVerification_Allocation] ON training.HourVerification AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i JOIN training.PlacementWeek w ON w.WeekId=i.WeekId JOIN training.WeeklyReport r ON r.ReportId=i.ReportId JOIN training.ReportReview rr ON rr.ReportId=i.ReportId WHERE i.VerifiedHours<>w.AllocatedHours OR r.ReportedHours<>w.AllocatedHours OR rr.Decision<>N'Verified') THROW 51904, 'Only the full supervisor-verified allocation may be credited.', 1; END;
GO

CREATE OR ALTER TRIGGER [support].[TR_Ticket_Closed] ON support.Ticket AFTER UPDATE, DELETE AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM deleted WHERE Status=N'Resolved') THROW 51905, 'Resolved tickets are closed and immutable.', 1; END;
GO

CREATE OR ALTER TRIGGER [support].[TR_TicketMessage_Closed] ON support.TicketMessage AFTER INSERT AS BEGIN SET NOCOUNT ON; IF EXISTS(SELECT 1 FROM inserted i JOIN support.Ticket t ON t.TicketId=i.TicketId WHERE t.Status=N'Resolved') THROW 51906, 'Resolved tickets cannot receive replies.', 1; END;
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[core] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[core] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[recruitment] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[recruitment] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[training] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[training] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[attendance] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[attendance] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[meetings] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[meetings] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[support] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[support] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[learning] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[learning] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[commerce] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[commerce] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[ai] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[ai] TO [bridgeway_worker];
GO

DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[notifications] TO [bridgeway_app_executor];
DENY SELECT, INSERT, UPDATE, DELETE ON SCHEMA::[notifications] TO [bridgeway_worker];
GO
