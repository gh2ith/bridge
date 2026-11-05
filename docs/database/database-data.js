/* Single schema source for the documentation and generated SQL Server DDL. */
(function (root) {
  'use strict';
  const groups = [
    ['core','Identity and organizations','#2457a7',0,false], ['recruitment','Opportunities and applications','#126b77',1,false],
    ['training','Training and completion','#815720',2,false], ['attendance','Attendance and QR','#216a48',4,false],
    ['meetings','Meetings and interviews','#685191',4,false], ['support','Support conversations','#9a4858',5,false],
    ['learning','Courses and enrollment','#376a8c',5,true], ['commerce','Orders and payments','#92602b',6,true],
    ['ai','CV role matching','#526a34',6,true], ['notifications','Notifications','#7b5369',6,true]
  ].map(([id,name,color,column,planned])=>({id,name,color,column,planned}));
  const tables=[];
  const human=s=>s.replace(/([a-z0-9])([A-Z])/g,'$1 $2');
  const c=(name,type,nullable=false,options={})=>({name,type,nullable,description:human(name)+'.',...options});
  const uid=name=>c(name,'uniqueidentifier');
  const id=name=>c(name,'uniqueidentifier',false,{default:'NEWSEQUENTIALID()'});
  const txt=(name,n=160,nullable=false)=>c(name,`nvarchar(${n>4000?'max':n})`,nullable,n>4000?{maxLength:n}:{});
  const num=(name,type='int',nullable=false)=>c(name,type,nullable);
  const time=(name='CreatedAt',nullable=false)=>c(name,'datetime2(3)',nullable,nullable?{}:{default:'SYSUTCDATETIME()'});
  const bit=(name,value=0)=>c(name,'bit',false,{default:String(value)});
  const actor=(name='CreatedBy')=>uid(name);
  const version=()=>c('RowVersion','rowversion',false,{description:'SQL Server concurrency token; not a timestamp.'});
  const en=(name,values,def)=>({name,values,default:def});
  function T(name,description,columns,pk,options={}){
    const [schema,table]=name.split('.');
    const enums=options.enums||[];
    for(const e of enums){const col=columns.find(v=>v.name===e.name);if(e.default!==undefined)col.default=`N'${e.default}'`;}
    const tableMeta={id:name,schema,name:table,group:schema,description,columns,primaryKey:{name:`PK_${table}`,columns:pk},uniqueKeys:[],checks:[],indexes:[],foreignKeys:[],...options};
    for(const col of columns)if(col.maxLength)tableMeta.checks.push({name:`CK_${table}_${col.name}_Length`,expression:`DATALENGTH([${col.name}])<=${col.maxLength*2}`});
    for(const e of enums)tableMeta.checks.push({name:`CK_${table}_${e.name}`,expression:`[${e.name}] IN (${e.values.map(v=>`N'${v}'`).join(', ')})`});
    tables.push(tableMeta);return tableMeta;
  }
  const find=name=>tables.find(t=>t.id===name);
  const U=(table,name,columns)=>find(table).uniqueKeys.push({name:`UQ_${find(table).name}_${name}`,columns});
  const C=(table,name,expression)=>find(table).checks.push({name:`CK_${find(table).name}_${name}`,expression});
  const I=(table,name,columns,filter=null,unique=false)=>find(table).indexes.push({name:`${unique?'UX':'IX'}_${find(table).name}_${name}`,columns,filter,unique});
  function F(table,columns,target,targetColumns,verb='belongs to',options={}){
    const t=find(table),n=`FK_${t.name}_${columns.join('_')}`;
    t.foreignKeys.push({name:n,columns,target,targetColumns,onDelete:'NO ACTION',onUpdate:'NO ACTION',verb,cardinality:{from:'many',to:'one',optional:columns.some(col=>t.columns.find(c=>c.name===col).nullable),parentMinimum:0},...options});
  }
  const accountRoles=['PlatformAdmin','CollegeAdmin','CompanyAdmin','Student','Supervisor'];
  T('core.Organization','Company or college identity; administrator accounts are separate people.',[id('OrganizationId'),txt('Kind',16),txt('Name',200),txt('ReferenceCode',80),txt('City',100),txt('Address',400),txt('Phone',30),txt('Website',2048,true),txt('Status',16),time(),version()],['OrganizationId'],{enums:[en('Kind',['College','Company']),en('Status',['Active','Suspended'],'Active')]});
  U('core.Organization','IdKind',['OrganizationId','Kind']);U('core.Organization','Reference',['Kind','ReferenceCode']);
  T('core.College','College subtype, used for tenant-scoped foreign keys.',[uid('CollegeId'),txt('Kind',16),
    num('CurrentProgramVersion','int',true), version()],['CollegeId'],{enums:[en('Kind',['College'],'College')]});F('core.College',['CollegeId','Kind'],'core.Organization',['OrganizationId','Kind'],'specializes');
  C('core.College','ProgramVersion',"[CurrentProgramVersion] IS NULL OR [CurrentProgramVersion]>0");
  T('core.Company','Host-company subtype.',[uid('CompanyId'),txt('Kind',16),txt('Industry',160,true),txt('About',4000,true)],['CompanyId'],{enums:[en('Kind',['Company'],'Company')]});F('core.Company',['CompanyId','Kind'],'core.Organization',['OrganizationId','Kind'],'specializes');
  T('core.UserAccount','Administrator-managed access identity. ExternalAuthSubject is assigned by the future identity provider. No passwords.',[id('UserId'),c('OrganizationId','uniqueidentifier',true),txt('Role',20),txt('FullName',160),txt('Email',254),txt('Phone',30,true),txt('JobTitle',160,true),txt('ExternalAuthSubject',256,true),txt('Status',16),c('CreatedBy','uniqueidentifier',true),time(),version(),
    c('PreferencesJson','nvarchar(max)',false,{default:"N'{}'", description:'An object keyed by account preference. Store the value and last update time for each preference.'})],['UserId'],{enums:[en('Role',accountRoles),en('Status',['Active','Suspended'],'Active')]});
  C('core.UserAccount','PreferencesJson',"ISJSON([PreferencesJson], OBJECT)=1");
  U('core.UserAccount','Email',['Email']);U('core.UserAccount','Scope',['UserId','OrganizationId','Role']);C('core.UserAccount','OrganizationRole',"([Role]=N'PlatformAdmin' AND [OrganizationId] IS NULL) OR ([Role]<>N'PlatformAdmin' AND [OrganizationId] IS NOT NULL)");I('core.UserAccount','AuthSubject',['ExternalAuthSubject'],'[ExternalAuthSubject] IS NOT NULL',true);F('core.UserAccount',['OrganizationId'],'core.Organization',['OrganizationId']);F('core.UserAccount',['CreatedBy'],'core.UserAccount',['UserId'],'created by');
  T('core.Student','College-owned academic identity. Student numbers are unique inside a college.',[id('StudentId'),uid('UserId'),uid('CollegeId'),txt('Role',20),txt('StudentNumber',40),txt('Faculty',160),txt('Department',160),txt('StudyYear',12),c('Gpa','decimal(3,2)'),time(),
    txt('DisplayName',160,true), txt('ProfilePhone',30,true), txt('Bio',3000,true), time('ProfileUpdatedAt',true), version()],['StudentId'],{enums:[en('Role',['Student'],'Student'),en('StudyYear',['1','2','3','4','5','6','Graduate'])]});U('core.Student','User',['UserId']);U('core.Student','Scope',['StudentId','CollegeId']);U('core.Student','Number',['CollegeId','StudentNumber']);C('core.Student','Gpa','[Gpa] BETWEEN 0 AND 4');F('core.Student',['UserId','CollegeId','Role'],'core.UserAccount',['UserId','OrganizationId','Role']);F('core.Student',['CollegeId'],'core.College',['CollegeId']);
  T('core.Supervisor','College-owned academic supervisor. Staff number is generated by the account service.',[id('SupervisorId'),uid('UserId'),uid('CollegeId'),txt('Role',20),txt('StaffNumber',80),txt('AcademicTitle',20),txt('Faculty',160),txt('Department',160),txt('Office',160,true),txt('OfficeHours',300,true),time(),
    bit('IsRestricted'), time('VisibilityUpdatedAt',true)],['SupervisorId'],{enums:[en('Role',['Supervisor'],'Supervisor')]});U('core.Supervisor','User',['UserId']);U('core.Supervisor','Scope',['SupervisorId','CollegeId']);U('core.Supervisor','Staff',['CollegeId','StaffNumber']);F('core.Supervisor',['UserId','CollegeId','Role'],'core.UserAccount',['UserId','OrganizationId','Role']);F('core.Supervisor',['CollegeId'],'core.College',['CollegeId']);
  T('core.AcademicAssignment','Independent academic assignment history, including before placement. Exactly one current assignment per student.',[id('AssignmentId'),uid('StudentId'),uid('SupervisorId'),uid('CollegeId'),actor(),time('AssignedAt'),time('EndedAt',true),c('EndedBy','uniqueidentifier',true)],['AssignmentId']);F('core.AcademicAssignment',['StudentId','CollegeId'],'core.Student',['StudentId','CollegeId']);F('core.AcademicAssignment',['SupervisorId','CollegeId'],'core.Supervisor',['SupervisorId','CollegeId']);F('core.AcademicAssignment',['CreatedBy'],'core.UserAccount',['UserId']);F('core.AcademicAssignment',['EndedBy'],'core.UserAccount',['UserId']);U('core.AcademicAssignment','Participants',['AssignmentId','StudentId','SupervisorId','CollegeId']);I('core.AcademicAssignment','Current',['StudentId'],'[EndedAt] IS NULL',true);C('core.AcademicAssignment','End','([EndedAt] IS NULL AND [EndedBy] IS NULL) OR ([EndedAt] IS NOT NULL AND [EndedAt]>=[AssignedAt] AND [EndedBy] IS NOT NULL)');
  T('core.Partnership','College-company connection. Inactive displays as Paused. Absence of a row does not restrict approved listings.',[id('PartnershipId'),uid('CollegeId'),uid('CompanyId'),txt('Status',16),actor(),time(),version()],['PartnershipId'],{enums:[en('Status',['Active','Inactive'],'Active')]});U('core.Partnership','Pair',['CollegeId','CompanyId']);F('core.Partnership',['CollegeId'],'core.College',['CollegeId']);F('core.Partnership',['CompanyId'],'core.Company',['CompanyId']);F('core.Partnership',['CreatedBy'],'core.UserAccount',['UserId']);
  T('core.PartnershipEvent','Append-only creation, pause and resume history.',[id('EventId'),uid('PartnershipId'),actor('ActorId'),txt('Action',16),txt('Reason',1000,true),time()],['EventId'],{enums:[en('Action',['Created','Paused','Resumed'])]});F('core.PartnershipEvent',['PartnershipId'],'core.Partnership',['PartnershipId']);F('core.PartnershipEvent',['ActorId'],'core.UserAccount',['UserId']);
  T('core.ActivityReceipt','Per-viewer seen versions for sidebar activity dots, not counts or directory totals.',[uid('UserId'),txt('SectionKey',80),txt('RecordKind',60),uid('RecordId'),txt('SeenVersion',100),time('SeenAt')],['UserId','SectionKey','RecordKind','RecordId']);F('core.ActivityReceipt',['UserId'],'core.UserAccount',['UserId']);
  T('core.FileAsset','File metadata and future object-storage reference. MetadataOnly rows have no server content.',[id('FileId'),uid('OwnerId'),txt('FileName',255),txt('MediaType',120),c('ByteSize','bigint'),txt('StorageState',20),txt('StorageProvider',40,true),txt('StorageKey',512,true),c('Sha256','binary(32)',true),time()],['FileId'],{enums:[en('StorageState',['MetadataOnly','Available','Quarantined','Deleted'],'MetadataOnly')]});C('core.FileAsset','Size','[ByteSize]>0');C('core.FileAsset','Reference',"[StorageState]<>N'Available' OR ([StorageProvider] IS NOT NULL AND [StorageKey] IS NOT NULL AND [Sha256] IS NOT NULL)");F('core.FileAsset',['OwnerId'],'core.UserAccount',['UserId']);
  T('core.StudentSkill','Student-selected skills, up to twenty through the service procedure.',[uid('StudentId'),txt('Skill',40)],['StudentId','Skill']);F('core.StudentSkill',['StudentId'],'core.Student',['StudentId']);
  T('core.StudentCvVersion','Immutable CV selections; metadata-only historical selections are valid but cannot be analyzed.',[id('CvVersionId'),uid('StudentId'),uid('FileId'),num('VersionNumber'),time()],['CvVersionId']);U('core.StudentCvVersion','Version',['StudentId','VersionNumber']);U('core.StudentCvVersion','Scope',['CvVersionId','StudentId']);C('core.StudentCvVersion','Version','[VersionNumber]>0');F('core.StudentCvVersion',['StudentId'],'core.Student',['StudentId']);F('core.StudentCvVersion',['FileId'],'core.FileAsset',['FileId']);
  T('training.CollegeProgramVersion','Immutable college requirements. Null weekly limit means no college limit.',[uid('CollegeId'),num('VersionNumber'),num('RequiredHours'),num('MinimumWeeks'),num('MaximumWeeklyHours','int',true),actor(),time()],['CollegeId','VersionNumber']);F('training.CollegeProgramVersion',['CollegeId'],'core.College',['CollegeId']);F('training.CollegeProgramVersion',['CreatedBy'],'core.UserAccount',['UserId']);C('training.CollegeProgramVersion','Requirements','[VersionNumber]>0 AND [RequiredHours] BETWEEN 1 AND 8736 AND [MinimumWeeks] BETWEEN 1 AND 52 AND ([MaximumWeeklyHours] IS NULL OR [MaximumWeeklyHours] BETWEEN 1 AND 168)');F('core.College',['CollegeId','CurrentProgramVersion'],'training.CollegeProgramVersion',['CollegeId','VersionNumber'],'selects current version');
  T('recruitment.Listing','Company-owned opportunity identity. New content creates a new immutable version and requires platform moderation.',[id('ListingId'),uid('CompanyId'),num('CurrentVersion','int',true),txt('Status',20),c('DeletedFromStatus','nvarchar(20)',true),time('DeletedAt',true),actor(),time(),version()],['ListingId'],{enums:[en('Status',['Pending review','Published','Rejected','Paused','Deleted'],'Pending review')]});U('recruitment.Listing','Scope',['ListingId','CompanyId']);F('recruitment.Listing',['CompanyId'],'core.Company',['CompanyId']);F('recruitment.Listing',['CreatedBy'],'core.UserAccount',['UserId']);
  T('recruitment.ListingVersion','Immutable opportunity content for publication, applications, and AI matching.',[uid('ListingId'),num('VersionNumber'),txt('Title',160),txt('Category',100),txt('CategoryLabel',100,true),txt('City',100),txt('WorkplaceMode',16),txt('Description',6000),num('Capacity'),c('ApplicationDeadline','date'),actor(),time(),
    c('SkillsJson','nvarchar(max)',false,{default:"N'[]'", description:'An ordered array of skill names.'}),
    c('PrerequisitesJson','nvarchar(max)',false,{default:"N'[]'", description:'An ordered array of prerequisite descriptions.'}),
    c('QuestionsJson','nvarchar(max)',false,{default:"N'[]'", description:'An ordered array of application question texts.'})],['ListingId','VersionNumber'],{enums:[en('WorkplaceMode',['On-site','Hybrid','Remote'])]});F('recruitment.ListingVersion',['ListingId'],'recruitment.Listing',['ListingId']);F('recruitment.ListingVersion',['CreatedBy'],'core.UserAccount',['UserId']);C('recruitment.ListingVersion','Bounds','[VersionNumber]>0 AND [Capacity] BETWEEN 1 AND 500');F('recruitment.Listing',['ListingId','CurrentVersion'],'recruitment.ListingVersion',['ListingId','VersionNumber'],'selects current version');
  C('recruitment.ListingVersion','SkillsJson',"ISJSON([SkillsJson], ARRAY)=1");
  C('recruitment.ListingVersion','PrerequisitesJson',"ISJSON([PrerequisitesJson], ARRAY)=1");
  C('recruitment.ListingVersion','QuestionsJson',"ISJSON([QuestionsJson], ARRAY)=1");
  T('recruitment.ListingScheduleWeek','Published positive weekly allocation, supporting one to fifty-two weeks.',[uid('ListingId'),num('VersionNumber'),num('WeekNumber'),txt('Title',160),num('AllocatedHours')],['ListingId','VersionNumber','WeekNumber']);F('recruitment.ListingScheduleWeek',['ListingId','VersionNumber'],'recruitment.ListingVersion',['ListingId','VersionNumber']);C('recruitment.ListingScheduleWeek','Allocation','[WeekNumber] BETWEEN 1 AND 52 AND [AllocatedHours] BETWEEN 1 AND 168');
  T('recruitment.ListingDecision','Append-only platform moderation decisions, distinct from hiring decisions.',[id('DecisionId'),uid('ListingId'),num('VersionNumber'),txt('Decision',20),txt('Reason',2000,true),actor('ActorId'),time()],['DecisionId'],{enums:[en('Decision',['Published','Rejected','Paused'])]});F('recruitment.ListingDecision',['ListingId','VersionNumber'],'recruitment.ListingVersion',['ListingId','VersionNumber']);F('recruitment.ListingDecision',['ActorId'],'core.UserAccount',['UserId']);C('recruitment.ListingDecision','Reason',"[Decision]=N'Published' OR ([Reason] IS NOT NULL AND LEN(LTRIM(RTRIM([Reason])))>0)");
  T('recruitment.CollegeAvailability','College-local listing discovery restriction. Existing applications and placements do not change.',[uid('CollegeId'),uid('ListingId'),bit('IsPaused'),actor('UpdatedBy'),time('UpdatedAt'),version()],['CollegeId','ListingId']);F('recruitment.CollegeAvailability',['CollegeId'],'core.College',['CollegeId']);F('recruitment.CollegeAvailability',['ListingId'],'recruitment.Listing',['ListingId']);F('recruitment.CollegeAvailability',['UpdatedBy'],'core.UserAccount',['UserId']);
  T('recruitment.Application','Submitted application with immutable profile, CV, college requirement, and schedule snapshots.',[id('ApplicationId'),uid('StudentId'),uid('CollegeId'),uid('CompanyId'),uid('ListingId'),num('ListingVersion'),num('ProgramVersion'),num('RequiredHours'),num('MinimumWeeks'),num('MaximumWeeklyHours','int',true),c('CvVersionId','uniqueidentifier',true),txt('ProfileName',160),txt('ProfilePhone',30,true),txt('ProfileBio',3000,true),txt('Status',20),time('SubmittedAt'),time('CompanyAcceptedAt',true),time('ClosedAt',true),txt('ClosedReason',1000,true),version(),
    c('AnswersJson','nvarchar(max)',false,{default:"N'[]'", description:'An ordered array of objects with question and answer text, copied at submission.'}),
    c('SkillsJson','nvarchar(max)',false,{default:"N'[]'", description:'An array of skill names copied from the student profile at submission.'}),
    c('ScheduleJson','nvarchar(max)',false,{description:'An ordered array of objects with weekNumber, title and allocatedHours, copied from the agreed listing version.'})],['ApplicationId'],{enums:[en('Status',['Pending','Accepted','Placed','Rejected','Withdrawn','Closed'],'Pending')]});
  C('recruitment.Application','AnswersJson',"ISJSON([AnswersJson], ARRAY)=1");
  C('recruitment.Application','SkillsJson',"ISJSON([SkillsJson], ARRAY)=1");
  C('recruitment.Application','ScheduleJson',"ISJSON([ScheduleJson], ARRAY)=1");
  C('recruitment.Application','SchedulePresent',"JSON_PATH_EXISTS([ScheduleJson], '$[0]')=1");
  U('recruitment.Application','PlacementScope',['ApplicationId','StudentId','CollegeId','CompanyId']);F('recruitment.Application',['StudentId','CollegeId'],'core.Student',['StudentId','CollegeId']);F('recruitment.Application',['ListingId','CompanyId'],'recruitment.Listing',['ListingId','CompanyId']);F('recruitment.Application',['ListingId','ListingVersion'],'recruitment.ListingVersion',['ListingId','VersionNumber']);F('recruitment.Application',['CollegeId','ProgramVersion'],'training.CollegeProgramVersion',['CollegeId','VersionNumber']);F('recruitment.Application',['CvVersionId','StudentId'],'core.StudentCvVersion',['CvVersionId','StudentId']);C('recruitment.Application','Requirements','[RequiredHours]>0 AND [MinimumWeeks] BETWEEN 1 AND 52 AND ([MaximumWeeklyHours] IS NULL OR [MaximumWeeklyHours] BETWEEN 1 AND 168)');I('recruitment.Application','NonWithdrawn',['StudentId','ListingId'],"[Status]<>N'Withdrawn'",true);I('recruitment.Application','AcceptedOffer',['StudentId'],"[Status]=N'Accepted'",true);I('recruitment.Application','CompanyQueue',['CompanyId','Status','SubmittedAt']);
  T('recruitment.ApplicationEvent','Append-only decisions, withdrawal, automatic closure and placement activation.',[id('EventId'),uid('ApplicationId'),actor('ActorId'),txt('Action',32),txt('Reason',1000,true),time()],['EventId']);F('recruitment.ApplicationEvent',['ApplicationId'],'recruitment.Application',['ApplicationId']);F('recruitment.ApplicationEvent',['ActorId'],'core.UserAccount',['UserId']);
  T('training.Placement','Placement agreement and retained outcome. One active placement per student; every placement has a distinct application.',[id('PlacementId'),uid('ApplicationId'),uid('StudentId'),uid('CollegeId'),uid('CompanyId'),txt('RoleTitle',160),num('RequiredHours'),num('MinimumWeeks'),num('MaximumWeeklyHours','int',true),c('StartDate','date'),c('EndDate','date',true),txt('Status',16),txt('EndReason',1500,true),actor('ActivatedBy'),time(),version()],['PlacementId'],{enums:[en('Status',['Active','Completed','Left'],'Active')]});U('training.Placement','Application',['ApplicationId']);U('training.Placement','Scope',['PlacementId','StudentId','CollegeId','CompanyId']);F('training.Placement',['ApplicationId','StudentId','CollegeId','CompanyId'],'recruitment.Application',['ApplicationId','StudentId','CollegeId','CompanyId']);F('training.Placement',['ActivatedBy'],'core.UserAccount',['UserId']);I('training.Placement','ActiveStudent',['StudentId'],"[Status]=N'Active'",true);C('training.Placement','Dates',"([EndDate] IS NULL OR [EndDate]>=[StartDate]) AND ([Status]=N'Active' OR [EndDate] IS NOT NULL)");C('training.Placement','Requirement','[RequiredHours]>0 AND [MinimumWeeks] BETWEEN 1 AND 52 AND ([MaximumWeeklyHours] IS NULL OR [MaximumWeeklyHours] BETWEEN 1 AND 168)');
  T('training.PlacementWeek','Fixed weekly agreement and one supervisor-verified credit. A previous week with any report submission unlocks the next week permanently.',[id('WeekId'),uid('PlacementId'),num('WeekNumber'),txt('AgreedTitle',160),num('AllocatedHours'),txt('WorkTitle',160),txt('Status',20),num('PlanRevision'),version(),
    c('VerifiedReportId','uniqueidentifier',true), num('VerifiedHours','int',true), time('VerifiedAt',true)],['WeekId'],{enums:[en('Status',['Draft','Submitted','Revision','Verified'],'Draft')]});U('training.PlacementWeek','Ordinal',['PlacementId','WeekNumber']);U('training.PlacementWeek','Scope',['WeekId','PlacementId']);F('training.PlacementWeek',['PlacementId'],'training.Placement',['PlacementId']);C('training.PlacementWeek','Allocation','[WeekNumber] BETWEEN 1 AND 52 AND [AllocatedHours] BETWEEN 1 AND 168 AND [PlanRevision]>0');
  C('training.PlacementWeek','Verification',"([Status]<>N'Verified' AND [VerifiedReportId] IS NULL AND [VerifiedAt] IS NULL AND [VerifiedHours] IS NULL) OR ([Status]=N'Verified' AND [VerifiedReportId] IS NOT NULL AND [VerifiedAt] IS NOT NULL AND [VerifiedHours] IS NOT NULL AND [VerifiedHours]=[AllocatedHours])");
  F('training.PlacementWeek',['VerifiedReportId', 'WeekId', 'AllocatedHours', 'Status'],'training.WeeklyReport',['ReportId', 'WeekId', 'ReportedHours', 'Decision']);
  I('training.PlacementWeek','VerifiedReport',['VerifiedReportId'],'[VerifiedReportId] IS NOT NULL',true);
  T('training.WeekPlanRevision','Historical work-title and objective-plan revisions. Allocation remains fixed.',[uid('WeekId'),num('RevisionNumber'),txt('WorkTitle',160),actor(),time(),
    c('ObjectivesJson','nvarchar(max)',false,{default:"N'[]'", description:'An ordered array of planned objectives with objectiveId, ordinal and text.'})],['WeekId','RevisionNumber']);F('training.WeekPlanRevision',['WeekId'],'training.PlacementWeek',['WeekId']);F('training.WeekPlanRevision',['CreatedBy'],'core.UserAccount',['UserId']);
  C('training.WeekPlanRevision','ObjectivesJson',"ISJSON([ObjectivesJson], ARRAY)=1");
  T('training.Objective','Company-authored checklist outcome and evidence. Supervisor never scores objectives.',[id('ObjectiveId'),uid('WeekId'),num('Ordinal'),txt('Text',500),bit('IsComplete'),txt('Evidence',500,true),time('RemovedAt',true),time('UpdatedAt')],['ObjectiveId']);U('training.Objective','Scope',['ObjectiveId','WeekId']);F('training.Objective',['WeekId'],'training.PlacementWeek',['WeekId']);C('training.Objective','Ordinal','[Ordinal]>0');
  T('training.Task','Company assignment identity with retained removal history.',[id('TaskId'),uid('WeekId'),actor(),time(),time('RemovedAt',true)],['TaskId']);U('training.Task','Scope',['TaskId','WeekId']);F('training.Task',['WeekId'],'training.PlacementWeek',['WeekId']);F('training.Task',['CreatedBy'],'core.UserAccount',['UserId']);
  T('training.TaskRevision','Immutable assignment instructions used by each submitted work version.',[uid('TaskId'),num('RevisionNumber'),txt('Title',120),txt('Instructions',2000,true),c('DueDate','date',true),actor(),time()],['TaskId','RevisionNumber']);F('training.TaskRevision',['TaskId'],'training.Task',['TaskId']);F('training.TaskRevision',['CreatedBy'],'core.UserAccount',['UserId']);C('training.TaskRevision','Revision','[RevisionNumber]>0');
  T('training.TaskAttachment','Company/student PDF reference, restricted to its task and owner.',[id('AttachmentId'),uid('TaskId'),uid('FileId'),uid('OwnerId'),time(),time('RemovedAt',true)],['AttachmentId']);U('training.TaskAttachment','Scope',['AttachmentId','TaskId']);F('training.TaskAttachment',['TaskId'],'training.Task',['TaskId']);F('training.TaskAttachment',['FileId'],'core.FileAsset',['FileId']);F('training.TaskAttachment',['OwnerId'],'core.UserAccount',['UserId']);
  T('training.TaskSubmission','Immutable student deliverable version referring to the instructions actually submitted against.',[id('SubmissionId'),uid('TaskId'),num('VersionNumber'),num('TaskRevision'),txt('Description',3000,true),txt('WorkUrl',2048,true),actor('SubmittedBy'),time('SubmittedAt'),
    txt('Outcome',24,true), txt('Feedback',3000,true), c('ReviewedBy','uniqueidentifier',true), time('ReviewedAt',true)],['SubmissionId']);U('training.TaskSubmission','Version',['TaskId','VersionNumber']);U('training.TaskSubmission','Scope',['SubmissionId','TaskId']);F('training.TaskSubmission',['TaskId','TaskRevision'],'training.TaskRevision',['TaskId','RevisionNumber']);F('training.TaskSubmission',['SubmittedBy'],'core.UserAccount',['UserId']);C('training.TaskSubmission','Version','[VersionNumber]>0');C('training.TaskSubmission','Link',"[WorkUrl] IS NULL OR [WorkUrl] LIKE N'https://%' OR [WorkUrl] LIKE N'http://%'");
  F('training.TaskSubmission',['ReviewedBy'],'core.UserAccount',['UserId']);
  C('training.TaskSubmission','Review',"([Outcome] IS NULL AND [Feedback] IS NULL AND [ReviewedBy] IS NULL AND [ReviewedAt] IS NULL) OR ([Outcome] IS NOT NULL AND [Outcome] IN (N'Completed',N'Changes requested') AND [ReviewedBy] IS NOT NULL AND [ReviewedAt] IS NOT NULL AND [ReviewedAt]>=[SubmittedAt] AND ([Outcome]=N'Completed' OR NULLIF(TRIM([Feedback]),N'') IS NOT NULL))");
  T('training.SubmissionFile','Immutable attachment references copied into a student submission.',[uid('SubmissionId'),uid('TaskId'),uid('AttachmentId')],['SubmissionId','AttachmentId']);F('training.SubmissionFile',['SubmissionId','TaskId'],'training.TaskSubmission',['SubmissionId','TaskId']);F('training.SubmissionFile',['AttachmentId','TaskId'],'training.TaskAttachment',['AttachmentId','TaskId']);
  T('training.WeeklyReport','Immutable company report submission; each revision is another report version.',[id('ReportId'),uid('WeekId'),num('SubmissionNumber'),num('PlanRevision'),num('ReportedHours'),txt('CompanyFeedback',3000),actor('SubmittedBy'),time('SubmittedAt'),
    c('ObjectivesJson','nvarchar(max)',false,{default:"N'[]'", description:'An array of objective results with objectiveId, text, isComplete and evidence, captured at submission.'}),
    c('SupervisorId','uniqueidentifier',true), txt('Decision',20,true), txt('Notes',3000,true), time('ReviewedAt',true)],['ReportId']);U('training.WeeklyReport','Version',['WeekId','SubmissionNumber']);U('training.WeeklyReport','Scope',['ReportId','WeekId']);F('training.WeeklyReport',['WeekId','PlanRevision'],'training.WeekPlanRevision',['WeekId','RevisionNumber']);F('training.WeeklyReport',['SubmittedBy'],'core.UserAccount',['UserId']);C('training.WeeklyReport','Content','[SubmissionNumber]>0 AND [ReportedHours] BETWEEN 1 AND 168 AND LEN(LTRIM(RTRIM([CompanyFeedback])))>0');
  U('training.PlacementWeek','AgreedAllocation',['WeekId','AllocatedHours']);
  F('training.WeeklyReport',['WeekId','ReportedHours'],'training.PlacementWeek',['WeekId','AllocatedHours'],'reports agreed allocation');
  C('training.WeeklyReport','ObjectivesJson',"ISJSON([ObjectivesJson], ARRAY)=1");
  F('training.WeeklyReport',['SupervisorId'],'core.Supervisor',['SupervisorId']);
  C('training.WeeklyReport','Review',"([Decision] IS NULL AND [SupervisorId] IS NULL AND [Notes] IS NULL AND [ReviewedAt] IS NULL) OR ([Decision] IS NOT NULL AND [Decision] IN (N'Verified',N'Revision requested') AND [SupervisorId] IS NOT NULL AND [ReviewedAt] IS NOT NULL AND [ReviewedAt]>=[SubmittedAt] AND ([Decision]=N'Verified' OR NULLIF(TRIM([Notes]),N'') IS NOT NULL))");
  U('training.WeeklyReport','VerifiedScope',['ReportId','WeekId','ReportedHours','Decision']);
  I('training.WeeklyReport','VerifiedWeek',['WeekId'],"[Decision]=N'Verified'",true);
  T('training.CompanyEvaluation','Versioned final company evaluation, retained for its original placement.',[id('EvaluationId'),uid('PlacementId'),num('VersionNumber'),txt('Comments',3000,true),actor('SubmittedBy'),time('SubmittedAt'),
    num('PerformanceScore','tinyint'), num('ResponsibilityScore','tinyint'), num('AccuracyScore','tinyint'), num('AttendanceScore','tinyint'), num('TeamworkScore','tinyint'), num('AdaptabilityScore','tinyint'), num('LearningScore','tinyint'), num('CurriculumScore','tinyint')],['EvaluationId']);U('training.CompanyEvaluation','Version',['PlacementId','VersionNumber']);U('training.CompanyEvaluation','Scope',['EvaluationId','PlacementId']);F('training.CompanyEvaluation',['PlacementId'],'training.Placement',['PlacementId']);F('training.CompanyEvaluation',['SubmittedBy'],'core.UserAccount',['UserId']);
  C('training.CompanyEvaluation','Rubric',"[PerformanceScore] BETWEEN 1 AND 5 AND [ResponsibilityScore] BETWEEN 1 AND 5 AND [AccuracyScore] BETWEEN 1 AND 5 AND [AttendanceScore] BETWEEN 1 AND 5 AND [TeamworkScore] BETWEEN 1 AND 5 AND [AdaptabilityScore] BETWEEN 1 AND 5 AND [LearningScore] BETWEEN 1 AND 5 AND [CurriculumScore] BETWEEN 1 AND 5");
  T('training.AcademicAssessment','Separate supervisor assessment bound to a particular company evaluation and placement.',[id('AssessmentId'),uid('PlacementId'),uid('EvaluationId'),uid('SupervisorId'),num('VersionNumber'),txt('Notes',3000),time('ForwardedAt'),
    txt('LearningOutcome',24), txt('EngagementOutcome',24), txt('EvidenceOutcome',24)],['AssessmentId']);U('training.AcademicAssessment','Version',['PlacementId','VersionNumber']);U('training.AcademicAssessment','Scope',['AssessmentId','PlacementId','EvaluationId']);F('training.AcademicAssessment',['EvaluationId','PlacementId'],'training.CompanyEvaluation',['EvaluationId','PlacementId']);F('training.AcademicAssessment',['SupervisorId'],'core.Supervisor',['SupervisorId']);C('training.AcademicAssessment','Notes','([Notes] IS NOT NULL AND LEN(LTRIM(RTRIM([Notes])))>0)');
  C('training.AcademicAssessment','LearningOutcome',"[LearningOutcome] IN (N'Meets requirements',N'Needs follow-up')");
  C('training.AcademicAssessment','EngagementOutcome',"[EngagementOutcome] IN (N'Meets requirements',N'Needs follow-up')");
  C('training.AcademicAssessment','EvidenceOutcome',"[EvidenceOutcome] IN (N'Meets requirements',N'Needs follow-up')");
  T('training.Certificate','Immutable issued certificate identity and display snapshot. Prior placements retain their own certificate.',[id('CertificateId'),uid('PlacementId'),txt('SerialNumber',40),txt('StudentName',160),txt('StudentNumber',40),txt('CollegeName',200),txt('CompanyName',200),txt('RoleTitle',160),c('StartDate','date'),c('EndDate','date'),num('VerifiedHours'),time('IssuedAt'),
    uid('EvaluationId'), uid('AssessmentId'), actor('ApprovedBy'), time('ApprovedAt')],['CertificateId']);U('training.Certificate','Placement',['PlacementId']);U('training.Certificate','Serial',['SerialNumber']);C('training.Certificate','Content','[VerifiedHours]>0 AND [EndDate]>=[StartDate]');
  F('training.Certificate',['AssessmentId', 'PlacementId', 'EvaluationId'],'training.AcademicAssessment',['AssessmentId', 'PlacementId', 'EvaluationId']);
  F('training.Certificate',['ApprovedBy'],'core.UserAccount',['UserId']);
  F('training.Certificate',['PlacementId'],'training.Placement',['PlacementId']);
  T('attendance.QrSession','Opaque attendance session. Individual codes bind to a placement; shared codes bind to a company and training date.',[id('SessionId'),uid('CompanyId'),c('PlacementId','uniqueidentifier',true),txt('Kind',16),txt('Action',16),c('TrainingDate','date'),c('TokenHash','binary(32)'),c('IssuedAt','datetime2(3)'),c('ExpiresAt','datetime2(3)'),txt('Status',16),actor('IssuedBy')],['SessionId'],{enums:[en('Kind',['Individual','Shared']),en('Action',['CheckIn','CheckOut']),en('Status',['Open','Consumed','Closed','Replaced'],'Open')]});U('attendance.QrSession','TokenHash',['TokenHash']);F('attendance.QrSession',['CompanyId'],'core.Company',['CompanyId']);F('attendance.QrSession',['PlacementId'],'training.Placement',['PlacementId']);F('attendance.QrSession',['IssuedBy'],'core.UserAccount',['UserId']);C('attendance.QrSession','Expiry','DATEDIFF_BIG(millisecond,[IssuedAt],[ExpiresAt])=120000');C('attendance.QrSession','Binding',"([Kind]=N'Individual' AND [PlacementId] IS NOT NULL) OR ([Kind]=N'Shared' AND [PlacementId] IS NULL)");
  T('attendance.AttendanceRecord','One record per placement and Amman calendar date. Missing rows mean Not recorded, never automatically absent.',[id('RecordId'),uid('PlacementId'),c('TrainingDate','date'),txt('Status',16),c('CheckInAt','datetime2(3)',true),c('CheckOutAt','datetime2(3)',true),time(),version()],['RecordId'],{enums:[en('Status',['Present','Absent','Excused'])]});U('attendance.AttendanceRecord','Day',['PlacementId','TrainingDate']);U('attendance.AttendanceRecord','Placement',['RecordId','PlacementId']);F('attendance.AttendanceRecord',['PlacementId'],'training.Placement',['PlacementId']);C('attendance.AttendanceRecord','Times','[CheckOutAt] IS NULL OR ([CheckInAt] IS NOT NULL AND [CheckOutAt]>=[CheckInAt])');
  T('attendance.AttendanceEvent','Each successful scan consumes the QR session for this placement. Corrections keep the actor, time, and reason.',[
    id('EventId'), uid('RecordId'), uid('PlacementId'), c('SessionId','uniqueidentifier',true), actor('ActorId'),
    txt('Action',16), txt('BeforeStatus',16,true), txt('AfterStatus',16), txt('Reason',1000,true), time()
  ],['EventId'],{enums:[en('Action',['CheckIn','CheckOut','Correction']),en('BeforeStatus',['Present','Absent','Excused']),en('AfterStatus',['Present','Absent','Excused'])]});
  F('attendance.AttendanceEvent',['RecordId','PlacementId'],'attendance.AttendanceRecord',['RecordId','PlacementId']);
  U('attendance.QrSession','Action',['SessionId','Action']);
  F('attendance.AttendanceEvent',['SessionId','Action'],'attendance.QrSession',['SessionId','Action']);
  F('attendance.AttendanceEvent',['ActorId'],'core.UserAccount',['UserId']);
  C('attendance.AttendanceEvent','Source', "([Action]=N'Correction' AND [SessionId] IS NULL AND [Reason] IS NOT NULL AND LEN(TRIM([Reason]))>0) OR ([Action] IN (N'CheckIn',N'CheckOut') AND [SessionId] IS NOT NULL)");
  I('attendance.AttendanceEvent','ScanPerPlacement',['SessionId','PlacementId'],'[SessionId] IS NOT NULL',true);
  T('attendance.CorrectionRequest','Student correction concern, resolved explicitly by a host-company correction.',[id('RequestId'),uid('RecordId'),uid('StudentId'),txt('Reason',1000),time('RequestedAt'),time('ResolvedAt',true),c('ResolvedBy','uniqueidentifier',true)],['RequestId']);F('attendance.CorrectionRequest',['RecordId'],'attendance.AttendanceRecord',['RecordId']);F('attendance.CorrectionRequest',['StudentId'],'core.Student',['StudentId']);F('attendance.CorrectionRequest',['ResolvedBy'],'core.UserAccount',['UserId']);I('attendance.CorrectionRequest','OpenRecord',['RecordId'],'[ResolvedAt] IS NULL',true);C('attendance.CorrectionRequest','Reason','([Reason] IS NOT NULL AND LEN(LTRIM(RTRIM([Reason])))>0)');
  T('meetings.Meeting','An academic meeting belongs to its original academic assignment. A company interview belongs to its original application.',[
    id('MeetingId'), txt('Kind',16), c('ApplicationId','uniqueidentifier',true), c('AssignmentId','uniqueidentifier',true),
    txt('Status',24), num('CurrentRevision','int',true), time(), version()
  ],['MeetingId'],{enums:[en('Kind',['Academic','Interview']),en('Status',['Requested','Confirmed','Reschedule requested','Cancelled','Completed'],'Requested')]});
  C('meetings.Meeting','Owner', "([Kind]=N'Academic' AND [AssignmentId] IS NOT NULL AND [ApplicationId] IS NULL) OR ([Kind]=N'Interview' AND [ApplicationId] IS NOT NULL AND [AssignmentId] IS NULL)");
  U('meetings.Meeting','MeetingKind',['MeetingId','Kind']);
  F('meetings.Meeting',['AssignmentId'],'core.AcademicAssignment',['AssignmentId'],'belongs to original assignment');
  F('meetings.Meeting',['ApplicationId'],'recruitment.Application',['ApplicationId'],'belongs to original application');
  I('meetings.Meeting','InterviewPerApplication',['ApplicationId'],'[ApplicationId] IS NOT NULL',true);
  T('meetings.MeetingRevision','A dated schedule version with the supplied provider link or interview location. Academic sessions use a Zoom meeting URL.',[
    uid('MeetingId'), num('RevisionNumber'), txt('Kind',16), txt('Title',120,true), c('StartsAt','datetime2(3)'),
    num('DurationMinutes'), txt('Mode',16), txt('Location',300,true), txt('MeetingUrl',2048,true),
    txt('Preparation',2000,true), actor(), time()
  ],['MeetingId','RevisionNumber'],{enums:[en('Mode',['Online','Phone','On site'])]});
  F('meetings.MeetingRevision',['MeetingId','Kind'],'meetings.Meeting',['MeetingId','Kind']);
  F('meetings.MeetingRevision',['CreatedBy'],'core.UserAccount',['UserId']);
  F('meetings.Meeting',['MeetingId','CurrentRevision'],'meetings.MeetingRevision',['MeetingId','RevisionNumber'],'selects schedule');
  C('meetings.MeetingRevision','Duration', "[RevisionNumber]>0 AND ([DurationMinutes] IN (15,30,45,60) OR ([Kind]=N'Academic' AND [DurationMinutes]=90))");
  C('meetings.MeetingRevision','Format', "([Mode]=N'Online' AND [MeetingUrl] IS NOT NULL AND [MeetingUrl] LIKE N'https://_%') OR ([Kind]=N'Interview' AND [Mode] IN (N'Phone',N'On site') AND [Location] IS NOT NULL AND LEN(TRIM([Location]))>0)");
  // Extract the host separately so an unrelated URL containing zoom.us in its path cannot pass.
  const firstPathSlash = "CHARINDEX(N'/', [MeetingUrl], 9)";
  const meetingHost = `LOWER(SUBSTRING([MeetingUrl],9,CASE WHEN ${firstPathSlash}>9 THEN ${firstPathSlash}-9 ELSE 0 END))`;
  const meetingPath = `SUBSTRING([MeetingUrl],${firstPathSlash},2048)`;
  C('meetings.MeetingRevision','AcademicSchedule', `[Kind]<>N'Academic' OR ([Title] IS NOT NULL AND LEN(TRIM([Title]))>0 AND [Mode]=N'Online' AND [MeetingUrl] IS NOT NULL AND ${meetingHost} COLLATE Latin1_General_100_BIN2 NOT LIKE N'%[^a-z0-9.-]%' AND (${meetingHost}=N'zoom.us' OR ${meetingHost} LIKE N'_%.zoom.us') AND (${meetingPath} LIKE N'/j/[A-Za-z0-9]%' OR ${meetingPath} LIKE N'/my/[A-Za-z0-9]%' OR ${meetingPath} LIKE N'/wc/[A-Za-z0-9]%'))`);
  T('meetings.MeetingEvent','An action against an exact meeting revision, including confirmation, proposed rescheduling, cancellation or completion.',[
    id('EventId'), uid('MeetingId'), num('RevisionNumber'), actor('ActorId'), txt('Action',32),
    txt('Note',1000,true), c('AlternativeStartsAt','datetime2(3)',true), time()
  ],['EventId'],{enums:[en('Action',['Requested','Confirmed','Reschedule requested','Rescheduled','Cancelled','Completed'])]});
  F('meetings.MeetingEvent',['MeetingId','RevisionNumber'],'meetings.MeetingRevision',['MeetingId','RevisionNumber']);
  F('meetings.MeetingEvent',['ActorId'],'core.UserAccount',['UserId']);
  C('meetings.MeetingEvent','SuggestedTime', "[AlternativeStartsAt] IS NULL OR [Action]=N'Reschedule requested'");
  T('support.Ticket','Routed support conversation. Unassigned student tickets wait for assignment while remaining In progress.',[id('TicketId'),uid('RequesterId'),txt('Subject',120),txt('Category',40),txt('Priority',16),txt('Context',180,true),c('PlacementId','uniqueidentifier',true),c('ListingId','uniqueidentifier',true),c('WeekId','uniqueidentifier',true),txt('RecipientRole',20),c('RecipientOrganizationId','uniqueidentifier',true),c('RecipientSupervisorId','uniqueidentifier',true),txt('Status',24),time(),time('UpdatedAt'),time('ResolvedAt',true),version()],['TicketId'],{enums:[en('Status',['In progress','Awaiting requester','Resolved'],'In progress'),en('Priority',['Normal'],'Normal'),en('RecipientRole',['PlatformAdmin','CollegeAdmin','Supervisor'])]});F('support.Ticket',['RequesterId'],'core.UserAccount',['UserId']);F('support.Ticket',['RecipientOrganizationId'],'core.Organization',['OrganizationId']);F('support.Ticket',['RecipientSupervisorId'],'core.Supervisor',['SupervisorId']);F('support.Ticket',['PlacementId'],'training.Placement',['PlacementId']);F('support.Ticket',['ListingId'],'recruitment.Listing',['ListingId']);F('support.Ticket',['WeekId'],'training.PlacementWeek',['WeekId']);C('support.Ticket','Resolution',"([Status]=N'Resolved' AND [ResolvedAt] IS NOT NULL) OR ([Status]<>N'Resolved' AND [ResolvedAt] IS NULL)");
  const ticketStatuses=['In progress','Awaiting requester','Resolved'];
  T('support.TicketEntry','An ordered requester or handler message, routing change, or resolution in a ticket conversation.',[
    id('EntryId'), c('EntryNumber','bigint',false,{identity:true}), uid('TicketId'), actor('ActorId'), txt('Kind',16),
    txt('Body',3000,true), txt('Action',32), txt('FromStatus',24,true), txt('ToStatus',24),
    c('RecipientSupervisorId','uniqueidentifier',true), time()
  ],['EntryId'],{enums:[en('Kind',['Message','Routing','Status']),en('FromStatus',ticketStatuses),en('ToStatus',ticketStatuses)]});
  U('support.TicketEntry','Sequence',['EntryNumber']);
  F('support.TicketEntry',['TicketId'],'support.Ticket',['TicketId']);
  F('support.TicketEntry',['ActorId'],'core.UserAccount',['UserId']);
  F('support.TicketEntry',['RecipientSupervisorId'],'core.Supervisor',['SupervisorId']);
  C('support.TicketEntry','Content',"([Kind]=N'Message' AND [Body] IS NOT NULL AND LEN(TRIM([Body]))>0) OR ([Kind] IN (N'Routing',N'Status') AND [Body] IS NULL)");
  C('support.TicketEntry','Action','LEN(TRIM([Action]))>0');
  I('support.TicketEntry','Conversation',['TicketId','EntryNumber']);
  T('learning.Course','Planned course catalogue identity. No enrolments or purchases are fabricated.',[id('CourseId'),txt('Slug',100),txt('Status',16),num('CurrentVersion','int',true),time()],['CourseId'],{enums:[en('Status',['Draft','Published','Retired'],'Draft')]});U('learning.Course','Slug',['Slug']);
  T('learning.CourseVersion','Immutable course title and outline used by purchased entitlements.',[uid('CourseId'),num('VersionNumber'),txt('Title',160),txt('Category',100),txt('Description',4000),time()],['CourseId','VersionNumber']);F('learning.CourseVersion',['CourseId'],'learning.Course',['CourseId']);F('learning.Course',['CourseId','CurrentVersion'],'learning.CourseVersion',['CourseId','VersionNumber'],'selects content');
  T('learning.Lesson','Ordered lessons in an immutable course version.',[id('LessonId'),uid('CourseId'),num('CourseVersion'),num('Ordinal'),txt('Title',160),txt('Summary',2000),c('ContentFileId','uniqueidentifier',true)],['LessonId']);U('learning.Lesson','Ordinal',['CourseId','CourseVersion','Ordinal']);U('learning.Lesson','Scope',['LessonId','CourseId','CourseVersion']);F('learning.Lesson',['CourseId','CourseVersion'],'learning.CourseVersion',['CourseId','VersionNumber']);F('learning.Lesson',['ContentFileId'],'core.FileAsset',['FileId']);C('learning.Lesson','Ordinal','[Ordinal]>0');
  T('commerce.Product','Planned one-time individual-course or bundle offer. No subscriptions are assumed.',[id('ProductId'),txt('Kind',16),txt('Title',160),c('Price','decimal(19,4)'),c('Currency','char(3)'),txt('Status',16),time(),version()],['ProductId'],{enums:[en('Kind',['Course','Bundle']),en('Status',['Draft','Active','Retired'],'Draft')]});C('commerce.Product','Price','[Price]>=0 AND [Currency] COLLATE Latin1_General_100_BIN2 LIKE \'[A-Z][A-Z][A-Z]\'');
  T('commerce.ProductCourse','Courses and exact versions offered by a product. Bundle contents are copied into each order.',[uid('ProductId'),uid('CourseId'),num('CourseVersion')],['ProductId','CourseId']);F('commerce.ProductCourse',['ProductId'],'commerce.Product',['ProductId']);F('commerce.ProductCourse',['CourseId','CourseVersion'],'learning.CourseVersion',['CourseId','VersionNumber']);
  T('commerce.PurchaseOrder','Planned one-time checkout with currency and immutable quoted total; no card data.',[id('OrderId'),uid('BuyerId'),txt('Status',20),c('Currency','char(3)'),c('TotalAmount','decimal(19,4)'),txt('CheckoutKey',100),time(),time('PaidAt',true),version()],['OrderId'],{enums:[en('Status',['Pending','Paid','Cancelled','Refunded','Partially refunded'],'Pending')]});U('commerce.PurchaseOrder','Checkout',['BuyerId','CheckoutKey']);F('commerce.PurchaseOrder',['BuyerId'],'core.UserAccount',['UserId']);C('commerce.PurchaseOrder','Total','[TotalAmount]>=0');
  T('commerce.OrderItem','Immutable product-title and price snapshot at checkout. Quantity is one for digital course access.',[id('OrderItemId'),uid('OrderId'),uid('ProductId'),txt('ProductTitle',160),c('UnitPrice','decimal(19,4)')],['OrderItemId']);U('commerce.OrderItem','Product',['OrderId','ProductId']);F('commerce.OrderItem',['OrderId'],'commerce.PurchaseOrder',['OrderId']);F('commerce.OrderItem',['ProductId'],'commerce.Product',['ProductId']);C('commerce.OrderItem','Price','[UnitPrice]>=0');
  T('commerce.OrderItemCourse','Immutable purchased bundle composition and entitled course version.',[uid('OrderItemId'),uid('CourseId'),num('CourseVersion')],['OrderItemId','CourseId']);F('commerce.OrderItemCourse',['OrderItemId'],'commerce.OrderItem',['OrderItemId']);F('commerce.OrderItemCourse',['CourseId','CourseVersion'],'learning.CourseVersion',['CourseId','VersionNumber']);
  T('commerce.Payment','Provider-referenced payment attempt. Secrets and payment-card details do not belong here.',[id('PaymentId'),uid('OrderId'),txt('Provider',40),txt('ProviderPaymentId',160),txt('Status',20),c('Amount','decimal(19,4)'),c('Currency','char(3)'),time(),time('ConfirmedAt',true)],['PaymentId'],{enums:[en('Status',['Pending','Succeeded','Failed'],'Pending')]});U('commerce.Payment','Provider',['Provider','ProviderPaymentId']);F('commerce.Payment',['OrderId'],'commerce.PurchaseOrder',['OrderId']);C('commerce.Payment','Amount','[Amount]>=0');I('commerce.Payment','SucceededOrder',['OrderId'],"[Status]=N'Succeeded'",true);
  T('commerce.PaymentEvent','Idempotent provider callback reference. Signature verification belongs to the future backend.',[id('EventId'),uid('PaymentId'),txt('Provider',40),txt('ProviderEventId',160),txt('EventType',80),time('ReceivedAt')],['EventId']);U('commerce.PaymentEvent','ProviderEvent',['Provider','ProviderEventId']);F('commerce.PaymentEvent',['PaymentId'],'commerce.Payment',['PaymentId']);
  T('commerce.Refund','Provider-referenced partial or full refund, retained independently of the original payment.',[id('RefundId'),uid('PaymentId'),txt('ProviderRefundId',160),c('Amount','decimal(19,4)'),txt('Reason',1000),txt('Status',16),time()],['RefundId'],{enums:[en('Status',['Pending','Succeeded','Failed'],'Pending')]});U('commerce.Refund','ProviderReference',['PaymentId','ProviderRefundId']);F('commerce.Refund',['PaymentId'],'commerce.Payment',['PaymentId']);C('commerce.Refund','Amount','[Amount]>0');
  T('learning.Enrollment','Planned access entitlement granted by a verified paid order; revocation is explicit.',[id('EnrollmentId'),uid('StudentId'),uid('CourseId'),num('CourseVersion'),uid('OrderItemId'),txt('Status',16),time('GrantedAt'),time('RevokedAt',true),txt('RevocationReason',1000,true)],['EnrollmentId'],{enums:[en('Status',['Active','Completed','Revoked'],'Active')]});F('learning.Enrollment',['StudentId'],'core.Student',['StudentId']);U('commerce.OrderItemCourse','VersionScope',['OrderItemId','CourseId','CourseVersion']);F('learning.Enrollment',['OrderItemId','CourseId','CourseVersion'],'commerce.OrderItemCourse',['OrderItemId','CourseId','CourseVersion']);F('learning.Enrollment',['CourseId','CourseVersion'],'learning.CourseVersion',['CourseId','VersionNumber']);U('learning.Enrollment','Scope',['EnrollmentId','CourseId','CourseVersion']);U('learning.Enrollment','Source',['StudentId','OrderItemId','CourseId']);I('learning.Enrollment','ActiveCourse',['StudentId','CourseId'],"[Status]<>N'Revoked'",true);
  T('learning.LessonProgress','Planned progress against the enrolled course version; never contributes internship hours.',[uid('EnrollmentId'),uid('CourseId'),num('CourseVersion'),uid('LessonId'),time('CompletedAt')],['EnrollmentId','LessonId']);F('learning.LessonProgress',['EnrollmentId','CourseId','CourseVersion'],'learning.Enrollment',['EnrollmentId','CourseId','CourseVersion']);F('learning.LessonProgress',['LessonId','CourseId','CourseVersion'],'learning.Lesson',['LessonId','CourseId','CourseVersion']);
  T('ai.CvMatchRun','A planned CV comparison records its exact inputs and model configuration. A successful run holds its role-fit score.',[
    id('RunId'), uid('StudentId'), uid('CvVersionId'), uid('ListingId'), num('ListingVersion'),
    txt('Provider',80), txt('ModelName',160), txt('ModelVersion',100), txt('PromptVersion',100), txt('Configuration',4000,true),
    txt('Status',16), txt('RequestKey',100), txt('FailureReason',1000,true), time('RequestedAt'), time('StartedAt',true),
    time('FinishedAt',true), c('RoleFitScore','decimal(5,2)',true), txt('Summary',3000,true), time('AnalyzedAt',true), version()
  ],['RunId'],{enums:[en('Status',['Pending','Running','Succeeded','Failed','Cancelled'],'Pending')]});
  U('ai.CvMatchRun','Request',['StudentId','RequestKey']);
  F('ai.CvMatchRun',['CvVersionId','StudentId'],'core.StudentCvVersion',['CvVersionId','StudentId']);
  F('ai.CvMatchRun',['ListingId','ListingVersion'],'recruitment.ListingVersion',['ListingId','VersionNumber']);
  C('ai.CvMatchRun','Config','[Configuration] IS NULL OR ISJSON([Configuration])=1');
  C('ai.CvMatchRun','Result',"([Status]=N'Succeeded' AND [RoleFitScore] IS NOT NULL AND [RoleFitScore] BETWEEN 0 AND 100 AND [AnalyzedAt] IS NOT NULL AND [FinishedAt] IS NOT NULL AND [FailureReason] IS NULL) OR ([Status]<>N'Succeeded' AND [RoleFitScore] IS NULL AND [Summary] IS NULL AND [AnalyzedAt] IS NULL)");
  T('notifications.Notification','Planned per-recipient notification queue. Queuing never proves an invitation or message was delivered.',[id('NotificationId'),uid('RecipientId'),txt('Channel',16),txt('TemplateKey',100),txt('Subject',200),txt('Body',4000),txt('Status',16),txt('IdempotencyKey',160),time(),time('ReadAt',true),version()],['NotificationId'],{enums:[en('Channel',['InApp','Email']),en('Status',['Pending','Attempted','Delivered','Failed','Cancelled'],'Pending')]});F('notifications.Notification',['RecipientId'],'core.UserAccount',['UserId']);U('notifications.Notification','Idempotency',['RecipientId','Channel','IdempotencyKey']);
  T('notifications.DeliveryAttempt','Planned actual dispatch attempt and provider outcome, distinct from notification creation.',[id('AttemptId'),uid('NotificationId'),num('AttemptNumber'),txt('Provider',80),txt('ProviderMessageId',160,true),txt('Status',16),txt('FailureReason',1000,true),time('AttemptedAt'),time('FinishedAt',true)],['AttemptId'],{enums:[en('Status',['Attempted','Delivered','Failed'])]});U('notifications.DeliveryAttempt','Ordinal',['NotificationId','AttemptNumber']);F('notifications.DeliveryAttempt',['NotificationId'],'notifications.Notification',['NotificationId']);C('notifications.DeliveryAttempt','Attempt','[AttemptNumber]>0');
  T('core.AuditEvent','Append-only action trail, including account/access changes and retained legacy audit messages. Entity references are descriptive audit context, not polymorphic foreign keys.',[id('AuditId'),c('ActorId','uniqueidentifier',true),txt('ActorRole',20),txt('Action',300),txt('EntityType',100,true),c('EntityId','uniqueidentifier',true),c('CorrelationId','uniqueidentifier',true),time()],['AuditId']);F('core.AuditEvent',['ActorId'],'core.UserAccount',['UserId'],'records actor');C('core.AuditEvent','Action','LEN(LTRIM(RTRIM([Action])))>0');I('core.AuditEvent','ActorTime',['ActorId','CreatedAt']);I('core.AuditEvent','EntityTime',['EntityType','EntityId','CreatedAt']);
  // Every foreign key gets a leading-column index unless a key/index already covers it.
  for(const t of tables)for(const fk of t.foreignKeys){const keys=[t.primaryKey,...t.uniqueKeys,...t.indexes];if(!keys.some(k=>!k.filter&&fk.columns.every((v,i)=>k.columns[i]===v)))I(t.id,fk.columns.join('_'),fk.columns);}
  for(const t of tables)for(const fk of t.foreignKeys){fk.cardinality.from=[t.primaryKey,...t.uniqueKeys].some(k=>k.columns.every(col=>fk.columns.includes(col)))?'one':'many';}
  for(const [source,target] of [['training.CollegeProgramVersion','core.College'],['recruitment.ListingVersion','recruitment.Listing'],['recruitment.ListingScheduleWeek','recruitment.ListingVersion'],['training.PlacementWeek','training.Placement'],['training.WeekPlanRevision','training.PlacementWeek'],['support.TicketEntry','support.Ticket']]){for(const fk of find(source).foreignKeys)if(fk.target===target)fk.cardinality.parentMinimum=1;}
  const counters={};
  const layout=tables.map(t=>{const group=groups.find(g=>g.id===t.group);const column=t.group==='training'?(t.name.charCodeAt(0)%2?2:3):group.column;return {table:t.id,column,order:(counters[column]||0),...(counters[column]=(counters[column]||0)+1,{})};});
  const rules = [
    ['Accounts and college scope', 'Administrators create accounts. A college manages its students and supervisors.', 'Composite keys bind role profiles to the correct account and college. The backend must authorize the acting administrator.'],
    ['Application agreements', 'Each college sets a training program. An application keeps the submitted schedule, requirements, answers and skills.', 'The write service must check total hours, minimum weeks, any weekly limit, and the contents of the snapshot arrays before recording an application as pending.'],
    ['Publication and hiring', 'Platform Admin approves publication. Students may apply to multiple opportunities. Each company decides on applicants to its own listings.', 'Create a pending application on submission. On acceptance, close the student’s other pending applications in the same transaction. Placement activation follows acceptance.'],
    ['Partnerships and visibility', 'Platform Admin may pause any partnership. A college or company administrator may pause its own organization’s partnerships. Platform Admin and the linked college administrator may resume them when both organizations are active.', 'A college may also hide a published listing for its own students. Apply local listing restrictions to discovery and new applications. A paused partnership also blocks new placement activation. Existing training and history are preserved.'],
    ['Weekly sequence', 'Week 1 opens first. Each later week opens when the company first submits the preceding report. A revision request preserves that unlock.', 'Use the preceding week’s report history to gate objective results, student submissions, company reviews and weekly feedback. Future plan instructions can be edited under the existing report locks.'],
    ['Report locks and history', 'Submitted and verified weeks lock task work. A revision request reopens the affected week.', 'The service must check the week before each write, append revisions, preserve snapshot contents and restrict review updates to the assigned reviewer.'],
    ['Verified hours', 'A report must contain the full agreed weekly allocation. Only the assigned supervisor can verify it. Revisions and unfinished tasks earn zero hours.', 'The week records one verified report from that week. Verification must lock the week, check the latest task outcomes, and set the report decision and week credit together.'],
    ['Report visibility', 'One supervisor setting applies to all assigned students and all weeks, including future ones.', 'Student reads must hide individual report states, feedback, notes and objective outcomes when restricted. Keep the plan and total verified hours available.'],
    ['Completion', 'Completion requires all agreed weeks verified, enough hours, completed tasks, a company evaluation, a passing academic assessment and college confirmation.', 'The certificate records the approval and references both evaluations for that placement. The issuing service must verify every condition and freeze the issued record.'],
    ['Attendance and QR', 'Individual and shared codes expire in two minutes. The company records corrections with a reason and preserves history.', 'A unique session and placement pair prevents a repeated scan. The service must also check time, actor, placement eligibility and check-in status in one transaction. Attendance is independent of training hours.'],
    ['Meetings and interviews', 'The student hub reads meetings linked to the original application or academic assignment. Revisions require fresh confirmation.', 'Check the meeting kind and original participants for every read or response. Hide company interviews from academic supervisors. Closed applications and old assignments keep read-only history.'],
    ['Support conversations', 'Student tickets go to the assigned supervisor, supervisor tickets to their college administrator, and company and college administrator tickets to Platform Admin. A student ticket awaits assignment when needed.', 'Only the receiving handler can resolve the ticket after replying. A handler reply sets Awaiting requester, and a requester reply sets In progress. Record replies and status changes together. Resolution closes the thread permanently.'],
    ['Course and bundle purchases', 'A one-time purchase preserves its price and included course versions. Confirmed payment grants access.', 'The future checkout service must verify provider events and grant each entitlement once. Order lines and enrollment have independent histories.', 'Planned'],
    ['CV role matching', 'A run records its CV, listing version, model configuration and actual result.', 'Only a successful analysis can supply a role-fit score. The future worker must pin the input versions and freeze the completed result.', 'Planned'],
    ['External notifications', 'A notification may have multiple delivery attempts.', 'The future delivery worker must record each attempt and handle repeated provider responses.', 'Planned']
  ].map(([title,description,enforcement,phase = 'Current']) => ({title,description,enforcement,phase}));

  const queries = [
    {
      id: 'college-opportunities', title: 'Open opportunities for a college', description: 'Set a college ID to see published listings within their application deadline. The college’s local restrictions and paused partnerships apply. Each student’s schedule eligibility is checked when applying.',
      sql: `DECLARE @CollegeId uniqueidentifier = NULL;
DECLARE @AmmanDate date = CONVERT(date, SYSUTCDATETIME() AT TIME ZONE 'UTC' AT TIME ZONE 'Jordan Standard Time');

SELECT l.ListingId, v.Title, company.Name AS HostCompany, v.ApplicationDeadline
FROM core.College AS c
JOIN core.Organization AS college ON college.OrganizationId = c.CollegeId
CROSS JOIN recruitment.Listing AS l
JOIN recruitment.ListingVersion AS v ON v.ListingId = l.ListingId AND v.VersionNumber = l.CurrentVersion
JOIN core.Organization AS company ON company.OrganizationId = l.CompanyId
WHERE c.CollegeId = @CollegeId AND college.Status = N'Active' AND company.Status = N'Active'
  AND l.Status = N'Published' AND v.ApplicationDeadline >= @AmmanDate
  AND NOT EXISTS (SELECT 1 FROM recruitment.CollegeAvailability AS visibility
                  WHERE visibility.CollegeId = c.CollegeId AND visibility.ListingId = l.ListingId AND visibility.IsPaused = 1)
  AND NOT EXISTS (SELECT 1 FROM core.Partnership AS partnership
                  WHERE partnership.CollegeId = c.CollegeId AND partnership.CompanyId = l.CompanyId AND partnership.Status = N'Inactive')
ORDER BY v.ApplicationDeadline, v.Title, l.ListingId;`
    },
    {
      id: 'application-agreement', title: 'Application agreement', description: 'Set the application ID to read the profile, listing version and agreement captured when the student applied.',
      sql: `DECLARE @ApplicationId uniqueidentifier = NULL;

SELECT a.ApplicationId, v.Title, a.ProfileName, a.RequiredHours, a.MinimumWeeks,
       a.MaximumWeeklyHours, a.ScheduleJson, a.AnswersJson, a.SkillsJson
FROM recruitment.Application AS a
JOIN recruitment.ListingVersion AS v
  ON v.ListingId = a.ListingId AND v.VersionNumber = a.ListingVersion
WHERE a.ApplicationId = @ApplicationId;`
    },
    {
      id: 'college-program', title: 'College training requirements', description: 'Read the current version of each college’s program.',
      sql: `SELECT o.Name AS College, p.VersionNumber, p.RequiredHours,
       p.MinimumWeeks, p.MaximumWeeklyHours
FROM core.College AS c
JOIN core.Organization AS o ON o.OrganizationId = c.CollegeId
JOIN training.CollegeProgramVersion AS p
  ON p.CollegeId = c.CollegeId AND p.VersionNumber = c.CurrentProgramVersion
ORDER BY o.Name;`
    },
    {
      id: 'training-totals', title: 'Verified training hours', description: 'Add the hours verified on each placement week. Each week contributes at most once.',
      sql: `SELECT p.PlacementId, p.RequiredHours,
       SUM(COALESCE(w.VerifiedHours, 0)) AS VerifiedHours,
       COUNT(w.WeekId) AS AgreedWeeks, COUNT(w.VerifiedReportId) AS VerifiedWeeks
FROM training.Placement AS p
LEFT JOIN training.PlacementWeek AS w ON w.PlacementId = p.PlacementId
GROUP BY p.PlacementId, p.RequiredHours;`
    },
    {
      id: 'weekly-sequence', title: 'Open weeks for a placement', description: 'Set the placement ID to inspect when work can start. A submitted or verified week still has its own edit lock.',
      sql: `DECLARE @PlacementId uniqueidentifier = NULL;

SELECT w.WeekNumber, w.WorkTitle, w.Status,
       CASE WHEN w.WeekNumber = 1 OR EXISTS (
           SELECT 1
           FROM training.PlacementWeek AS prior
           JOIN training.WeeklyReport AS r ON r.WeekId = prior.WeekId
           WHERE prior.PlacementId = w.PlacementId AND prior.WeekNumber = w.WeekNumber - 1
       ) THEN 1 ELSE 0 END AS SequenceUnlocked
FROM training.PlacementWeek AS w
WHERE w.PlacementId = @PlacementId
ORDER BY w.WeekNumber;`
    },
    {
      id: 'task-feedback', title: 'Task submission history', description: 'Set the task ID to read every student submission with its company review.',
      sql: `DECLARE @TaskId uniqueidentifier = NULL;

SELECT VersionNumber, TaskRevision, Description, SubmittedAt,
       Outcome, Feedback, ReviewedBy, ReviewedAt
FROM training.TaskSubmission
WHERE TaskId = @TaskId
ORDER BY VersionNumber;`
    },
    {
      id: 'student-meetings', title: 'Student meeting schedule', description: 'Set a student ID to see the latest schedule for each academic meeting and company interview, including closed records.',
      sql: `DECLARE @StudentId uniqueidentifier = NULL;

SELECT m.MeetingId, m.Kind, m.Status, r.StartsAt, r.Mode, r.Location
FROM meetings.Meeting AS m
JOIN meetings.MeetingRevision AS r
  ON r.MeetingId = m.MeetingId AND r.RevisionNumber = m.CurrentRevision
LEFT JOIN core.AcademicAssignment AS a ON a.AssignmentId = m.AssignmentId
LEFT JOIN recruitment.Application AS app ON app.ApplicationId = m.ApplicationId
WHERE a.StudentId = @StudentId OR app.StudentId = @StudentId
ORDER BY r.StartsAt DESC;`
    },
    {
      id: 'attendance', title: 'Attendance history for a placement', description: 'Set the placement ID to see recorded days and their event history. Dates without an entry are unrecorded.',
      sql: `DECLARE @PlacementId uniqueidentifier = NULL;

SELECT r.TrainingDate, r.Status, r.CheckInAt, r.CheckOutAt,
       e.Action, e.Reason, e.CreatedAt, e.ActorId
FROM attendance.AttendanceRecord AS r
LEFT JOIN attendance.AttendanceEvent AS e ON e.RecordId = r.RecordId
WHERE r.PlacementId = @PlacementId
ORDER BY r.TrainingDate, e.CreatedAt, e.EventId;`
    },
    {
      id: 'support-thread', title: 'Support ticket conversation', description: 'Set the ticket ID to see messages and status changes in their recorded order.',
      sql: `DECLARE @TicketId uniqueidentifier = NULL;

SELECT EntryNumber, Kind, Body, Action, FromStatus, ToStatus, ActorId, CreatedAt
FROM support.TicketEntry
WHERE TicketId = @TicketId
ORDER BY EntryNumber;`
    },
    {
      id: 'entitlements', title: 'Purchased courses and bundles', description: 'Read the original course versions on paid orders, including refunded purchases. Current access is tracked in learning.Enrollment.',
      sql: `SELECT o.OrderId, o.Status, line.ProductTitle, line.UnitPrice, v.Title, v.VersionNumber
FROM commerce.PurchaseOrder AS o
JOIN commerce.OrderItem AS line ON line.OrderId = o.OrderId
JOIN commerce.OrderItemCourse AS item ON item.OrderItemId = line.OrderItemId
JOIN learning.CourseVersion AS v
  ON v.CourseId = item.CourseId AND v.VersionNumber = item.CourseVersion
WHERE o.Status IN (N'Paid', N'Partially refunded', N'Refunded')
ORDER BY o.OrderId, line.OrderItemId, v.Title;`
    },
    {
      id: 'role-fit', title: 'Completed CV matching runs', description: 'Inspect successful runs with their original input and model versions.',
      sql: `SELECT RunId, CvVersionId, ListingId, ListingVersion, Provider,
       ModelName, ModelVersion, PromptVersion, RoleFitScore, AnalyzedAt
FROM ai.CvMatchRun
WHERE Status = N'Succeeded'
ORDER BY AnalyzedAt DESC;`
    },
    {
      id: 'delivery', title: 'Notification delivery attempts', description: 'Compare a notification’s overall status with its individual delivery attempts.',
      sql: `SELECT n.NotificationId, n.Channel, n.Status AS NotificationStatus,
       a.AttemptNumber, a.Status AS AttemptStatus, a.AttemptedAt
FROM notifications.Notification AS n
LEFT JOIN notifications.DeliveryAttempt AS a ON a.NotificationId = n.NotificationId
ORDER BY n.CreatedAt, n.NotificationId, a.AttemptNumber;`
    }
  ];
  const q=s=>'['+s.replace(/]/g,']]')+']';
  const full=t=>q(t.schema)+'.'+q(t.name);
  const list=a=>a.map(q).join(', ');
  function tableDDL(t){
    const parts=t.columns.map(col=>'  '+q(col.name)+' '+col.type+(col.identity?' IDENTITY(1,1)':'')+(col.type==='rowversion'?' NOT NULL':col.nullable?' NULL':' NOT NULL')+(col.default!==undefined?' CONSTRAINT '+q(`DF_${t.name}_${col.name}`)+' DEFAULT ('+col.default+')':''));
    parts.push('  CONSTRAINT '+q(t.primaryKey.name)+' PRIMARY KEY ('+list(t.primaryKey.columns)+')');
    for(const key of t.uniqueKeys)parts.push('  CONSTRAINT '+q(key.name)+' UNIQUE ('+list(key.columns)+')');
    for(const check of t.checks)parts.push('  CONSTRAINT '+q(check.name)+' CHECK ('+check.expression+')');
    return `-- ${t.description}\nCREATE TABLE ${full(t)} (\n${parts.join(',\n')}\n);`;
  }
  function ddl(){
    const lines = [
      '-- Revised Bridgeway website schema. SQL Server 2025, compatibility level 170.',
      '-- Run the entire script in a new, empty user database.',
      'SET ANSI_NULLS ON;\nSET QUOTED_IDENTIFIER ON;\nSET ANSI_PADDING ON;\nSET ANSI_WARNINGS ON;\nSET ARITHABORT ON;\nSET CONCAT_NULL_YIELDS_NULL ON;\nSET NUMERIC_ROUNDABORT OFF;\nSET XACT_ABORT ON;',
      "IF DB_ID() <= 4 OR DB_NAME() = N'Bridgeway' OR EXISTS (SELECT 1 FROM sys.tables WHERE is_ms_shipped = 0)\n    THROW 51000, 'Select a new empty user database other than Bridgeway.', 1;",
      'BEGIN TRY\nBEGIN TRANSACTION;'
    ];
    for(const group of groups) lines.push(`IF SCHEMA_ID(N'${group.id}') IS NULL EXEC(N'CREATE SCHEMA ${q(group.id)} AUTHORIZATION [dbo]');`);
    for(const t of tables)lines.push(tableDDL(t));
    for(const t of tables)for(const fk of t.foreignKeys)lines.push(`ALTER TABLE ${full(t)} WITH CHECK ADD CONSTRAINT ${q(fk.name)} FOREIGN KEY (${list(fk.columns)}) REFERENCES ${full(find(fk.target))} (${list(fk.targetColumns)}) ON DELETE ${fk.onDelete} ON UPDATE ${fk.onUpdate};`);
    for(const t of tables)for(const ix of t.indexes)lines.push(`CREATE ${ix.unique?'UNIQUE ':''}INDEX ${q(ix.name)} ON ${full(t)} (${list(ix.columns)})${ix.filter?' WHERE '+ix.filter:''};`);
    lines.push('COMMIT TRANSACTION;\nEND TRY\nBEGIN CATCH\n    IF @@TRANCOUNT > 0 ROLLBACK TRANSACTION;\n    THROW;\nEND CATCH;');
    return lines.join('\n\n')+'\n';
  }
  const model={title:'Bridgeway database',version:'2.0.0',engine:'Microsoft SQL Server 2025',groups,tables,layout,rules,queries,tableDDL,ddl,find};
  if(typeof module!=='undefined'&&module.exports)module.exports=model;
  root.BridgewayDatabase=model;
})(typeof window!=='undefined'?window:globalThis);
