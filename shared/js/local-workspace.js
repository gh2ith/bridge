/* Temporary browser-local persistence. Replace this adapter when the backend is connected. */
(() => {
  'use strict';
  const modelKey='bridgeway:partner-model:v1',profileKey='bridgeway:profiles:v1';
  const clean=value=>Array.isArray(value)?value.map(clean):value&&typeof value==='object'?Object.fromEntries(Object.entries(value).filter(([key])=>!/password|credential|secret|token/i.test(key)).map(([key,v])=>[key,clean(v)])):value;
  // Import only Bridgeway records, never overwrite newer local records or revive removed keys.
  try{
    const key='bridgeway:local-migration:v1',migrated=new Set(JSON.parse(localStorage.getItem(key)||'[]'));
    const names=Array.from({length:sessionStorage.length},(_,i)=>sessionStorage.key(i));
    for(const name of names){
      if(!name?.startsWith('bridgeway:')||/password|credential|secret|token/i.test(name))continue;
      if(!migrated.has(name)){
        if(localStorage.getItem(name)===null){let value=sessionStorage.getItem(name);try{value=JSON.stringify(clean(JSON.parse(value)));}catch{}localStorage.setItem(name,value);}
        migrated.add(name);
      }
      sessionStorage.removeItem(name);
    }
    localStorage.setItem(key,JSON.stringify([...migrated]));
  }catch{/* Normal storage writes report failures at their action. */}
  let stale=false,timer,refreshButton,modelBaseline;
  const hasDraft=()=>[...document.querySelectorAll('[data-local-dirty]')].some(n=>!n.disabled&&n.closest('form')?.dataset.committed!=='true');
  function read(key,fallback){try{return JSON.parse(localStorage.getItem(key))??fallback;}catch{return fallback;}}
  function notify(){
    if(!document.body)return;
    if(!refreshButton){refreshButton=document.createElement('button');refreshButton.type='button';refreshButton.textContent='Load latest workspace changes';refreshButton.className='cycle-button is-primary';refreshButton.style.cssText='position:fixed;bottom:20px;right:20px;z-index:2000;max-width:calc(100vw - 40px);box-shadow:0 4px 20px #12243d30';refreshButton.addEventListener('click',()=>location.reload());document.body.append(refreshButton);}
    refreshButton.title='Another tab changed this workspace. Reload before making more changes.';
  }
  function fresh(){if(stale){notify();window.showPortalToast?.('Another tab updated the workspace. Load the latest changes before saving.');return false;}return true;}
  function restoreModel(model){const saved=read(modelKey,null);if(!saved)return false;for(const key of ['organizations','links','students'])if(Array.isArray(saved[key]))model[key]=saved[key];return true;}
  function persistModel(){
    const model=window.BridgewayPartners;if(!model||stale)return;
    const value=JSON.stringify(clean({organizations:model.organizations,links:model.links,students:model.students}));
    if(value===modelBaseline)return;
    if(localStorage.getItem(modelKey)!==value)localStorage.setItem(modelKey,value);
    modelBaseline=value;
  }
  function saved(form){if(form?.matches?.('form'))form.querySelectorAll('[data-local-dirty]').forEach(n=>n.removeAttribute('data-local-dirty'));persistModel();}
  function profile(id){return read(profileKey,{})[id]||{};}
  function saveProfile(id,values){if(!fresh())throw new Error('Load the latest workspace changes first.');const profiles=read(profileKey,{});profiles[id]=clean(values);localStorage.setItem(profileKey,JSON.stringify(profiles));saved();}
  const watched=key=>key===null||key===modelKey||key===profileKey||/^(bridgeway:workspace-cycle:|bridgeway:managed-accounts:|bridgeway:academic-supervisor|bridgeway:college-student-directory:|bridgeway:student-cv)/.test(key||'');
  function refresh(){if(!stale||document.hidden)return;if(hasDraft()||document.querySelector('dialog[open],.bw-modal.is-active')){notify();return;}location.reload();}
  window.addEventListener('storage',event=>{if(event.storageArea!==localStorage||!watched(event.key)||event.key!==null&&event.newValue===event.oldValue)return;stale=true;clearTimeout(timer);timer=setTimeout(refresh,100);});
  window.addEventListener('focus',refresh);document.addEventListener('visibilitychange',refresh);
  document.addEventListener('input',event=>{if(event.target.matches('input,textarea,select'))event.target.dataset.localDirty='true';});
  document.addEventListener('DOMContentLoaded',()=>queueMicrotask(()=>{const model=window.BridgewayPartners;if(model)modelBaseline=JSON.stringify(clean({organizations:model.organizations,links:model.links,students:model.students}));}));
  document.addEventListener('change',()=>{if(!stale)setTimeout(()=>{try{persistModel();}catch{window.showPortalToast?.('Browser storage is full. Changes could not be saved.');}},0);});
  document.addEventListener('click',event=>{if(stale&&event.target.closest('button,input[type=submit]')&&event.target!==refreshButton){event.preventDefault();event.stopImmediatePropagation();notify();return;}setTimeout(()=>{try{persistModel();}catch{window.showPortalToast?.('Browser storage is full. Changes could not be saved.');}},0);},true);
  document.addEventListener('submit',event=>{if(!fresh()){event.preventDefault();event.stopImmediatePropagation();}},true);
  document.addEventListener('bridgeway:cycle-change',event=>{if(event.detail?.stored!==false)saved();});
  window.addEventListener('pagehide',()=>{try{persistModel();}catch{}});
  window.BridgewayLocal={read,restoreModel,persistModel,profile,saveProfile,fresh,saved,clean};
})();
