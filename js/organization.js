/* EsportsHub v0.4.7 — Admin profiles and organization styling. LOCAL DEMO ONLY. */
(() => {
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const store=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const ADMINS='eh_admin_profiles_v47', SELECTED='eh_selected_admin_v47', BRAND='eh_org_brand_v47';
  let admins=read(ADMINS,[{id:'admin-primary',name:'Organization Administrator',email:'',owner:true}]);
  if(!Array.isArray(admins)||!admins.length)admins=[{id:'admin-primary',name:'Organization Administrator',email:'',owner:true}];
  let selected=read(SELECTED,admins[0].id);
  const defaults={name:'Florida Poly Esports',short:'FP',accent:'#6326a6',theme:'system',description:'Esports management workspace'};
  let brand={...defaults,...read(BRAND,{})};if(brand.accent==='#3265aa'){brand.accent=defaults.accent;store(BRAND,brand);}
  const colors=['#6326a6','#7844bd','#4c207c','#287b74','#7855b8','#b65d42','#aa4777','#424f68'];
  function validColor(c){return /^#[0-9a-fA-F]{6}$/.test(c)}
  function applyBrand(){
    const color=validColor(brand.accent)?brand.accent:defaults.accent;
    let style=document.getElementById('ehBrandStyle');if(!style){style=document.createElement('style');style.id='ehBrandStyle';document.head.append(style)}
    style.textContent=`:root{--accent:${color};--accent-bg:color-mix(in srgb, ${color} 10%, white)}:root[data-theme="dark"]{--accent:${color};--accent-bg:color-mix(in srgb, ${color} 22%, #1a212b)}.brand-mark{background:${color}!important}.btn-primary{background:${color}!important;border-color:${color}!important}.nav-link.active{color:${color}!important}`;
    document.querySelectorAll('.org-name strong').forEach(e=>e.textContent=brand.name);
    document.querySelectorAll('.org-avatar').forEach(e=>e.textContent=brand.short);
    if(brand.theme!== 'personal'){localStorage.setItem('eh_theme',brand.theme);applyTheme(brand.theme)}
  }
  function adminPicker(){
    const el=document.getElementById('demoAdminSelect');if(!el)return;
    if(!admins.some(a=>a.id===selected))selected=admins[0].id;
    el.hidden=demoRole!=='admin';
    el.innerHTML=admins.map(a=>`<option value="${esc(a.id)}" ${a.id===selected?'selected':''}>${esc(a.name)}</option>`).join('');
    if(demoRole==='admin'){
      const footer=document.querySelector('.sidebar-footer strong');if(footer)footer.textContent=admins.find(a=>a.id===selected)?.name||'Admin';
      const caption=document.getElementById('roleCaption');if(caption)caption.textContent='Admin: '+(admins.find(a=>a.id===selected)?.name||'Demo');
    }
  }
  function editor(){
    const p=admins.find(a=>a.id===selected)||admins[0];
    return `<div class="admin-setting-grid"><section class="card form-card"><h2 class="form-section-title">Organization appearance</h2><p class="mini-note">These are workspace-wide demonstration defaults. Only Admin mode can edit them.</p>
    <form id="brandForm" class="form-stack"><div class="field"><label>Organization name</label><input class="input" name="name" maxlength="70" required value="${esc(brand.name)}"></div>
    <div class="form-grid"><div class="field"><label>Short name / initials</label><input class="input" name="short" maxlength="5" required value="${esc(brand.short)}"></div><div class="field"><label>Default appearance</label><select class="select" name="theme">${[['system','Match device'],['light','Light'],['dark','Dark'],['personal','Allow personal choice']].map(([v,l])=>`<option value="${v}" ${brand.theme===v?'selected':''}>${l}</option>`).join('')}</select></div></div>
    <div class="field"><label>Accent color</label><div class="swatches">${colors.map(c=>`<button type="button" class="swatch" data-brand-color="${c}" style="--swatch:${c}" title="${c}" aria-label="Use ${c}"></button>`).join('')}</div><input aria-label="Accent color" class="input" type="color" name="accent" value="${validColor(brand.accent)?brand.accent:defaults.accent}" style="height:44px;padding:4px;max-width:145px"></div>
    <div class="field"><label>Organization description</label><textarea class="textarea" name="description" rows="3" maxlength="250">${esc(brand.description)}</textarea></div><div class="form-actions"><button class="btn" type="button" id="resetBrand">Reset defaults</button><button class="btn btn-primary" type="submit">Save appearance</button></div></form></section>
    <section class="card form-card"><h2 class="form-section-title">Administrators · ${admins.length}</h2><p class="mini-note">All admin profiles have organization-wide demo permissions. Select a profile in the top bar to preview it.</p>
    <div class="admin-list">${admins.map(a=>`<div class="admin-entry"><div><strong>${esc(a.name)}</strong>${a.owner?'<span class="roster-captain">Primary</span>':''}<p class="mini-note">${esc(a.email||'No email specified')} · Demo administrator</p></div><div class="admin-entry-actions"><button class="btn" data-admin-switch="${esc(a.id)}">Select</button>${a.owner?'':`<button class="btn" data-admin-remove="${esc(a.id)}">Remove</button>`}</div></div>`).join('')}</div>
    <form class="form-stack" id="adminAddForm" style="margin-top:20px"><h3 class="form-section-title">Add administrator</h3><div class="field"><label>Display name</label><input name="name" class="input" maxlength="70" required placeholder="e.g. Esports President"></div><div class="field"><label>Email (optional, for later account setup)</label><input type="email" name="email" class="input" maxlength="120" placeholder="officer@university.edu"></div><button class="btn btn-primary" type="submit">Add demo administrator</button></form><p class="mini-note" style="margin-top:15px">Adding an administrator here does not create a login or invite anyone. Server-side role assignment and authenticated invitations will be needed for real accounts.</p></section></div>`;
  }
  const previousRender=render;
  render=function(){previousRender();adminPicker();applyBrand();const route=location.hash.slice(1)||'dashboard';if(route==='settings'&&demoRole==='admin'){
    document.getElementById('pageContent').insertAdjacentHTML('beforeend',`<div class="admin-settings-heading"><h2>Organization administration</h2><p>Branding and access management for EsportsHub</p></div>${editor()}`);
  } else if(route==='settings'){
    document.getElementById('pageContent').insertAdjacentHTML('beforeend','<div class="banner">Organization branding and administrator management are available only in Admin mode.</div>');
  }
  if(route==='profile'&&demoRole==='admin'){
    const el=document.querySelector('.page-container .card');if(el){el.insertAdjacentHTML('beforeend',`<div class="mini-note" style="padding:15px">Current administrator: <strong>${esc(admins.find(a=>a.id===selected)?.name||'Organization Administrator')}</strong></div>`)}
  }
  };
  document.addEventListener('change',e=>{if(e.target.id==='demoAdminSelect'&&demoRole==='admin'){selected=e.target.value;store(SELECTED,selected);render()}});
  document.addEventListener('click',e=>{
    const color=e.target.closest('[data-brand-color]');if(color&&demoRole==='admin'){const input=document.querySelector('#brandForm [name="accent"]');if(input)input.value=color.dataset.brandColor;}
    const pick=e.target.closest('[data-admin-switch]');if(pick&&demoRole==='admin'){selected=pick.dataset.adminSwitch;store(SELECTED,selected);render();toast('Admin preview selected.');}
    const remove=e.target.closest('[data-admin-remove]');if(remove&&demoRole==='admin'){const a=admins.find(x=>x.id===remove.dataset.adminRemove);if(!a||a.owner||!confirm(`Remove demo admin ${a.name}?`))return;admins=admins.filter(x=>x.id!==a.id);if(selected===a.id)selected=admins[0].id;store(ADMINS,admins);store(SELECTED,selected);render();toast('Demo administrator removed.');}
    if(e.target.id==='resetBrand'&&demoRole==='admin'){brand={...defaults};store(BRAND,brand);render();toast('Default branding restored.');}
  });
  document.addEventListener('submit',e=>{
    if(!['brandForm','adminAddForm'].includes(e.target.id))return;
    e.preventDefault();if(demoRole!=='admin')return;
    const f=new FormData(e.target);
    if(e.target.id==='brandForm'){
      const name=String(f.get('name')||'').trim(),short=String(f.get('short')||'').trim(),accent=String(f.get('accent')||''),theme=String(f.get('theme')||'system');
      if(!name||!short||!validColor(accent)||!['system','light','dark','personal'].includes(theme))return;
      brand={name,short,accent,theme,description:String(f.get('description')||'').trim()};store(BRAND,brand);render();toast('Organization branding saved locally.');
    }else{
      const name=String(f.get('name')||'').trim(),email=String(f.get('email')||'').trim();if(!name)return;
      if(email&&admins.some(a=>a.email&&a.email.toLowerCase()===email.toLowerCase())){toast('An admin already uses that email.');return;}
      const a={id:'admin-'+crypto.randomUUID(),name,email,owner:false};admins.push(a);selected=a.id;store(ADMINS,admins);store(SELECTED,selected);render();toast('New demo admin added.');
    }
  });
  window.addEventListener('storage',e=>{if([ADMINS,BRAND,SELECTED].includes(e.key)){admins=read(ADMINS,admins);brand={...defaults,...read(BRAND,{})};selected=read(SELECTED,selected);render()}});
  render();
})();
