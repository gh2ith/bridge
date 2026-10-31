// Password values stay in the form only; never persist them or claim a credential change.
(()=>{
 const form=document.getElementById('passwordChangeForm');if(!form)return;
 const current=form.querySelector('#currentPasswordInput'),next=form.querySelector('#newPasswordInput'),confirm=form.querySelector('#confirmPasswordInput'),status=form.querySelector('#passwordChangeStatus');
 for(const input of [current,next,confirm]){
  input.dataset.credential='true';
  const wrap=document.createElement('div');wrap.className='password-input-wrap';input.before(wrap);wrap.append(input);
  const reveal=document.createElement('button');reveal.type='button';reveal.className='password-reveal';reveal.textContent='Show';reveal.setAttribute('aria-label','Show '+input.labels[0].textContent.replace('*','').trim().toLowerCase());reveal.setAttribute('aria-controls',input.id);reveal.setAttribute('aria-pressed','false');
  reveal.addEventListener('click',()=>{const show=input.type==='password';input.type=show?'text':'password';reveal.textContent=show?'Hide':'Show';reveal.setAttribute('aria-pressed',String(show));reveal.setAttribute('aria-label',(show?'Hide ':'Show ')+input.labels[0].textContent.replace('*','').trim().toLowerCase());});wrap.append(reveal);
 }
 const validate=()=>{next.setCustomValidity(next.value&&next.value===current.value?'Choose a different password from your current one.':'');confirm.setCustomValidity(confirm.value&&confirm.value!==next.value?'Passwords do not match. Re-enter your new password.':'');};
 form.addEventListener('input',()=>{status.textContent='';validate();});
 form.addEventListener('submit',event=>{event.preventDefault();validate();if(!form.reportValidity())return;status.textContent='Requirements checked. No password was changed: authentication is not connected.';});
 if(location.hash==='#passwordChangeForm')requestAnimationFrame(()=>{form.scrollIntoView({block:'center'});current.focus({preventScroll:true});});
})();
document.addEventListener('DOMContentLoaded',()=>{
  const role=document.body.dataset.portalRole,key='bridgeway:notification-preferences:'+role;
  const inputs=[...document.querySelectorAll('input[type=checkbox]')],saved=window.BridgewayLocal.read(key,[]);
  inputs.forEach((input,index)=>{if(typeof saved[index]==='boolean')input.checked=saved[index];input.addEventListener('change',()=>{try{localStorage.setItem(key,JSON.stringify(inputs.map(n=>n.checked)));window.showPortalToast('Preferences saved in this browser.');}catch{window.showPortalToast('Browser storage is unavailable. Preferences were not saved.');}});});
});
