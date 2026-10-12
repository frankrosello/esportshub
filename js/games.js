/* EsportsHub v0.5: game catalog and invitation previews. LOCAL DEMO, not access control. */
(() => {
  const GAME_KEY='eh_games_v48', MANAGERS_KEY='eh_game_managers_v48', MANAGER_KEY='eh_selected_manager_v48', INVITES_KEY='eh_staff_invites_v50';
  const read=(key,fallback)=>{try{return JSON.parse(localStorage.getItem(key))??fallback}catch{return fallback}};
  const save=(key,value)=>localStorage.setItem(key,JSON.stringify(value));
  const initial=[{id:'overwatch',name:'Overwatch',enabled:true}];
  let games=read(GAME_KEY,initial);
  if(!Array.isArray(games)||!games.length)games=initial;
  let managers=read(MANAGERS_KEY,[{id:'gm-primary',name:'Overwatch Game Manager',game:'Overwatch'}]);
  if(!Array.isArray(managers)||!managers.length)managers=[{id:'gm-primary',name:'Overwatch Game Manager',game:'Overwatch'}];
  let selected=read(MANAGER_KEY,managers[0].id);
  let invites=read(INVITES_KEY,[]);
  if(!Array.isArray(invites))invites=[];
  const findGame=name=>games.find(g=>g.name.toLowerCase()===String(name).toLowerCase());
  function sync(){
    if(!managers.some(m=>m.id===selected))selected=managers[0].id;
    if(demoRole==='game_manager')demoGame=managers.find(m=>m.id===selected)?.game||'Overwatch';
    save('eh_game_v48',demoGame);save(GAME_KEY,games);save(MANAGERS_KEY,managers);save(MANAGER_KEY,selected);save(INVITES_KEY,invites);
  }
  sync();
  const opt=(v,selectedValue)=>`<option value="${esc(v)}" ${v===selectedValue?'selected':''}>${esc(v)}</option>`;
  const gameOptions=selectedName=>games.filter(g=>g.enabled).map(g=>opt(g.name,selectedName)).join('');
  const inviteUrl=code=>location.href.split('#')[0]+'#staff-invite/'+encodeURIComponent(code);
  const staffPanel=()=>`<section class="card form-card" style="margin-top:22px"><h2 class="form-section-title">Staff invitation links</h2><p class="mini-note">Create a preview link for an Administrator or a Game Manager. These links do not grant real permissions or create accounts; they only open a local registration mockup.</p><form id="staffInviteForm" class="form-grid" style="margin-top:16px"><div class="field"><label>Invite role</label><select class="select" name="role"><option value="admin">Administrator</option><option value="game_manager">Game Manager</option></select></div><div class="field"><label>Assigned game (Game Manager only)</label><select class="select" name="game">${gameOptions(games[0]?.name)}</select></div><div class="field" style="align-self:end"><button class="btn btn-primary" type="submit">Generate demo link</button></div></form><div class="admin-list" style="margin-top:18px">${invites.map(i=>`<div class="admin-entry"><div style="min-width:0"><strong>${i.role==='admin'?'Administrator':'Game Manager'+(i.game?' · '+esc(i.game):'')}</strong><p class="mini-note">${i.revoked?'Revoked':'Demo link · no real account access'}</p><input class="input" readonly aria-label="Invitation preview link" value="${esc(inviteUrl(i.code))}" style="width:100%;margin-top:8px"></div><div class="admin-entry-actions">${!i.revoked?`<button class="btn" data-copy-staff="${esc(i.code)}">Copy</button><button class="btn" data-revoke-staff="${esc(i.code)}">Revoke</button>`:''}</div></div>`).join('')||'<p class="mini-note">No staff invitation previews created.</p>'}</div></section>`;
  const gamesPanel=()=>`<section class="card form-card" style="margin-top:22px"><h2 class="form-section-title">Games & Game Managers</h2><p class="mini-note">Administrators can create games and assign Game Managers. Overwatch is already configured.</p><div class="admin-list">${games.map(g=>`<div class="admin-entry"><div><strong>${esc(g.name)}</strong><p class="mini-note">${teams.filter(t=>String(t.game||'').toLowerCase().replace(/\s*2$/,'')===g.name.toLowerCase()).length} teams · ${g.enabled?'Enabled':'Disabled'}</p></div><span class="game-pill">${g.enabled?'Active':'Inactive'}</span></div>`).join('')}</div><form id="createGameForm" class="form-grid" style="margin-top:20px"><div class="field"><label>New game name</label><input class="input" name="name" maxlength="70" required placeholder="e.g. Valorant"></div><div class="field" style="align-self:end"><button class="btn btn-primary">Create game</button></div></form><h3 class="form-section-title" style="margin-top:28px">Game Managers</h3><div class="admin-list">${managers.map(m=>`<div class="admin-entry"><div><strong>${esc(m.name)}</strong><p class="mini-note">${esc(m.game)} · Demo Game Manager</p></div><button class="btn" data-manager-remove="${esc(m.id)}" ${managers.length===1?'disabled':''}>Remove</button></div>`).join('')}</div><form class="form-grid" id="gameManagerForm" style="margin-top:16px"><div class="field"><label>Manager display name</label><input class="input" name="name" maxlength="70" required placeholder="Manager name"></div><div class="field"><label>Assigned game</label><select class="select" name="game">${gameOptions(games[0]?.name)}</select></div><div class="field" style="align-self:end"><button class="btn btn-primary">Add demo manager</button></div></form></section>`;
  function invitePage(code){
    const entry=invites.find(i=>i.code===code&&!i.revoked);
    const main=document.getElementById('pageContent');
    if(!entry){main.innerHTML=title('Invitation','Invitation unavailable','This preview invitation does not exist or has been revoked.');return;}
    main.innerHTML=title('Staff invitation','Staff account preview','Demo only: this form does not create a shared account.')+`<section class="card form-card" style="max-width:620px"><h2 class="form-section-title">${entry.role==='admin'?'Administrator':'Game Manager'} invitation</h2><p class="mini-note">${entry.role==='game_manager'?'Game: '+esc(entry.game)+'. ':''}You can preview entering profile information, but no identity verification or role assignment takes place. Do not enter passwords or sensitive details.</p><form id="staffInvitePreviewForm"><div class="field"><label>Display name</label><input class="input" name="name" required maxlength="70" placeholder="Your name"></div><div class="field" style="margin-top:12px"><label>Email (optional)</label><input class="input" type="email" name="email" maxlength="120" placeholder="you@example.edu"></div><div class="form-actions"><button class="btn btn-primary">Preview registration</button></div></form><p class="mini-note" style="margin-top:16px">For working invitations on other devices, we must implement verified sign-in and server-side invitations in Cloudflare Workers and Turso.</p></section>`;
  }
  const oldRender=render;
  render=function(){sync();oldRender();const route=location.hash.slice(1)||'dashboard';
    const picker=document.getElementById('demoManagerSelect');
    if(picker){picker.hidden=demoRole!=='game_manager';picker.innerHTML=managers.map(m=>opt(m.id,selected).replace('>'+esc(m.id)+'</option>','>'+esc(m.name)+' · '+esc(m.game)+'</option>')).join('')}
    if(route.startsWith('staff-invite/')){invitePage(decodeURIComponent(route.slice(13)));return;}
    if(demoRole==='game_manager'){
      const manager=managers.find(m=>m.id===selected);const cap=document.getElementById('roleCaption');if(cap)cap.textContent=`Game Manager · ${demoGame} · local demo`;
      if(route==='dashboard'){const mine=myTeams(),names=new Set(mine.map(t=>t.name)),relevant=reports.filter(r=>names.has(r.team));document.getElementById('pageContent').innerHTML=title('Game management',`${esc(demoGame)} program`,'Manage every team in your assigned game.')+`<div class="stats-grid">${stat('Teams',mine.length,'Assigned-game teams','users')}${stat('Reports',relevant.length,'Team reports','file')}${stat('Players',mine.reduce((n,t)=>n+roster(t.id).length,0),'Roster entries','users')}${stat('Events',events.filter(e=>mine.some(t=>t.id===e.teamId)).length,'Scheduled activities','calendar')}</div>`+card('Managed teams',esc(demoGame),mine.map(t=>`<div class="overview-row"><div><strong>${esc(t.name)}</strong><small>${roster(t.id).length} roster entries</small></div><button class="btn" data-page="teams">View team</button></div>`).join('')||'<p class="mini-note">No teams in this game yet.</p>');}
      if(route==='profile'){document.getElementById('pageContent').innerHTML=title('Account','Game Manager','Local demo account')+card('Assigned game',esc(demoGame),`<div style="padding:20px"><strong>${esc(manager?.name||'Game Manager')}</strong><p>${esc(demoGame)}</p></div>`);}
      if(route==='reports'){const table=document.getElementById('reportsTable');if(table)table.innerHTML=reportRows(reports.filter(r=>myTeams().some(t=>t.name===r.team)));}
      if(route==='matches'){document.getElementById('pageContent').innerHTML=title('Game management','Match results',esc(demoGame))+card('Matches','Assigned game',reportRows(reports.filter(r=>myTeams().some(t=>t.name===r.team)&&r.type!=='practice')));}
    }
    if(demoRole==='admin'&&route==='settings')document.getElementById('pageContent').insertAdjacentHTML('beforeend',gamesPanel()+staffPanel());
    if(route==='new-team'||route.startsWith('team/')){
      const form=document.getElementById('teamForm');const game=form?.elements.namedItem('game');if(game){const current=game.value;const choice=demoRole==='game_manager'?demoGame:findGame(current)?.name|| (current.toLowerCase().startsWith('overwatch')?'Overwatch':current);const sel=document.createElement('select');sel.className='select';sel.name='game';sel.required=true;sel.innerHTML=gameOptions(choice);if(demoRole==='game_manager')sel.disabled=true;game.replaceWith(sel);if(demoRole==='game_manager'){
        const hidden=document.createElement('input');hidden.type='hidden';hidden.name='game';hidden.value=demoGame;form.appendChild(hidden);
      }}
    }
  };
  document.addEventListener('change',e=>{if(e.target.id==='demoManagerSelect'){selected=e.target.value;sync();render();}});
  document.addEventListener('click',e=>{if(demoRole!=='admin')return;const rm=e.target.closest('[data-manager-remove]');if(rm&&managers.length>1){managers=managers.filter(m=>m.id!==rm.dataset.managerRemove);sync();render();}const copy=e.target.closest('[data-copy-staff]');if(copy){const link=inviteUrl(copy.dataset.copyStaff);navigator.clipboard?.writeText(link).then(()=>toast('Demo link copied.'),()=>prompt('Copy demo link:',link));}const revoke=e.target.closest('[data-revoke-staff]');if(revoke){const i=invites.find(x=>x.code===revoke.dataset.revokeStaff);if(i)i.revoked=true;sync();render();}});
  document.addEventListener('submit',e=>{
    if(e.target.id==='staffInvitePreviewForm'){e.preventDefault();toast('Preview completed — no real account was created.');return;}
    if(!['createGameForm','gameManagerForm','staffInviteForm'].includes(e.target.id))return;
    e.preventDefault();if(demoRole!=='admin')return;
    const f=new FormData(e.target);
    if(e.target.id==='createGameForm'){const name=String(f.get('name')||'').trim();if(!name||findGame(name))return toast('Enter a unique game name.');games.push({id:'game-'+crypto.randomUUID(),name,enabled:true});toast('Game created locally.');}
    if(e.target.id==='gameManagerForm'){const name=String(f.get('name')||'').trim(),game=String(f.get('game')||'');if(!name||!findGame(game))return;managers.push({id:'gm-'+crypto.randomUUID(),name,game});toast('Demo game manager added.');}
    if(e.target.id==='staffInviteForm'){const role=String(f.get('role')),game=String(f.get('game'));if(!['admin','game_manager'].includes(role)||(role==='game_manager'&&!findGame(game)))return;invites.unshift({code:crypto.randomUUID(),role,game:role==='game_manager'?game:null,revoked:false,createdAt:new Date().toISOString()});toast('Demo invitation link generated.');}
    sync();render();
  });
  window.addEventListener('storage',e=>{if([GAME_KEY,MANAGERS_KEY,MANAGER_KEY,INVITES_KEY].includes(e.key)){games=read(GAME_KEY,games);managers=read(MANAGERS_KEY,managers);invites=read(INVITES_KEY,invites);selected=read(MANAGER_KEY,selected);render()}});
  render();
})();
