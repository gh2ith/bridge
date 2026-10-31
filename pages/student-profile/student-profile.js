(() => {
window.BridgewayMountStudentProfile = (root, {embedded=false}={}) => {
  if(root.dataset.profileMounted)return;
  root.dataset.profileMounted='true';
  const previewStudent = window.BridgewayStudent.current();
  function buildProfile() {
  const main=root;
  if(!embedded)window.BridgewayStudentChrome(main,'profile');
  root.classList.add('student-profile-studio');
  root.querySelector('.bw-page-header')?.remove();
  const layout=root.querySelector('.student-profile-layout');
  const identity=root.querySelector('.profile-identity'),academic=root.querySelector('[aria-labelledby="profileAcademicTitle"]'),personal=root.querySelector('.profile-personal'),cv=root.querySelector('.student-cv');
  const form=root.querySelector('#studentProfileForm'),footer=form.querySelector('.profile-form-footer');
  const grid=document.createElement('div');grid.className='profile-edit-grid';
  const edits=document.createElement('div');edits.className='profile-edit-main';
  edits.append(personal.querySelector('header'),form.querySelector('.profile-fields'),form.querySelector('.profile-bio'));
  const record=document.createElement('section');record.className='profile-academic-disclosure';record.setAttribute('aria-labelledby','profileAcademicHeading');
  const summary=document.createElement('header');const recordTitle=document.createElement('h2');recordTitle.id='profileAcademicHeading';recordTitle.textContent='Academic record';summary.append(recordTitle);
  const recordNote=document.createElement('span');recordNote.textContent='Provided by your university · Read-only';summary.append(recordNote);
  record.append(summary,academic.querySelector('dl'));grid.append(edits,cv);edits.append(footer);form.replaceChildren(grid);personal.replaceChildren(form);layout.replaceChildren(identity,personal,record);
  const heading=document.createElement('header');heading.className='profile-page-heading';const title=document.createElement('h1');title.textContent='Your profile';const text=document.createElement('p');text.textContent='Keep your details ready for your next application.';heading.append(title,text);layout.before(heading);
  const identityTitle=identity.querySelector('h2');identityTitle.insertAdjacentElement('afterend',identity.querySelector('.profile-verified'));
  root.querySelector('.profile-bio p').textContent='What interests you, what you can do, and what you want to learn.';
  root.querySelector('.profile-preview-label').remove();
  root.querySelector('#studentCvTitle + p').textContent='Choose the CV you want to use when applying.';
  root.querySelector('label[for="studentCvFile"]').textContent='Select your CV';
  cv.querySelector('.profile-text-link')?.remove();
  root.querySelector('.profile-form-footer button').textContent='Save profile changes';
  function route(){if(location.hash==='#student-cv')cv.scrollIntoView({block:'center'});}route();window.addEventListener('hashchange',route);
}
if (previewStudent.id === 'lina') {
  root.querySelector('.profile-avatar').textContent = 'LH';
  root.querySelector('.profile-identity-copy h2').textContent = previewStudent.name;
  root.querySelector('.profile-identity-copy span').textContent = 'Student ID ' + previewStudent.studentId;
  root.querySelector('.profile-verified').textContent = 'Student';
  root.querySelector('#profileFullName').value = previewStudent.name;
  root.querySelector('#profilePhone').value = '';
  root.querySelector('#profileEmail').value = 'lina@bau.edu.jo';
  root.querySelector('#profileBio').value = '';
  root.querySelector('#profileGpa').textContent = previewStudent.gpa + ' / 4.00';
  root.querySelector('.profile-academic > div:last-child dd').textContent = 'Not assigned · After company acceptance';
}
root.querySelector('#studentProfileForm')?.addEventListener('submit', function(e) {
      e.preventDefault();
      const values={name:root.querySelector('#profileFullName').value.trim(),phone:root.querySelector('#profilePhone').value.trim(),bio:root.querySelector('#profileBio').value.trim()};
      if(!values.name){root.querySelector('#profileFullName').reportValidity();return;}
      try{window.BridgewayLocal.saveProfile('student:'+previewStudent.id,values);}catch(error){showPortalToast(error.message);return;}
      root.querySelector('.profile-identity h2').textContent=values.name;
      window.BridgewayLocal.saved(e.currentTarget);
      document.querySelector('.studio-account-name').textContent=values.name;
      showPortalToast('Profile saved in this browser.');
      const action=e.currentTarget.querySelector('button[type=submit]');
      if(action)window.BridgewayKinetic?.buttonState(action,'Profile saved');
    });
root.querySelector('#studentProfileForm')?.addEventListener('input',function(){
  const action=this.querySelector('button[type=submit]');
  if(action?.textContent==='Profile saved')window.BridgewayKinetic?.buttonState(action,'Save profile changes');
});

// Old bookmarks now open the dashboard Applications view.
function redirectLegacyApplications() {
  if (location.hash === '#my-applications') location.replace(window.BridgewayStudent.url('../student-dashboard/student-dashboard.html#tab-applications'));
}
redirectLegacyApplications();
window.addEventListener('hashchange', redirectLegacyApplications);


// Select a local file for the frontend preview; no file bytes leave the browser.
buildProfile();
const savedProfile=window.BridgewayLocal.profile('student:'+previewStudent.id);
root.querySelector('#profileFullName').value=savedProfile.name||previewStudent.name;
root.querySelector('#profilePhone').value=savedProfile.phone??previewStudent.phone??(previewStudent.id==='ghaith'?'+962 7 9000 1234':'');
root.querySelector('#profileBio').value=savedProfile.bio??(previewStudent.id==='ghaith'?root.querySelector('#profileBio').value:'');
root.querySelector('#profileEmail').value=previewStudent.email||(previewStudent.id==='ghaith'?'student@bau.edu.jo':'lina@bau.edu.jo');
root.querySelector('.profile-identity h2').textContent=savedProfile.name||previewStudent.name;
root.querySelector('.profile-avatar').textContent=(savedProfile.name||previewStudent.name).split(' ').map(p=>p[0]).slice(0,2).join('');
root.querySelector('.profile-identity-meta > span').textContent='Student ID '+previewStudent.studentId;
root.querySelector('#profileDept').textContent=previewStudent.department||'Software Engineering';
root.querySelector('#profileGpa').textContent=previewStudent.gpa+' / 4.00';
window.BridgewayJourney?.mountSkills(root,previewStudent.id);
const skillsSection=root.querySelector('.journey-skills');
if(skillsSection){skillsSection.after(root.querySelector('.profile-form-footer'));skillsSection.querySelector('button.is-primary')?.classList.remove('is-primary');skillsSection.querySelector('h2').id='profileSkillsTitle';skillsSection.setAttribute('aria-labelledby','profileSkillsTitle');}
root.querySelector('.profile-form-footer small').textContent='Changes are saved in this browser.';
const security=document.createElement('section');security.className='profile-security-section';
window.BridgewayAccountSecurity(security);root.querySelector('.student-profile-layout').append(security);
const cvInput = root.querySelector('#studentCvFile');
const cvStatus = root.querySelector('#studentCvStatus');
const removeCv = root.querySelector('#removeStudentCv');
function showCv(file) {
  cvStatus.textContent = file ? `${file.name} · ${Math.ceil(file.size / 1024)} KB · Selected locally; not uploaded or analyzed.` : 'No CV selected.';
  removeCv.hidden = !file;
  window.BridgewayKinetic?.cvState(root.querySelector('.cv-upload-area'),file);
}
showCv(window.BridgewayCV.read());
function selectCv(file) {
  if (!file) return;
  if (!/\.(pdf|docx)$/i.test(file.name) || !file.size || file.size > 5 * 1024 * 1024) {
    cvInput.value = '';
    cvStatus.textContent = 'Choose a non-empty PDF or DOCX file up to 5 MB. Your previous selection is unchanged.';
    return;
  }
  const stored = window.BridgewayCV.set(file);
  showCv(file);
  if (!stored) cvStatus.textContent += ' Browser storage is unavailable; the selection cannot carry over to listings.';
}
cvInput.addEventListener('change', () => selectCv(cvInput.files[0]));
window.BridgewayKinetic?.cvDrop(root.querySelector('.cv-upload-area'),cvInput,selectCv);
removeCv.addEventListener('click', () => {
  if (!window.BridgewayCV.set(null)) {
    cvStatus.textContent = 'Could not clear the CV selection. Browser storage is unavailable.';
    return;
  }
  cvInput.value = '';
  showCv(null);
});
// End local CV selection.


};
document.addEventListener('DOMContentLoaded',()=>{
  if(document.documentElement.dataset.page!=='student-profile')return;
  location.replace(window.BridgewayStudent.url(`../student-dashboard/student-dashboard.html#${location.hash==='#student-cv'?'tab-profile-cv':'tab-profile'}`));
});
})();
