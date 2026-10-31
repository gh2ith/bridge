/* Shared, always-visible security form. Credential values never leave this form. */
(()=>{
 'use strict';
 window.BridgewayAccountSecurity=(section)=>{
  const prefix='security-'+document.body.dataset.portalRole;
  section.classList.add('account-security');
  section.replaceChildren();
  const heading=document.createElement('header');heading.className='account-security-heading';
  const title=document.createElement('h2');title.id=prefix+'-title';title.textContent='Account security';
  const intro=document.createElement('p');intro.textContent='Change password';heading.append(title,intro);section.setAttribute('aria-labelledby',title.id);
  const form=document.createElement('form');form.className='account-security-form';
  const note=document.createElement('p');note.id=prefix+'-note';note.className='account-security-note';note.textContent='Authentication is not connected. Passwords are not saved, and checking this form does not change your credentials.';form.setAttribute('aria-describedby',note.id);
  const fields=document.createElement('div');fields.className='account-security-fields';
  const inputs=['Current password','New password','Confirm new password'].map((labelText,index)=>{
   const group=document.createElement('div');group.className='account-security-field';
   const label=document.createElement('label');label.htmlFor=prefix+'-'+index;label.textContent=labelText;
   const wrap=document.createElement('div');wrap.className='account-security-input';
   const input=document.createElement('input');input.id=label.htmlFor;input.type='password';input.className='bw-input';input.required=true;input.dataset.credential='true';input.autocomplete=index?'new-password':'current-password';if(index)input.minLength=6;
   const toggle=document.createElement('button');toggle.type='button';toggle.textContent='Show';toggle.setAttribute('aria-controls',input.id);toggle.setAttribute('aria-label','Show '+labelText.toLowerCase());toggle.setAttribute('aria-pressed','false');
   toggle.addEventListener('click',()=>{const reveal=input.type==='password';input.type=reveal?'text':'password';toggle.textContent=reveal?'Hide':'Show';toggle.setAttribute('aria-pressed',String(reveal));toggle.setAttribute('aria-label',(reveal?'Hide ':'Show ')+labelText.toLowerCase());});
   wrap.append(input,toggle);group.append(label,wrap);
   if(index===1){const help=document.createElement('small');help.id=input.id+'-help';help.textContent='Use at least 6 characters and a different password from your current one.';input.setAttribute('aria-describedby',help.id);group.append(help);}
   fields.append(group);return input;
  });
  const status=document.createElement('p');status.className='account-security-status';status.setAttribute('role','status');
  const submit=document.createElement('button');submit.type='submit';submit.className='cycle-button';submit.textContent='Check password requirements';
  const validate=()=>{inputs[1].setCustomValidity(inputs[1].value&&inputs[1].value===inputs[0].value?'Choose a different password from your current one.':'');inputs[2].setCustomValidity(inputs[2].value&&inputs[2].value!==inputs[1].value?'Passwords do not match. Re-enter your new password.':'');};
  form.addEventListener('input',()=>{status.textContent='';validate();});form.addEventListener('submit',event=>{event.preventDefault();validate();if(!form.reportValidity())return;status.textContent='Requirements checked. No password was changed because authentication is not connected.';});
  form.append(note,fields,status,submit);section.append(heading,form);return section;
 };
})();
