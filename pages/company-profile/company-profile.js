document.addEventListener('DOMContentLoaded',()=>{
  const form=document.getElementById('companyProfileForm');if(!form)return;
  const organization=window.BridgewayPartners.organizations.find(o=>o.id==='company-1');
  const fields={name:'companyNameInput',location:'companyLocationInput',industry:'companyIndustryInput',website:'companyWebsiteInput',about:'companyAboutInput'};
  const profile=window.BridgewayLocal.profile('company:company-1');
  Object.entries(fields).forEach(([key,id])=>{const value=profile[key]??organization[key];if(value!=null)document.getElementById(id).value=value;});
  form.addEventListener('submit',event=>{
    event.preventDefault();const values=Object.fromEntries(Object.entries(fields).map(([key,id])=>[key,document.getElementById(id).value.trim()]));
    try{window.BridgewayLocal.saveProfile('company:company-1',values);Object.assign(organization,values);window.BridgewayLocal.persistModel();form.dataset.committed='true';window.showPortalToast('Company profile saved in this browser.');}catch(error){window.showPortalToast(error.message);}
  });
});
