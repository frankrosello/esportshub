'use strict';
const $=id=>document.getElementById(id);
const s={api:localStorage.getItem('eh_live_api')||'https://esportshub-api.frankierose212005.workers.dev',me:null,games:[],teams:[],team:null,slots:new Set(),clerkReady:false,rendering:false};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const notify=(msg,error=false)=>{const n=$('notice');n.textContent=msg;n.style.color=error?'#ba3858':'var(--muted)';};
const admin=()=>s.me?.roles.some(m=>m.role==='admin');
const managesGame=id=>admin()||s.me?.roles.some(m=>m.role==='game_manager'&&m.game_id===id);
const managesTeam=t=>managesGame(t.game_id)||s.me?.roles.some(m=>['captain','team_manager'].includes(m.role)&&m.team_id===t.id);
const fmt=date=>{const d=new Date(date);return isNaN(d)?'Date unavailable':d.toLocaleString(undefined,{dateStyle:'medium',timeStyle:'short'});};
async function api(path,method='GET',body){const token=await window.Clerk?.session?.getToken();if(!token)throw Error('Sign in with Clerk first');const r=await fetch(s.api+path,{method,headers:{Authorization:`Bearer ${token}`,...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(data.error||`API request failed (${r.status})`),{status:r.status});return data;}
function listOptions(el,items,label){el.innerHTML=items.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(label(t))}</option>`).join('');}
function selectedLabel(){return s.team?`${s.team.game_name} / ${s.team.name}`:'Select a team under Teams first';}
function go(page){const screens=['dashboard','teams','schedule','availability','reports','concerns','invitations','members','settings'];if(!screens.includes(page))page='dashboard';if(!s.me&&page!=='dashboard')page='dashboard';if(page==='members'&&!admin())page='dashboard';document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.panel!==page));document.querySelectorAll('[data-screen]').forEach(x=>x.classList.toggle('active',x.dataset.screen===page));$('breadcrumbCurrent').textContent=({dashboard:'Overview',teams:'Teams',schedule:'Schedule',availability:'Availability',reports:'Reports',concerns:'Player concerns',invitations:'Invitations',members:'Members',settings:'Settings'})[page];document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());history.replaceState(null,'','#'+page);setMobileNav(false);}
function renderTeams(){const elements=[$('teams'),$('teamsMirror')];elements.forEach(el=>{el.replaceChildren();if(!s.teams.length){el.textContent='No assigned team yet. Your captain or manager can ask an administrator to assign you.';return;}s.teams.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='eh-pick'+(s.team?.id===t.id?' active':'');b.textContent=`${t.name} · ${t.game_name}`;b.addEventListener('click',async()=>{try{await selectTeam(t);go('teams');notify(`Viewing ${t.name}`);}catch(e){notify(e.message,true);}});el.append(b);});});}
async function refresh(){const [me,games,teams]=await Promise.all([api('/me'),api('/games'),api('/teams')]);s.me=me;s.games=games;s.teams=teams;$('loginPage').classList.add('hidden');$('dashboardShell').classList.remove('hidden');$('guest').classList.add('hidden');$('signed').classList.remove('hidden');$('logout').classList.remove('hidden');$('authStatus').textContent='Connected';$('welcome').textContent=me.user.name.split(' ')[0];$('sidebarName').textContent=me.user.name;$('sidebarRole').textContent=me.roles.map(m=>m.role.replace('_',' ')).join(' · ')||'Member';$('sidebarAvatar').textContent=me.user.name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();$('roles').textContent=me.roles.map(m=>m.role.replace('_',' ')+(m.game_name?` · ${m.game_name}`:'')).join(' · ');$('statGames').textContent=games.length;$('statTeams').textContent=teams.length;$('statRole').textContent=admin()?'Admin':me.roles[0]?.role.replace('_',' ')||'Member';$('games').innerHTML=games.map(g=>`<div class="eh-item"><strong>${escapeHtml(g.name)}</strong></div>`).join('')||'No assigned games yet.';renderTeams();$('gameForm').classList.toggle('hidden',!admin());const managed=games.filter(g=>managesGame(g.id));$('teamForm').classList.toggle('hidden',!managed.length);listOptions($('createTeamGame'),managed,g=>g.name);listOptions($('inviteGame'),games,g=>g.name);listOptions($('inviteTeam'),teams,t=>t.name);$('staff').classList.toggle('hidden',!admin()&&!teams.some(managesTeam));document.querySelector('[data-screen="invitations"]').classList.toggle('hidden',!admin()&&!teams.some(managesTeam));$('membersNav').classList.toggle('hidden',!admin());$('waitingForTeam').classList.toggle('hidden',!me.roles.some(m=>m.role==='player'&&!m.game_id&&!m.team_id));if(admin())await loadMemberDirectory();const current=teams.find(t=>t.id===s.team?.id)||teams[0];if(current)await selectTeam(current);else clearTeam();go((location.hash||'#dashboard').slice(1));notify('Connected securely through Clerk.');}
function clearTeam(){s.team=null;$('selected').classList.add('hidden');['events','reports','members','concerns'].forEach(id=>$(id).textContent='Select a team to view this section.');['eventForm','reportForm','review'].forEach(id=>$(id).classList.add('hidden'));document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());}
async function selectTeam(t){const [info,events,reports,availability]=await Promise.all([api(`/teams/${t.id}`),api(`/teams/${t.id}/events`),api(`/teams/${t.id}/reports`),api(`/teams/${t.id}/availability`)]);s.team=t;$('selected').classList.remove('hidden');$('teamTitle').textContent=`${t.name} · ${t.game_name}`;$('teamDesc').textContent=info.team.description||'No description';$('members').innerHTML=info.members.map(m=>`<div class="eh-item"><strong>${escapeHtml(m.display_name)}</strong><span class="eh-muted"> · ${escapeHtml(m.role)}</span></div>`).join('')||'No registered members yet.';$('events').innerHTML=events.map(e=>`<div class="eh-item"><strong>${escapeHtml(e.title)}</strong><div class="eh-muted">${escapeHtml(e.type)} · ${escapeHtml(fmt(e.starts_at))}${e.opponent?' · vs '+escapeHtml(e.opponent):''}</div>${e.notes?`<p>${escapeHtml(e.notes)}</p>`:''}</div>`).join('')||'No events scheduled.';$('reports').innerHTML=reports.map(r=>`<div class="eh-item"><strong>${escapeHtml(r.title)}</strong><div class="eh-muted">${escapeHtml(r.type)} · ${escapeHtml(r.author||'')}</div><p>${escapeHtml(r.content)}</p></div>`).join('')||'No reports published.';$('eventForm').classList.toggle('hidden',!managesTeam(t));$('reportForm').classList.toggle('hidden',!managesTeam(t));$('review').classList.toggle('hidden',!managesGame(t.game_id));if(managesGame(t.game_id)){const concerns=await api(`/teams/${t.id}/concerns`);$('concerns').innerHTML=concerns.map(c=>`<div class="eh-item"><strong>${escapeHtml(c.status||'Open')}</strong> · ${escapeHtml(c.author)}<p>${escapeHtml(c.details)}</p></div>`).join('')||'No private concerns.';}const mine=Array.isArray(availability)?availability.find(x=>x.user_id===s.me.user.id)?.slots||[]:availability.slots||[];s.slots=new Set(mine.map(Number));updateGrid();renderTeams();document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());}
function form(id,fn){$(id).addEventListener('submit',async e=>{e.preventDefault();const element=e.currentTarget;const values=Object.fromEntries(new FormData(element).entries());try{await fn(values);element.reset();}catch(err){notify(err.message,true);}});}
form('gameForm',async b=>{await api('/games','POST',{name:b.name});await refresh();notify('Game created');});
form('teamForm',async b=>{await api('/teams','POST',b);await refresh();notify('Team created');});
form('eventForm',async b=>{if(!s.team)throw Error('Select a team first');if(!b.startsAt||!Number.isFinite(Date.parse(b.startsAt)))throw Error('Choose a valid date and time');await api(`/teams/${s.team.id}/events`,'POST',{...b,startsAt:new Date(b.startsAt).toISOString()});await selectTeam(s.team);notify('Event scheduled');});
form('reportForm',async b=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/reports`,'POST',b);await selectTeam(s.team);notify('Report published');});
form('concernForm',async b=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/concerns`,'POST',b);if(managesGame(s.team.game_id))await selectTeam(s.team);notify('Private concern submitted');});
form('availabilityForm',async()=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/availability`,'PUT',{slots:[...s.slots].sort((a,b)=>a-b)});notify('Availability saved');});
form('inviteForm',async b=>{const data={role:b.role,maxUses:b.role==='player'?Number(b.maxUses||1):1};if(b.role==='game_manager')data.gameId=b.gameId;if(b.role==='captain'||b.role==='player')data.teamId=b.teamId;const r=await api('/invites','POST',data);const box=$('inviteResult');box.replaceChildren();const p=document.createElement('p');p.textContent=`Share this invitation link privately (maximum ${r.maxUses} ${r.maxUses===1?'member':'members'}, expires in 72 hours):`;const input=document.createElement('input');input.readOnly=true;input.value=routes.home({invite:r.token});box.append(p,input);notify('Invitation created.');});
let directory=[];
async function loadMemberDirectory(){
  directory=await api('/members');
  const previous=$('memberUser').value;
  listOptions($('memberUser'),directory,u=>u.name);
  if(directory.some(u=>u.id===previous))$('memberUser').value=previous;
  $('memberDirectory').replaceChildren();
  directory.forEach(u=>{
    const row=document.createElement('div');row.className='eh-item';
    const name=document.createElement('strong');name.textContent=u.name;
    const detail=document.createElement('div');detail.className='eh-muted';
    detail.textContent=u.roles.map(m=>m.role.replaceAll('_',' ')+(m.team_name?' · '+m.team_name:m.game_name?' · '+m.game_name:m.role==='player'?' · Unassigned':'')).join(' / ')||'No assignment';
    const button=document.createElement('button');button.type='button';button.className='eh-btn tiny';button.textContent='Manage';button.onclick=()=>{$('memberUser').value=u.id;chooseMember();$('memberUser').focus();};
    row.append(name,detail,button);$('memberDirectory').append(row);
  });
  listOptions($('memberGame'),s.games,g=>g.name);
  $('memberTeam').innerHTML='<option value="">Unassigned</option>'+s.teams.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.game_name+' / '+t.name)}</option>`).join('');
  chooseMember();
}
function chooseMember(){
  const member=directory.find(u=>u.id===$('memberUser').value);
  $('memberAssignment').innerHTML=(member?.roles||[]).map(m=>`<option value="${m.membership_id}">${escapeHtml(m.role.replaceAll('_',' ')+(m.team_name?' · '+m.team_name:m.game_name?' · '+m.game_name:m.role==='player'?' · Unassigned':''))}</option>`).join('')+'<option value="">Add another assignment</option>';
  chooseAssignment();
}
function chooseAssignment(){
  const member=directory.find(u=>u.id===$('memberUser').value);
  const assignment=member?.roles.find(m=>String(m.membership_id)===$('memberAssignment').value);
  $('memberRole').value=assignment?.role||'player';$('memberTeam').value=assignment?.team_id||'';
  if(assignment?.game_id)$('memberGame').value=assignment.game_id;
  updateAssignmentScope();
}
function updateAssignmentScope(){
  const role=$('memberRole').value;
  $('memberTeamField').classList.toggle('hidden',!['player','captain','team_manager'].includes(role));
  $('memberGameField').classList.toggle('hidden',role!=='game_manager');
  $('memberTeam').required=['captain','team_manager'].includes(role);
  $('memberGame').required=role==='game_manager';
}
$('memberUser').addEventListener('change',chooseMember);
$('memberAssignment').addEventListener('change',chooseAssignment);
$('memberRole').addEventListener('change',updateAssignmentScope);
$('reloadMembers').onclick=async()=>{try{await loadMemberDirectory();notify('Member list updated.');}catch(e){notify(e.message,true);}};
$('memberForm').addEventListener('submit',async event=>{
  event.preventDefault();$('saveMember').disabled=true;
  try{
    const userId=$('memberUser').value;if(!userId)throw Error('Choose a member');
    await api('/members/'+encodeURIComponent(userId)+'/assignment','PUT',{membershipId:$('memberAssignment').value?Number($('memberAssignment').value):null,role:$('memberRole').value,teamId:$('memberTeam').value||null,gameId:$('memberGame').value||null});
    await refresh();go('members');notify('Member assignment saved.');
  }catch(e){notify(e.message,true);}finally{$('saveMember').disabled=false;}
});
$('dashboardInviteForm').addEventListener('submit',async event=>{
  event.preventDefault();const value=$('dashboardInviteToken').value.trim();let token=value;
  try{token=new URL(value).searchParams.get('invite')||'';}catch{}
  if(!token)return notify('Paste an invitation link or token',true);
  pendingInvite=token;try{sessionStorage.setItem(pendingKey,token);}catch{}
  history.replaceState(null,'',routes.home({invite:token}));await renderAuth();
});
$('api').value=s.api;$('saveApi').addEventListener('click',()=>{const a=$('api').value.trim().replace(/\/$/,'');if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(a)&&!/^http:\/\/localhost:\d+$/i.test(a))return notify('Enter a valid HTTPS Worker URL',true);s.api=a;localStorage.setItem('eh_live_api',a);notify('API URL saved. Reload to reconnect.');});
$('logout').onclick=async()=>{resetInvite();await window.Clerk.signOut({redirectUrl:signInReturnUrl});showGuest();};
// Always follow the device appearance, including changes while the page is open.
const deviceTheme = window.matchMedia('(prefers-color-scheme: dark)');
const applyDeviceTheme = () => {
  document.documentElement.dataset.theme = deviceTheme.matches ? 'dark' : 'light';
  const themeMeta = document.querySelector('meta[name="theme-color"]');
  if (themeMeta) themeMeta.content = deviceTheme.matches ? '#14101c' : '#faf8fd';
};
localStorage.removeItem('eh_theme'); // Clear any previous manual preference.
applyDeviceTheme();
deviceTheme.addEventListener('change', applyDeviceTheme);
document.querySelectorAll('[data-screen]').forEach(link=>link.addEventListener('click',e=>{e.preventDefault();go(link.dataset.screen);}));
function setMobileNav(open){const enabled=open && window.matchMedia('(max-width: 900px)').matches;$('sidebar').classList.toggle('open',enabled);$('mobileOverlay').classList.toggle('show',enabled);$('mobileOverlay').setAttribute('aria-hidden',String(!enabled));$('menuButton').setAttribute('aria-expanded',String(enabled));document.body.classList.toggle('mobile-nav-open',enabled);}
$('menuButton').addEventListener('click',()=>setMobileNav(!$('sidebar').classList.contains('open')));
$('mobileOverlay').addEventListener('click',()=>setMobileNav(false));
document.addEventListener('keydown',e=>{if(e.key==='Escape')setMobileNav(false);});
window.matchMedia('(min-width: 901px)').addEventListener('change',e=>{if(e.matches)setMobileNav(false);});
const days=['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];let dragging=false,paint=true,suppressClick=false;
function updateGrid(){document.querySelectorAll('#weekGrid button[data-slot]').forEach(b=>{const on=s.slots.has(Number(b.dataset.slot));b.classList.toggle('chosen',on);b.setAttribute('aria-pressed',on?'true':'false');});$('availabilityForm').elements.slots.value=[...s.slots].join(',');}
function buildGrid(){const grid=$('weekGrid');const frag=document.createDocumentFragment();const mk=(tag,cls,txt)=>{const e=document.createElement(tag);e.className='cell '+cls;e.textContent=txt;return e;};frag.append(mk('div','head','Time'));days.forEach(d=>frag.append(mk('div','head',d)));for(let half=0;half<48;half++){const hh=String(Math.floor(half/2)).padStart(2,'0');frag.append(mk('div','time',`${hh}:${half%2?'30':'00'}`));for(let day=0;day<7;day++){const slot=day*48+half;const b=mk('button','', '');b.type='button';b.dataset.slot=slot;b.setAttribute('aria-label',`${days[day]} ${hh}:${half%2?'30':'00'}`);b.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;suppressClick=true;paint=!s.slots.has(slot);if(paint)s.slots.add(slot);else s.slots.delete(slot);updateGrid();});b.addEventListener('pointerenter',()=>{if(dragging){if(paint)s.slots.add(slot);else s.slots.delete(slot);updateGrid();}});b.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}if(s.slots.has(slot))s.slots.delete(slot);else s.slots.add(slot);updateGrid();});frag.append(b);}}grid.append(frag);}window.addEventListener('pointerup',()=>{dragging=false;});buildGrid();
const routes=window.EsportsHubRoutes;
const signInReturnUrl=routes.home();
// Retain invitations across Clerk redirects, including social sign-in.
const pendingKey='eh_pending_invite';
let pendingInvite=new URL(location.href).searchParams.get('invite')||'';
try{if(pendingInvite)sessionStorage.setItem(pendingKey,pendingInvite);else pendingInvite=sessionStorage.getItem(pendingKey)||'';}catch{}
function authReturnUrl(){return routes.home({invite:pendingInvite});}
let mountedAuthMode=null,clerkMounted=false,authMode=new URL(location.href).searchParams.get('auth')==='signup'?'signup':'signin',accepting=false,inviteDetails=null;
function unmountClerk(){if(!clerkMounted)return;if(mountedAuthMode==='signup')window.Clerk.unmountSignUp($('clerk-sign-in'));else window.Clerk.unmountSignIn($('clerk-sign-in'));clerkMounted=false;mountedAuthMode=null;}
function mountClerk(){
  if(clerkMounted||!s.clerkReady||window.Clerk.user)return;
  clerkMounted=true;mountedAuthMode=authMode;
  $('mainSignIn').setAttribute('aria-pressed',String(authMode==='signin'));$('mainSignUp').setAttribute('aria-pressed',String(authMode==='signup'));
  const returnUrl=authReturnUrl();
  const options={...routes.clerkOptions(returnUrl,pendingInvite),routing:'virtual',forceRedirectUrl:returnUrl,fallbackRedirectUrl:returnUrl,signInForceRedirectUrl:returnUrl,signInFallbackRedirectUrl:returnUrl,signUpForceRedirectUrl:returnUrl,signUpFallbackRedirectUrl:returnUrl,appearance:{elements:{rootBox:{width:'100%',maxWidth:'100%'},cardBox:{width:'100%',maxWidth:'100%'},card:{width:'100%',maxWidth:'100%'},formFieldInput:{fontSize:'16px'}}}};
  if(authMode==='signup')window.Clerk.mountSignUp($('clerk-sign-in'),options);
  else window.Clerk.mountSignIn($('clerk-sign-in'),{...options,withSignUp:true});
}
function showGuest(msg){s.me=null;$('loginPage').classList.remove('hidden');$('dashboardShell').classList.add('hidden');$('guest').classList.remove('hidden');$('signed').classList.add('hidden');$('logout').classList.add('hidden');$('authStatus').textContent='Sign in required';$('sidebarName').textContent='Not signed in';$('sidebarRole').textContent='Clerk authentication';$('guestNotice').textContent=msg||'';mountClerk();}
function resetInvite(){pendingInvite='';inviteDetails=null;try{sessionStorage.removeItem(pendingKey);}catch{}const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url.href);$('invitationCard').classList.add('hidden');}
async function showInvitation(){
  showGuest();unmountClerk();$('authCard').classList.add('hidden');$('invitationCard').classList.remove('hidden');$('inviteAuthButtons').classList.add('hidden');$('acceptInvite').classList.add('hidden');$('invitationStatus').textContent='Checking your invitation…';
  $('invitationAccount').textContent='Signed in as '+(window.Clerk.user.primaryEmailAddress?.emailAddress||window.Clerk.user.fullName||'your Clerk account');
  try{
    await api('/me');
    inviteDetails=await api('/invites/preview','POST',{inviteToken:pendingInvite});
    $('invitationStatus').textContent=`Join ${inviteDetails.teamName||inviteDetails.gameName||'EsportsHub'} as ${inviteDetails.role.replaceAll('_',' ')}. ${inviteDetails.remainingUses} place(s) remaining. Expires ${fmt(inviteDetails.expiresAt)}.`;
    $('acceptInvite').classList.remove('hidden');
  }catch(e){$('invitationStatus').textContent=e.message;}
}
function chooseAuth(mode){
  unmountClerk();authMode=mode;
  $('authTitle').textContent=mode==='signup'?'Create an account':'Sign in';
  $('mainSignIn').setAttribute('aria-pressed',String(mode==='signin'));
  $('mainSignUp').setAttribute('aria-pressed',String(mode==='signup'));
  const url=new URL(location.href);url.searchParams.set('auth',mode);history.replaceState(null,'',url.href);
  mountClerk();
}
$('inviteSignIn').onclick=()=>chooseAuth('signin');
$('inviteSignUp').onclick=()=>chooseAuth('signup');
$('mainSignIn').onclick=()=>chooseAuth('signin');
$('mainSignUp').onclick=()=>chooseAuth('signup');
$('enrollmentSignOut').onclick=async()=>{await window.Clerk.signOut({redirectUrl:authReturnUrl()});};
$('enrollmentForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const value=$('enrollmentToken').value.trim();let token=value;
  try{token=new URL(value).searchParams.get('invite')||'';}catch{}
  if(!token){$('guestNotice').textContent='Paste a valid invitation link or token.';return;}
  pendingInvite=token;try{sessionStorage.setItem(pendingKey,token);}catch{}
  history.replaceState(null,'',routes.home({invite:token}));await renderAuth();
});
$('invitationSwitch').onclick=async()=>{await window.Clerk.signOut({redirectUrl:authReturnUrl()});};
$('invitationCancel').onclick=async()=>{resetInvite();$('authCard').classList.remove('hidden');await renderAuth();};
$('acceptInvite').onclick=async()=>{
  if(accepting||!pendingInvite)return;accepting=true;$('acceptInvite').disabled=true;$('invitationStatus').textContent='Accepting invitation…';
  try{
    await api('/invites/redeem','POST',{inviteToken:pendingInvite});
    const teamId=inviteDetails?.teamId;
    resetInvite();await refresh();const team=s.teams.find(t=>t.id===teamId);if(team){await selectTeam(team);go('teams');}notify('Invitation accepted. Welcome to EsportsHub!');
  }catch(e){$('invitationStatus').textContent=e.message;}
  finally{accepting=false;$('acceptInvite').disabled=false;}
};
async function renderAuth(){
  if(!s.clerkReady||accepting)return;
  if(s.rendering){s.authQueued=true;return;}s.rendering=true;
  try{
    $('enrollmentCard').classList.add('hidden');
    if(!window.Clerk.user){
      $('authTitle').textContent=authMode==='signup'?'Create an account':'Sign in';$('authCard').classList.remove('hidden');$('invitationCard').classList.toggle('hidden',!pendingInvite);$('inviteAuthButtons').classList.remove('hidden');$('acceptInvite').classList.add('hidden');$('invitationSwitch').classList.add('hidden');$('invitationAccount').textContent='';
      $('invitationStatus').textContent='You have been invited to EsportsHub. Create an account or sign in, then review and accept your invitation.';showGuest();return;
    }
    unmountClerk();$('invitationSwitch').classList.remove('hidden');
    if(pendingInvite){await showInvitation();return;}
    try{await refresh();}catch(e){$('authCard').classList.add('hidden');showGuest(e.message);if(e.status===403){$('enrollmentCard').classList.remove('hidden');$('guestNotice').textContent='Your account is signed in. Accept an invitation from your captain or manager to join a team.';}}
  }finally{s.rendering=false;if(s.authQueued){s.authQueued=false;void renderAuth();}}
}
window.addEventListener('load',async()=>{try{if(!window.Clerk||!window.__internal_ClerkUICtor)throw Error('Clerk scripts did not load');await window.Clerk.load({...routes.clerkOptions(authReturnUrl(),pendingInvite),signInForceRedirectUrl:authReturnUrl(),signInFallbackRedirectUrl:authReturnUrl(),signUpForceRedirectUrl:authReturnUrl(),signUpFallbackRedirectUrl:authReturnUrl(),ui:{ClerkUI:window.__internal_ClerkUICtor}});s.clerkReady=true;window.Clerk.addListener(()=>{void renderAuth();});await renderAuth();}catch(e){notify('Unable to start Clerk: '+e.message,true);showGuest(e.message);}});
