'use strict';
'use strict';
// One base URL for every application entry point and authentication destination.
(function () {
  if(window.EsportsHubRoutes)return;
  const here = new URL(window.location.href);
  const root = here.hostname === 'frankrosello.github.io'
    ? new URL('https://frankrosello.github.io/esportshub/')
    : new URL('./', here);
  function home({invite='', auth='', hash=''}={}) {
    const url = new URL('index.html', root);
    if (invite) url.searchParams.set('invite', invite);
    if (auth) url.searchParams.set('auth', auth);
    if (hash) url.hash = hash;
    return url.href;
  }
  // Canonicalize directory visits without discarding Clerk callback parameters,
  // invitation tokens, authentication mode, or the selected dashboard section.
  if(here.pathname===root.pathname||here.pathname===root.pathname.replace(/\/$/,'')){
    const canonical=new URL('index.html',root);
    canonical.search=here.search;
    canonical.hash=here.hash;
    window.history.replaceState(null,'',canonical.href);
  }
  function clerkOptions(returnUrl=home(), invite='') {
    return {
      signInUrl:home({invite,auth:'signin'}),
      signUpUrl:home({invite,auth:'signup'}),
      signInForceRedirectUrl:returnUrl,
      signInFallbackRedirectUrl:returnUrl,
      signUpForceRedirectUrl:returnUrl,
      signUpFallbackRedirectUrl:returnUrl,
      afterSignOutUrl:returnUrl,
      afterMultiSessionSingleSignOutUrl:returnUrl
    };
  }
  window.EsportsHubRoutes=Object.freeze({root:root.href,home,clerkOptions,
    page:name=>new URL(name,root).href});
})();

'use strict';
const $=id=>document.getElementById(id);
const API_ORIGIN='https://esportshub-api.frankierose212005.workers.dev';
try{localStorage.removeItem('eh_live_api');}catch{}
function apiUrl(path){if(typeof path!=='string'||!path.startsWith('/')||path.startsWith('//')||path.includes('\\'))throw Error('Invalid API path');const url=new URL(path,API_ORIGIN);if(url.origin!==API_ORIGIN||url.username||url.password)throw Error('Untrusted API destination');return url.href;}
const s={api:API_ORIGIN,me:null,games:[],teams:[],team:null,slots:new Set(),clerkReady:false,rendering:false};
const escapeHtml=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
let noticeTimer;const notify=(msg,error=false)=>{clearTimeout(noticeTimer);const n=$('notice');n.textContent=msg;n.style.color=error?'#ba3858':'var(--muted)';if(!error)noticeTimer=setTimeout(()=>{n.textContent='';},4000);};
let activeViewRole='';let assignedRoles=[];
const admin=()=>s.me?.roles.some(m=>m.role==='admin');
const managesGame=id=>admin()||s.me?.roles.some(m=>m.role==='game_manager'&&m.game_id===id);
const managesTeam=t=>managesGame(t.game_id)||s.me?.roles.some(m=>['captain','team_manager','coach'].includes(m.role)&&m.team_id===t.id);
const EASTERN_ZONE='America/New_York';
function easternParts(value){return Object.fromEntries(new Intl.DateTimeFormat('en-US',{timeZone:EASTERN_ZONE,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).formatToParts(new Date(value)).map(p=>[p.type,p.value]));}
function easternDay(value){const p=easternParts(value);return `${p.year}-${p.month}-${p.day}`;}
function easternClock(value){const p=easternParts(value);return `${p.hour}:${p.minute}`;}
function easternWallDate(value){const p=easternParts(value);return new Date(Number(p.year),Number(p.month)-1,Number(p.day),Number(p.hour),Number(p.minute));}
function fromEasternInput(day,time){
 const target=Date.parse(`${day}T${time}:00Z`);if(!Number.isFinite(target))throw Error('Choose a valid Eastern date and time');
 const matches=[];for(const offset of [4,5]){const candidate=new Date(target+offset*3600000);if(easternDay(candidate)===day&&easternClock(candidate)===time)matches.push(candidate);}
 if(!matches.length)throw Error('This Eastern time does not exist because of daylight saving time. Choose another time.');
 if(matches.length>1)throw Error('This Eastern time occurs twice when daylight saving time ends. Choose a time outside the repeated hour.');
 return matches[0];
}
const fmt=date=>{const d=new Date(date);return isNaN(d)?'Date unavailable':d.toLocaleString('en-US',{timeZone:EASTERN_ZONE,month:'short',day:'numeric',year:'numeric',hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'});};
async function requestApi(path,method='GET',body){const token=await window.Clerk?.session?.getToken();if(!token)throw Error('Sign in with Clerk first');const r=await fetch(apiUrl(path),{method,redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{Authorization:`Bearer ${token}`,...(activeViewRole&&path!=='/me'?{'X-View-Role':activeViewRole}:{}),...(body!==undefined?{'Content-Type':'application/json'}:{})},...(body!==undefined?{body:JSON.stringify(body)}:{})});const data=await r.json().catch(()=>({}));if(!r.ok)throw Object.assign(Error(data.error||`API request failed (${r.status})`),{status:r.status});return data;}
// Share short-lived profile reads across roster avatars, cards, and settings.
const profileReads=new Map();let profileCacheGeneration=0;
function clearProfileReads(){profileCacheGeneration++;profileReads.clear();}
async function api(path,method='GET',body){
 if(method!=='GET'){if(path.startsWith('/me/'))clearProfileReads();try{return await requestApi(path,method,body);}finally{if(path.startsWith('/me/'))clearProfileReads();}}
 if(!/^\/profile\/[^/]+$/.test(path))return requestApi(path,method,body);
 const key=[window.Clerk?.user?.id||'',activeViewRole,path].join('|'),cached=profileReads.get(key);
 if(cached&&(cached.pending||cached.expires>Date.now()))return cached.promise;
 const generation=profileCacheGeneration,entry={pending:true,expires:0};
 entry.promise=requestApi(path).then(data=>{entry.pending=false;entry.expires=Date.now()+15000;if(generation!==profileCacheGeneration&&profileReads.get(key)===entry)profileReads.delete(key);return data;},error=>{if(profileReads.get(key)===entry)profileReads.delete(key);throw error;});
 profileReads.set(key,entry);return entry.promise;
}

function listOptions(el,items,label){el.innerHTML=items.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(label(t))}</option>`).join('');}
function selectedLabel(){return s.team?`${s.team.game_name} / ${s.team.name}`:'Select a team under Teams first';}
function go(page){const screens=['dashboard','teams','schedule','availability','reports','concerns','invitations','members','settings','matchsync'];if(!screens.includes(page))page='dashboard';if(!s.me&&page!=='dashboard')page='dashboard';if(page==='members'&&!admin())page='dashboard';if(page==='matchsync'&&!canViewMatchSync())page='dashboard';if(page==='matchsync')renderMatchSyncPage();document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.panel!==page));document.querySelectorAll('[data-screen]').forEach(x=>x.classList.toggle('active',x.dataset.screen===page));$('breadcrumbCurrent').textContent=({dashboard:'Overview',teams:'Teams',schedule:'Schedule',availability:'Availability',reports:'Reports',concerns:'Player concerns',invitations:'Invitations',members:'Members',settings:'Settings',matchsync:'Match Sync'})[page];document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());const destination=new URL(routes.home());destination.search=new URL(location.href).search;destination.hash=page;history.replaceState(null,'',destination.href);updateTabTitle(page);setMobileNav(false);}
function renderTeams(){
 const el=$('teamsMirror');el.replaceChildren();
 if(!s.teams.length){el.textContent='No assigned team yet. Your captain or manager can ask an administrator to assign you.';return;}
 if(admin()&&s.teams.length>1)el.append(schEl('p','eh-muted eh-sort-hint','Drag a team by its handle to arrange the list. Keyboard: focus the handle and use Up or Down.'));
 for(const team of s.teams){
  const button=document.createElement('button');button.type='button';button.className='eh-pick'+(s.team?.id===team.id?' active':'');button.append(schEl('strong','',team.name),schEl('small','',team.game_name));button.setAttribute('aria-pressed',String(s.team?.id===team.id));
  button.onclick=async()=>{try{await selectTeam(team);go('teams');notify(`Viewing ${team.name}`);}catch(error){notify(error.message,true);}};
  if(admin()&&s.teams.length>1){const row=document.createElement('div');row.className='eh-team-sort-row';row.dataset.teamId=team.id;
   const handle=document.createElement('button');handle.type='button';handle.className='eh-team-drag-handle';handle.textContent='⠿';handle.dataset.dragTeam=team.id;handle.disabled=!!s.teamOrderSaving;handle.setAttribute('aria-label',`Reorder ${team.name}. Drag, or use Up and Down arrow keys.`);
   handle.onpointerdown=e=>beginTeamDrag(e,row,handle,el);
   handle.onkeydown=async e=>{if(!['ArrowUp','ArrowDown'].includes(e.key)||s.teamOrderSaving)return;e.preventDefault();const index=s.teams.findIndex(t=>t.id===team.id),target=index+(e.key==='ArrowUp'?-1:1);if(target<0||target>=s.teams.length)return;const ids=s.teams.map(t=>t.id);ids.splice(index,1);ids.splice(target,0,team.id);await saveTeamArrangement(ids,team.id);};
   row.append(handle,button);el.append(row);
  }else el.append(button);
 }
}
async function refresh(){s.scheduleRequest=(s.scheduleRequest||0)+1;s.scheduleAllEvents=null;s.scheduleLoading=false;const me=await api('/me');assignedRoles=me.roles||[];if(activeViewRole&&!assignedRoles.some(m=>m.role===activeViewRole))activeViewRole='';renderRoleSelector();const [games,teams]=await Promise.all([api('/games'),api('/teams')]);me.roles=activeViewRole?assignedRoles.filter(m=>m.role===activeViewRole):assignedRoles;s.me=me;s.games=games;s.teams=teams;startLivePresence();void refreshNotifications(true).catch(()=>{});if(me.user.profile_setup_complete===false){showProfileOnboarding();return;}$('loginPage').classList.add('hidden');$('dashboardShell').classList.remove('hidden');$('guest').classList.add('hidden');$('signed').classList.remove('hidden');$('logout').classList.remove('hidden');$('authStatus').textContent='Connected';updateDashboardGreeting();$('sidebarName').textContent=me.user.name;$('sidebarRole').textContent=(activeViewRole?'Viewing as ':'')+(me.roles.map(m=>roleLabel(m.role)).filter((v,i,a)=>a.indexOf(v)===i).join(' · ')||'Member');$('sidebarAvatar').textContent=me.user.name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();$('roles').textContent=me.roles.map(m=>roleLabel(m.role)+(m.game_name?` · ${m.game_name}`:'')).join(' · ');renderTeams();$('gameForm').classList.toggle('hidden',!admin());const managed=games.filter(g=>managesGame(g.id));$('teamForm').classList.toggle('hidden',!managed.length);const organizationCard=$('teamForm').closest('article');const canManageOrganization=admin()||managed.length>0;organizationCard.classList.toggle('hidden',!canManageOrganization);organizationCard.parentElement.style.gridTemplateColumns=canManageOrganization?'':'minmax(0,1fr)';listOptions($('createTeamGame'),managed,g=>g.name);listOptions($('inviteGame'),games,g=>g.name);listOptions($('inviteTeam'),teams,t=>t.name);$('staff').classList.toggle('hidden',!admin()&&!teams.some(managesTeam));document.querySelector('[data-screen="invitations"]').classList.toggle('hidden',!admin()&&!teams.some(managesTeam));$('membersNav').classList.toggle('hidden',!admin());$('matchSyncNav').classList.toggle('hidden',!canViewMatchSync());$('waitingForTeam').classList.toggle('hidden',!me.roles.some(m=>m.role==='player'&&!m.game_id&&!m.team_id));if(admin())await loadMemberDirectory();renderDefaultTeamSettings();const current=chooseDashboardTeam(teams,s.team?.id,me.user.default_team_id);if(current)await selectTeam(current);else clearTeam();go((location.hash||'#dashboard').slice(1));renderDashboard();fillProfile();notify('Connected securely through Clerk.');}
function clearTeam(){s.scheduleRequest=(s.scheduleRequest||0)+1;s.scheduleAllEvents=null;s.scheduleLoading=false;s.team=null;s.teamMembers=[];s.events=[];s.teamReports=[];s.teamAvailability=[];s.slots=new Set();s.avEditing=false;renderTeamAvailability();$('reportComposer').classList.add('hidden');$('scheduleCreate').classList.add('hidden');renderDashboard();if($('practiceSuggestions'))$('practiceSuggestions').textContent='Select a team to find practice times.';$('selected').classList.add('hidden');['events','reports','members','concerns'].forEach(id=>$(id).textContent='Select a team to view this section.');['eventForm','reportForm','review'].forEach(id=>$(id).classList.add('hidden'));document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());}
async function selectTeam(t){if(s.team?.id!==t.id){s.rosterQuery='';s.reportQuery='';}const [info,events,reports,availability]=await Promise.all([api(`/teams/${t.id}`),api(`/teams/${t.id}/events`),api(`/teams/${t.id}/reports`),api(`/teams/${t.id}/availability`)]);s.team=t;$('selected').classList.remove('hidden');$('teamTitle').textContent=`${t.name} · ${t.game_name}`;$('teamDesc').textContent=info.team.description||'No description';s.events=events;s.teamMembers=info.members||[];s.teamReports=reports||[];s.teamAvailability=Array.isArray(availability)?availability:(availability.members||availability.availability||[]);renderSchedule();renderRoster();renderDashboard();renderReports();$('eventForm').classList.toggle('hidden',!managesTeam(t));$('reportForm').classList.toggle('hidden',!managesTeam(t));$('review').classList.toggle('hidden',!managesGame(t.game_id));if(managesGame(t.game_id)){const concerns=await api(`/teams/${t.id}/concerns`);$('concerns').innerHTML=concerns.map(c=>`<div class="eh-item"><strong>${escapeHtml(c.status||'Open')}</strong> · ${escapeHtml(c.author)}<p>${escapeHtml(c.details)}</p></div>`).join('')||'No private concerns.';}const mine=Array.isArray(availability)?availability.find(x=>x.user_id===s.me.user.id)?.slots||[]:availability.slots||[];s.slots=new Set(mine.map(Number));s.avEditing=false;updateGrid();renderTeamAvailability();renderPracticeSuggestions();renderTeams();document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());}
function form(id,fn){$(id).addEventListener('submit',async e=>{e.preventDefault();const element=e.currentTarget;const values=Object.fromEntries(new FormData(element).entries());try{await fn(values);element.reset();}catch(err){notify(err.message,true);}});}
form('gameForm',async b=>{await api('/games','POST',{name:b.name});await refresh();notify('Game created');});
form('teamForm',async b=>{await api('/teams','POST',b);await refresh();notify('Team created');});
form('eventForm',async b=>{if(!s.team)throw Error('Select a team first');const when=fromEasternInput(b.date,b.time);if(!b.date||!b.time||isNaN(when))throw Error('Choose a valid date and time');const {date,time,...rest}=b;await api(`/teams/${s.team.id}/events`,'POST',{...rest,startsAt:when.toISOString()});const wall=easternWallDate(when);s.calMonth=new Date(wall.getFullYear(),wall.getMonth(),1);s.calSel=date;await selectTeam(s.team);notify('Event scheduled');});
form('reportForm',async b=>{if(!s.team)throw Error('Select a team first');if(!b.content?.trim())throw Error('Write some report content first');if(b.content.length>8000)throw Error('Report exceeds the 8,000 character limit');await api(`/teams/${s.team.id}/reports`,'POST',b);await selectTeam(s.team);resetReportEditor();$('reportComposer').open=false;notify('Report published');});
form('concernForm',async b=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/concerns`,'POST',b);if(managesGame(s.team.game_id))await selectTeam(s.team);notify('Private concern submitted');});
form('availabilityForm',async()=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/availability`,'PUT',{slots:[...s.slots].sort((a,b)=>a-b)});await selectTeam(s.team);notify('Availability saved');});
form('inviteForm',async b=>{const data={role:b.role,maxUses:b.role==='player'?Number(b.maxUses||1):1};if(b.role==='game_manager')data.gameId=b.gameId;if(['captain','coach','player'].includes(b.role))data.teamId=b.teamId;const r=await api('/invites','POST',data);const box=$('inviteResult');box.replaceChildren();const p=document.createElement('p');p.textContent=`Share this invitation link privately (maximum ${r.maxUses} ${r.maxUses===1?'member':'members'}, expires in 72 hours):`;const input=document.createElement('input');input.readOnly=true;input.value=routes.home({invite:r.token});box.append(p,input);notify('Invitation created.');});
let directory=[];
async function loadMemberDirectory(){
  directory=await api('/members');
  const previous=$('memberUser').value;
  listOptions($('memberUser'),directory,u=>u.name+(u.username?' · @'+u.username:''));
  if(directory.some(u=>u.id===previous))$('memberUser').value=previous;
  $('memberDirectory').replaceChildren();
  directory.forEach(u=>{
    const row=document.createElement('div');row.className='eh-item';
    const name=document.createElement('div');name.className='eh-member-name';const full=document.createElement('strong');full.textContent=u.name;const username=document.createElement('span');username.className='eh-inline-username';username.textContent=u.username?'@'+u.username:'Username not set';name.append(full,username);
    const detail=document.createElement('div');detail.className='eh-muted';
    detail.textContent=u.roles.map(m=>roleLabel(m.role)+(m.team_name?' · '+m.team_name:m.game_name?' · '+m.game_name:m.role==='player'?' · Unassigned':'')).join(' / ')||'No assignment';
    const button=document.createElement('button');button.type='button';button.className='eh-btn tiny';button.textContent='Manage';button.onclick=()=>{$('memberUser').value=u.id;chooseMember();$('memberUser').focus();};
    row.append(name,detail,button);$('memberDirectory').append(row);
  });
  listOptions($('memberGame'),s.games,g=>g.name);
  $('memberTeam').innerHTML='<option value="">Unassigned</option>'+s.teams.map(t=>`<option value="${escapeHtml(t.id)}">${escapeHtml(t.game_name+' / '+t.name)}</option>`).join('');
  chooseMember();
}
function chooseMember(){
  const member=directory.find(u=>u.id===$('memberUser').value);
  $('memberAssignment').innerHTML=(member?.roles||[]).map(m=>`<option value="${m.membership_id}">${escapeHtml(roleLabel(m.role)+(m.team_name?' · '+m.team_name:m.game_name?' · '+m.game_name:m.role==='player'?' · Unassigned':''))}</option>`).join('')+'<option value="">Add another assignment</option>';
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
  $('memberTeamField').classList.toggle('hidden',!['player','captain','team_manager','coach'].includes(role));
  $('memberGameField').classList.toggle('hidden',role!=='game_manager');
  $('memberTeam').required=['captain','team_manager','coach'].includes(role);
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
$('api').value=API_ORIGIN;$('api').readOnly=true;$('saveApi').classList.add('hidden');
$('logout').onclick=async()=>{const button=$('logout');button.disabled=true;setAccountMenu(false);try{await setOfflinePresence();resetInvite();await window.Clerk.signOut({redirectUrl:signInReturnUrl});showGuest();}catch(e){notify('Unable to sign out: '+e.message,true);}finally{button.disabled=false;}};
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
function updateGrid(){document.querySelectorAll('#weekGrid button[data-slot]').forEach(b=>{const on=s.slots.has(Number(b.dataset.slot));b.classList.toggle('chosen',on&&s.avEditing); b.setAttribute('aria-pressed',on?'true':'false');});$('availabilityForm').elements.slots.value=[...s.slots].join(',');if($('availabilitySelectionCount'))$('availabilitySelectionCount').textContent=`${s.slots.size/2} hours selected this week`;if(s.avEditing&&$('availabilitySummary')?.lastElementChild)$('availabilitySummary').lastElementChild.querySelector('strong').textContent=String(s.slots.size/2);}
function buildGrid(){const grid=$('weekGrid');const frag=document.createDocumentFragment();const mk=(tag,cls,txt)=>{const e=document.createElement(tag);e.className='cell '+cls;e.textContent=txt;return e;};frag.append(mk('div','head','Time'));days.forEach(d=>frag.append(mk('div','head',d)));for(let half=0;half<48;half++){const hh=String(Math.floor(half/2)).padStart(2,'0');frag.append(mk('div','time',availabilityTime(half)));for(let day=0;day<7;day++){const slot=day*48+half;const b=mk('button','', '');b.type='button';b.dataset.slot=slot;b.setAttribute('aria-label',`${days[day]} ${hh}:${half%2?'30':'00'}`);b.addEventListener('pointerdown',e=>{if(!s.avEditing||e.button!==0)return;dragging=true;suppressClick=true;paint=!s.slots.has(slot);if(paint)s.slots.add(slot);else s.slots.delete(slot);updateGrid();});b.addEventListener('focus',()=>showSlotInfo(slot));b.addEventListener('pointerenter',()=>{showSlotInfo(slot);if(s.avEditing&&dragging){if(paint)s.slots.add(slot);else s.slots.delete(slot);updateGrid();}});b.addEventListener('click',()=>{showSlotInfo(slot);if(!s.avEditing)return;if(suppressClick){suppressClick=false;return;}if(s.slots.has(slot))s.slots.delete(slot);else s.slots.add(slot);updateGrid();});frag.append(b);}}grid.append(frag);}window.addEventListener('pointerup',()=>{dragging=false;});buildGrid();
const routes=window.EsportsHubRoutes;
const signInReturnUrl=routes.home();
// Retain invitations across Clerk redirects, including social sign-in.
const pendingKey='eh_pending_invite';
let pendingInvite=new URL(location.href).searchParams.get('invite')||'';
try{if(pendingInvite)sessionStorage.setItem(pendingKey,pendingInvite);else pendingInvite=sessionStorage.getItem(pendingKey)||'';}catch{}
function authReturnUrl(){return routes.home({invite:pendingInvite});}
let signInMounted=false,signUpMounted=false,accepting=false,inviteDetails=null;
function unmountClerk(){
  if(signInMounted){window.Clerk.unmountSignIn($('clerk-sign-in'));signInMounted=false;}
  if(signUpMounted){window.Clerk.unmountSignUp($('clerk-sign-up'));signUpMounted=false;}
}
function activeClerkSession(){return !!window.Clerk?.user&&window.Clerk?.session?.status==='active';}
function currentAuthMode(){return new URL(location.href).searchParams.get('auth')==='signup'?'signup':'signin';}
function mountClerk(){
 if(!s.clerkReady||activeClerkSession())return;
 const mode=currentAuthMode(),signup=mode==='signup',returnUrl=authReturnUrl();
 $('authCard').classList.toggle('hidden',signup);$('signUpCard').classList.toggle('hidden',!signup);
 document.title=(signup?'Create account':'Sign in')+' | EsportsHub';$('authSignInTab').setAttribute('aria-pressed',String(!signup));$('authSignUpTab').setAttribute('aria-pressed',String(signup));
 if(signup&&signInMounted){window.Clerk.unmountSignIn($('clerk-sign-in'));signInMounted=false;}
 if(!signup&&signUpMounted){window.Clerk.unmountSignUp($('clerk-sign-up'));signUpMounted=false;}
 const options={...routes.clerkOptions(returnUrl,pendingInvite),routing:'hash',forceRedirectUrl:returnUrl,fallbackRedirectUrl:returnUrl,appearance:{elements:{rootBox:{width:'100%',maxWidth:'100%'},cardBox:{width:'100%',maxWidth:'100%'},card:{width:'100%',maxWidth:'100%'},formFieldInput:{fontSize:'16px'}}}};
 try{
  if(signup&&!signUpMounted){window.Clerk.mountSignUp($('clerk-sign-up'),options);signUpMounted=true;}
  if(!signup&&!signInMounted){window.Clerk.mountSignIn($('clerk-sign-in'),{...options,withSignUp:true});signInMounted=true;}
  $(signup?'signUpLoading':'signInLoading').textContent='';
 }catch(error){$(signup?'signUpLoading':'signInLoading').textContent='Unable to load authentication: '+error.message;}
}
function showGuest(msg){s.notifications=null;s.notificationsAt=0;s.notificationRequest=(s.notificationRequest||0)+1;document.querySelectorAll('.eh-coordination').forEach(d=>d.close());clearProfileReads();clearProfileDraft();stopLivePresence();if($('onboardingDialog')?.open)$('onboardingDialog').close();if($('profileDialog')?.open)$('profileDialog').close();$('accountMiniProfile').replaceChildren();s.me=null;s.team=null;activeViewRole='';assignedRoles=[];renderRoleSelector();setAccountMenu(false);$('loginPage').classList.remove('hidden');$('dashboardShell').classList.add('hidden');$('guest').classList.remove('hidden');$('signed').classList.add('hidden');$('logout').classList.add('hidden');$('authStatus').textContent='Sign in required';$('sidebarName').textContent='Not signed in';$('sidebarRole').textContent='Clerk authentication';$('guestNotice').textContent=msg||'';$('accountRecovery').classList.toggle('hidden',!window.Clerk?.user||!msg);$('accountRecoveryStatus').textContent=msg||'';mountClerk();}
function resetInvite(){pendingInvite='';inviteDetails=null;try{sessionStorage.removeItem(pendingKey);}catch{}const url=new URL(location.href);url.searchParams.delete('invite');history.replaceState(null,'',url.href);$('invitationCard').classList.add('hidden');}
async function showInvitation(){
  showGuest();unmountClerk();$('authCard').classList.add('hidden');$('signUpCard').classList.add('hidden');$('invitationCard').classList.remove('hidden');$('inviteAuthButtons').classList.add('hidden');$('acceptInvite').classList.add('hidden');$('invitationStatus').textContent='Checking your invitation…';
  $('invitationAccount').textContent='Signed in as '+(window.Clerk.user.primaryEmailAddress?.emailAddress||window.Clerk.user.fullName||'your Clerk account');
  try{
    await api('/me');
    inviteDetails=await api('/invites/preview','POST',{inviteToken:pendingInvite});
    $('invitationStatus').textContent=`Join ${inviteDetails.teamName||inviteDetails.gameName||'EsportsHub'} as ${inviteDetails.role.replaceAll('_',' ')}. ${inviteDetails.remainingUses} place(s) remaining. Expires ${fmt(inviteDetails.expiresAt)}.`;
    $('acceptInvite').classList.remove('hidden');
  }catch(e){$('invitationStatus').textContent=e.message;}
}
function chooseAuth(mode){
 if(activeClerkSession())return;
 const nextMode=mode==='signup'?'signup':'signin';
 if(nextMode!==currentAuthMode()){
  unmountClerk();const url=new URL(location.href);url.searchParams.set('auth',nextMode);url.hash='';history.replaceState(null,'',url.href);
 }
 mountClerk();
}
$('authSignInTab').onclick=()=>chooseAuth('signin');$('authSignUpTab').onclick=()=>chooseAuth('signup');
$('inviteSignIn').onclick=()=>chooseAuth('signin');
$('inviteSignUp').onclick=()=>chooseAuth('signup');
$('retryWorkspace').onclick=()=>{void renderAuth().catch(e=>showGuest(e.message));};
$('recoverySignOut').onclick=async()=>{await setOfflinePresence();await window.Clerk.signOut({redirectUrl:authReturnUrl()});};
$('enrollmentSignOut').onclick=async()=>{await setOfflinePresence();await window.Clerk.signOut({redirectUrl:authReturnUrl()});};
$('enrollmentForm').addEventListener('submit',async event=>{
  event.preventDefault();
  const value=$('enrollmentToken').value.trim();let token=value;
  try{token=new URL(value).searchParams.get('invite')||'';}catch{}
  if(!token){$('guestNotice').textContent='Paste a valid invitation link or token.';return;}
  pendingInvite=token;try{sessionStorage.setItem(pendingKey,token);}catch{}
  history.replaceState(null,'',routes.home({invite:token}));await renderAuth();
});
$('invitationSwitch').onclick=async()=>{await setOfflinePresence();await window.Clerk.signOut({redirectUrl:authReturnUrl()});};
$('invitationCancel').onclick=async()=>{resetInvite();$('authCard').classList.remove('hidden');$('signUpCard').classList.remove('hidden');await renderAuth();};
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
    if(!activeClerkSession()){
      $('authCard').classList.remove('hidden');$('signUpCard').classList.remove('hidden');$('invitationCard').classList.toggle('hidden',!pendingInvite);$('inviteAuthButtons').classList.remove('hidden');$('acceptInvite').classList.add('hidden');$('invitationSwitch').classList.add('hidden');$('invitationAccount').textContent='';
      $('invitationStatus').textContent='You have been invited to EsportsHub. Create an account or sign in, then review and accept your invitation.';showGuest();return;
    }
    unmountClerk();$('invitationSwitch').classList.remove('hidden');
    if(pendingInvite){await showInvitation();return;}
    try{await refresh();}catch(e){$('authCard').classList.add('hidden');$('signUpCard').classList.add('hidden');showGuest(e.message);if(e.status===403){$('enrollmentCard').classList.remove('hidden');$('guestNotice').textContent='Your account is signed in. Accept an invitation from your captain or manager to join a team.';}}
  }finally{s.rendering=false;if(s.authQueued){s.authQueued=false;void renderAuth();}}
}
let authStarted=false;async function startAuthentication(){if(authStarted)return;authStarted=true;let authTimeout;try{if(!window.Clerk)throw Error('Clerk script did not load. Reload the page or check browser content blocking.');await Promise.race([window.Clerk.load({...routes.clerkOptions(authReturnUrl(),pendingInvite),signInForceRedirectUrl:authReturnUrl(),signInFallbackRedirectUrl:authReturnUrl(),signUpForceRedirectUrl:authReturnUrl(),signUpFallbackRedirectUrl:authReturnUrl(),...(window.__internal_ClerkUICtor?{ui:{ClerkUI:window.__internal_ClerkUICtor}}:{})}),new Promise((_,reject)=>{authTimeout=setTimeout(()=>reject(Error('Sign-in timed out. Reload the page and check whether Clerk requests are blocked.')),20000);})]);s.clerkReady=true;clearTimeout(authTimeout);window.Clerk.addListener(()=>{void renderAuth().catch(e=>{showGuest(e.message);});});await renderAuth();}catch(e){clearTimeout(authTimeout);$('signInLoading').textContent='Unable to load sign-in: '+e.message;$('signUpLoading').textContent='Unable to load sign-up: '+e.message;notify('Unable to start Clerk: '+e.message,true);showGuest(e.message);}}
if(document.readyState==='complete')setTimeout(startAuthentication,0);else window.addEventListener('load',startAuthentication,{once:true});

// Profile editing (name, username, picture) through Clerk.
function fillProfileBasics(){const u=window.Clerk?.user;if(!u)return;showAvatars();$('pfFirst').value=u.firstName||'';$('pfLast').value=u.lastName||'';$('pfUser').value='';$('pfEmail').textContent=u.primaryEmailAddress?.emailAddress||'';}
function showAvatars(){
  const u=window.Clerk?.user;if(!u)return;
  const full=[u.firstName,u.lastName].filter(Boolean).join(' ')||'Member';
  const initials=full.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
  [$('pfAvatarPreview'),$('sidebarAvatar')].forEach(el=>{
    el.replaceChildren();
    if(u.hasImage&&trustedAvatar(u.imageUrl)){const i=document.createElement('img');i.alt='';i.referrerPolicy='no-referrer';i.src=u.imageUrl;i.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';el.append(i);}
    else el.textContent=initials;
  });
}
$('pfAvatar').addEventListener('change',()=>{
  const f=$('pfAvatar').files[0];if(!f)return;
  const i=document.createElement('img');i.alt='';i.src=URL.createObjectURL(f);i.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';
  $('pfAvatarPreview').replaceChildren(i);
});
const errMsg=err=>err?.errors?.[0]?.longMessage||err?.message||'failed';
$('profileForm').addEventListener('submit',async e=>{
  e.preventDefault();const u=window.Clerk?.user;if(!u||s.profileSaving)return;s.profileSaving=true;s.profileDirty=true;setProfileInputsDisabled(true);
  const btn=$('pfSave'),status=$('pfStatus');btn.disabled=true;status.textContent='Saving…';
  const problems=[];
  try{await u.update({firstName:$('pfFirst').value.trim(),lastName:$('pfLast').value.trim()});}
  catch(err){problems.push('Name: '+errMsg(err));}
  const f=$('pfAvatar').files[0];
  if(f){
    if(f.size>10*1024*1024)problems.push('Picture: file is over 10 MB');
    else{try{await u.setProfileImage({file:f});$('pfAvatar').value='';}catch(err){problems.push('Picture: '+errMsg(err));}}
  }
  const bf=$('pfBannerFile').files[0];
  if(bannerValue()==='upload'&&bf){try{await uploadBanner(bf);$('pfBannerFile').value='';}catch(err){problems.push('Banner: '+errMsg(err));}}
  try{await saveAppProfile();}catch(err){problems.push(err.message);}
  try{await u.reload();}catch{}
  const full=[u.firstName,u.lastName].filter(Boolean).join(' ')||'Member';
  $('sidebarName').textContent=full;if(s.me)s.me.user.name=full;updateDashboardGreeting();
  showAvatars();
  status.textContent=problems.length?'Some changes did not save: '+problems.join(' · '):'Profile saved.';
  s.profileSaving=false;setProfileInputsDisabled(false);btn.disabled=false;if(!problems.length){s.profileDirty=false;await fillProfile(true);}updateProfileDraftNotice();
});
$('pfManage').onclick=()=>window.Clerk?.openUserProfile?.();

// ---- Extended profile: main game, per-game usernames, banner ----
const BANNERS={theme:'linear-gradient(135deg,#501d83,#b095de)',purple:'linear-gradient(135deg,#6326a6,#bd94ed)',sunset:'linear-gradient(135deg,#f12711,#f5af19)',ocean:'linear-gradient(135deg,#1c92d2,#2af598)',forest:'linear-gradient(135deg,#134e5e,#71b280)',night:'linear-gradient(135deg,#0f2027,#2c5364)'};
function applyBanner(el,value){
  el.dataset.themeBanner=String(value==='preset:theme');
  el.style.backgroundImage=BANNERS.purple;
  if(typeof value==='string'&&value.startsWith('preset:')&&BANNERS[value.slice(7)])el.style.backgroundImage=BANNERS[value.slice(7)];
}
function bannerValue(){return $('pfBanner').value==='custom'?'preset:purple':$('pfBanner').value;}
const bannerCache={};
async function bannerBlobUrl(userId){
  if(bannerCache[userId])return bannerCache[userId];
  const token=await window.Clerk?.session?.getToken();
  const r=await fetch(apiUrl('/banner/'+encodeURIComponent(userId)),{redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('No banner ('+r.status+')');
  return bannerCache[userId]=URL.createObjectURL(await r.blob());
}
async function applyBannerFor(el,value,userId,isCurrent=()=>true){
  applyBanner(el,value);
  if(value!=='upload')return null;
  try{const url=await bannerBlobUrl(userId);if(!isCurrent())return null;el.style.backgroundImage='url("'+url+'")';return url;}catch{return null;}
}
async function uploadBanner(f){
  if(f.size>4*1024*1024)throw Error('Banner is over 4 MB');
  const token=await window.Clerk?.session?.getToken();
  const r=await fetch(apiUrl('/me/banner'),{method:'PUT',redirect:'error',credentials:'omit',referrerPolicy:'no-referrer',headers:{Authorization:'Bearer '+token,'Content-Type':f.type||'application/octet-stream'},body:f});
  const d=await r.json().catch(()=>({}));if(!r.ok)throw Error(d.error||'Banner upload failed ('+r.status+')');
  delete bannerCache[s.me.user.id];
}
function refreshBannerPreview(){
  const v=$('pfBanner').value,f=$('pfBannerFile').files[0];
  $('pfBannerUrlWrap').classList.toggle('hidden',v!=='custom');$('pfBannerFileWrap').classList.toggle('hidden',v!=='upload');
  if(v==='upload'){if(f)$('pfBannerPreview').style.backgroundImage='url("'+URL.createObjectURL(f)+'")';else if(s.me)applyBannerFor($('pfBannerPreview'),'upload',s.me.user.id);}
  else applyBanner($('pfBannerPreview'),bannerValue());
}
$('pfBanner').addEventListener('change',refreshBannerPreview);$('pfBannerFile').addEventListener('change',refreshBannerPreview);$('pfBannerUrl').addEventListener('input',refreshBannerPreview);
async function fillProfile(force=false){
  if(!s.me||s.profileSaving||(!force&&s.profileDirty))return false;const owner=s.me.user.id,editVersion=s.profileEditVersion||0,request=(s.profileLoadId||0)+1;s.profileLoadId=request;
  let prof;try{prof=await api('/profile/'+encodeURIComponent(owner));}catch(error){notify('Profile could not refresh: '+error.message,true);return false;}
  if(s.me?.user.id!==owner||s.profileLoadId!==request||(s.profileEditVersion||0)!==editVersion||s.profileSaving||(!force&&s.profileDirty))return false;
  fillProfileBasics();
  const games=s.games||[];
  $('pfMain').innerHTML='<option value="">None</option>'+games.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('');
  $('pfGames').innerHTML=games.length?games.map(g=>`<label>${escapeHtml(g.name)}<input data-game="${escapeHtml(g.id)}" maxlength="64" placeholder="Username in ${escapeHtml(g.name)}"/></label>`).join(''):'No games available yet.';
  fillCustomization(prof.customization);$('pfDashboardDisplay').value=s.me.user.dashboard_display||'name';$('pfDiscord').value=prof.discord_username||'';$('pfMain').value=prof.main_game_id||'';$('pfUser').value=prof.username||'';
  (prof.game_usernames||[]).forEach(x=>{const i=$('pfGames').querySelector(`[data-game="${CSS.escape(String(x.game_id))}"]`);if(i)i.value=x.username;});
  const b=prof.banner||'preset:purple';
  if(b.startsWith('https://')){$('pfBanner').value='preset:purple';}else if(b==='upload')$('pfBanner').value='upload';else $('pfBanner').value=BANNERS[b.slice(7)]?b:'preset:purple';
  refreshBannerPreview();renderProfilePreview();s.profileDirty=false;s.profileOwner=owner;updateProfileDraftNotice();return true;
}
async function saveAppProfile(){
  const game_usernames={};$('pfGames').querySelectorAll('input[data-game]').forEach(i=>{const v=i.value.trim();if(v)game_usernames[i.dataset.game]=v;});
  try{await api('/me/profile','PUT',{customization:customizationFields(),dashboard_display:$('pfDashboardDisplay').value,discord_username:$('pfDiscord').value.trim(),username:$('pfUser').value.trim(),main_game_id:$('pfMain').value||null,banner:bannerValue()||'preset:purple',game_usernames});}
  catch(e){throw Error('Game profile: '+e.message);}
  loadedCustomization=customizationFields();$('pfStatusExpiry').value='never';if(s.me){s.me.user.username=$('pfUser').value.trim();s.me.user.dashboard_display=$('pfDashboardDisplay').value;updateDashboardGreeting();if(s.team)await selectTeam(s.team);if(admin())await loadMemberDirectory();}

}
// ---- View another member's profile (Discord-style card) ----
const PRESET_COLORS={purple:'#6326a6',sunset:'#f12711',ocean:'#1c92d2',forest:'#2f7a5a',night:'#2c5364'};
function sampleColor(url){return new Promise(res=>{if(!url)return res(null);const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.drawImage(img,0,0,8,8);const d=x.getImageData(0,0,8,8).data;let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}res(`rgb(${r/n|0},${g/n|0},${b/n|0})`);}catch{res(null);}};img.onerror=()=>res(null);img.src=url;});}
async function profileColor(banner,avatar){
  if(typeof banner==='string'&&banner.startsWith('preset:'))return PRESET_COLORS[banner.slice(7)]||PRESET_COLORS.purple;
  return (typeof banner==='string'&&banner.startsWith('blob:')?await sampleColor(banner):null)||PRESET_COLORS.purple;
}
const pd=$('profileDialog');$('pdClose').onclick=()=>pd.close();
pd.addEventListener('click',e=>{if(e.target===pd)pd.close();});
function trustedAvatar(url){try{const u=new URL(url);return u.protocol==='https:'&&!u.username&&!u.password&&!u.port&&['img.clerk.com','images.clerk.dev'].includes(u.hostname);}catch{return false;}}
function setAvatar(url,name){
  const el=$('pdAvatar');el.replaceChildren();
  if(trustedAvatar(url)){const i=document.createElement('img');i.alt='';i.referrerPolicy='no-referrer';i.src=url;i.onerror=()=>{el.replaceChildren(document.createTextNode(initials));};el.append(i);}
  const initials=(name||'?').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
  if(!el.firstChild)el.textContent=initials;
}
document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-profile]');if(!btn)return;
  const {profile:uid,name,role}=btn.dataset;pd.dataset.profileUser=uid;pd.classList.add('eh-profile-full');setAccountMenu(false);$('pdEdit').classList.toggle('hidden',uid!==s.me?.user?.id);
  pd.style.removeProperty('--pc');showCustomization({name,customization:{}});
  $('pdName').textContent=name;$('pdMeta').textContent='';$('pdRole').textContent=roleLabel(role);
  $('pdMain').textContent='';$('pdGames').textContent='';$('pdDiscord').textContent='';$('pdNote').textContent='Loading…';
  applyBanner($('pdBanner'),'preset:purple');setAvatar(null,name);$('pdMainWrap').classList.add('hidden');
  pd.showModal();updateTabTitle();
  try{
    const p=await api('/profile/'+encodeURIComponent(uid));if(!pd.open||pd.dataset.profileUser!==uid)return;
    $('pdName').textContent=p.name||name;
    $('pdMeta').textContent=p.username?'@'+p.username:'';$('pdDiscord').textContent=p.discord_username||'Not provided';
    setAvatar(p.image_url,p.name||name);
    void applyBannerFor($('pdBanner'),p.banner,uid,()=>pd.open&&pd.dataset.profileUser===uid);
    const main=(s.games.find(g=>g.id===p.main_game_id)||{}).name||p.main_game_name;
    $('pdMain').textContent=main||'';$('pdMainWrap').classList.toggle('hidden',!main);
    const list=(p.game_usernames||[]).map(x=>`<div class="eh-ign"><span>${escapeHtml(x.game_name||'Game')}</span><strong>${escapeHtml(x.username)}</strong></div>`).join('');
    $('pdGames').innerHTML=list||'<span class="eh-muted">None added yet.</span>';$('pdNote').textContent='';
    pd.style.setProperty('--pc',PRESET_COLORS[(p.banner||'').replace('preset:','')]||PRESET_COLORS.purple);showCustomization(p);updateTabTitle();
  }catch(err){$('pdNote').textContent='Could not load full profile: '+err.message;}
});
// ---- Admin: reorder teams ----
function arrangedTeams(teams,ids){if(ids.length!==teams.length||new Set(ids).size!==ids.length)return null;const byId=new Map(teams.map(t=>[t.id,t]));return ids.every(id=>byId.has(id))?ids.map(id=>byId.get(id)):null;}
async function saveTeamArrangement(ids,focusId){
 if(!admin()||s.teamOrderSaving)return;const ordered=arrangedTeams(s.teams,ids);if(!ordered)return;
 const previous=[...s.teams];if(previous.every((t,i)=>t.id===ids[i]))return;s.teamOrderSaving=true;s.teams=ordered;renderTeams();
 try{await api('/teams/order','PUT',{ids});renderDashboard();renderDefaultTeamSettings();notify('Team order saved.');}
 catch(error){s.teams=previous;notify('Could not save team order: '+error.message,true);}
 finally{s.teamOrderSaving=false;renderTeams();if(focusId){const handle=[...$('teamsMirror').querySelectorAll('[data-drag-team]')].find(h=>h.dataset.dragTeam===focusId);handle?.focus();}}
}
function beginTeamDrag(event,row,handle,list){
 if(event.button!==0||!admin()||s.teamOrderSaving)return;event.preventDefault();
 const original=s.teams.map(t=>t.id),id=event.pointerId;let moved=false;
 handle.setPointerCapture(id);row.classList.add('eh-team-dragging');handle.setAttribute('aria-pressed','true');
 const move=e=>{if(e.pointerId!==id)return;const target=document.elementFromPoint(e.clientX,e.clientY)?.closest('.eh-team-sort-row');if(!target||target===row||target.parentElement!==list)return;const rect=target.getBoundingClientRect();list.insertBefore(row,e.clientY<rect.top+rect.height/2?target:target.nextSibling);moved=true;};
 const finish=e=>{if(e.pointerId!==id)return;handle.removeEventListener('pointermove',move);handle.removeEventListener('pointerup',finish);handle.removeEventListener('pointercancel',cancel);handle.removeEventListener('lostpointercapture',cancel);row.classList.remove('eh-team-dragging');handle.removeAttribute('aria-pressed');if(handle.hasPointerCapture(id))handle.releasePointerCapture(id);if(moved){const ids=[...list.querySelectorAll('.eh-team-sort-row')].map(r=>r.dataset.teamId);void saveTeamArrangement(ids,row.dataset.teamId);}};
 const cancel=e=>{if(e.pointerId!==id)return;moved=false;finish(e);renderTeams();};
 handle.addEventListener('pointermove',move);handle.addEventListener('pointerup',finish);handle.addEventListener('pointercancel',cancel);handle.addEventListener('lostpointercapture',cancel);
}

// ---- Schedule: date-sorted list + month calendar ----
s.events=[];
s.schedView=(()=>{try{return localStorage.getItem('eh_sched_view')||'list';}catch{return 'list';}})();
s.calMonth=easternWallDate(new Date());s.calMonth.setDate(1);s.calSel=null;
const schEl=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const schDay=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const schTime=d=>d.toLocaleTimeString('en-US',{timeZone:EASTERN_ZONE,hour:'numeric',minute:'2-digit',hour12:true,timeZoneName:'short'});
const schType=t=>String(t||'event').replace(/[^a-z]/g,'')||'event';
function schCard(e){
 const c=schEl('article','eh-item sch-card sch-'+schType(e.type));
 const rail=schEl('div','sch-time-rail');rail.append(schEl('span','sch-time',e.d.toLocaleTimeString('en-US',{timeZone:EASTERN_ZONE,hour:'numeric',minute:'2-digit',hour12:true})),schEl('small','',new Intl.DateTimeFormat('en-US',{timeZone:EASTERN_ZONE,timeZoneName:'short'}).formatToParts(e.d).find(p=>p.type==='timeZoneName')?.value||'Eastern'));
 const body=schEl('div','sch-card-body'),top=schEl('div','sch-top');top.append(schEl('span','sch-type',roleLabel(e.type||'event')));
 if(e._team)top.append(schEl('span','eh-schedule-team',`${e._team.name} · ${e._team.game_name}`));
 body.append(top,schEl('h3','sch-event-title',e.title));if(e.opponent)body.append(schEl('p','sch-opponent','vs '+e.opponent));
 if(e.notes){const notes=schEl('details','sch-event-notes');notes.append(schEl('summary','','Event notes'));const text=schEl('div','eh-rich-notes');text.innerHTML=formatNotes(e.notes);notes.append(text);body.append(notes);}
 const resultHost=schEl('div','');appendEventResult(resultHost,e);const result=resultHost.querySelector('.eh-event-result');
 const footer=schEl('div','sch-card-actions');appendEventPlan(footer,e);appendEventAttendance(footer,e);
 const management=schEl('details','sch-manage'),actions=schEl('div','sch-manage-actions');management.append(schEl('summary','','Manage event'));
 if(result){for(const button of [...result.querySelectorAll('button')])actions.append(button);const message=result.querySelector('.eh-result-sync-message');if(message)actions.append(message);body.append(result);}
 if(e._team){const open=schEl('button','eh-btn tiny sch-secondary','Open team schedule');open.type='button';open.onclick=async()=>{open.disabled=true;try{s.scheduleScope='';await selectTeam(e._team);go('schedule');}catch(error){notify(error.message,true);}finally{open.disabled=false;}};footer.append(open);}
 if(!e._team&&s.team&&managesTeam(s.team)){const edit=schEl('button','eh-btn tiny','Edit event');edit.type='button';edit.onclick=()=>openTeamEditor('events',e);const remove=schEl('button','eh-btn tiny eh-delete-event','Delete event');remove.type='button';remove.onclick=()=>deleteTeamEvent(e,remove);actions.append(edit,remove);}
 if(actions.children.length){management.append(actions);footer.append(management);}
 body.append(footer);c.append(rail,body);return c;
}
function schList(box,evs){
  if(!evs.length){box.append(schEl('div','sch-empty','No events match this view. Try another team, event type, or search.'));return;}
  const today=new Date();today.setHours(0,0,0,0);
  const todayKey=easternDay(new Date());const up=evs.filter(e=>easternDay(e.d)>=todayKey),past=evs.filter(e=>easternDay(e.d)<todayKey).reverse();
  const group=arr=>{const f=document.createDocumentFragment();let last='';arr.forEach(e=>{const k=easternDay(e.d);if(k!==last){last=k;const heading=schEl('h3','sch-day',e.d.toLocaleDateString('en-US',{timeZone:EASTERN_ZONE,weekday:'long',month:'long',day:'numeric',year:'numeric'}));if(k===todayKey)heading.append(schEl('span','sch-today-label','Today'));f.append(heading);}f.append(schCard(e));});return f;};
  box.append(up.length?group(up):schEl('p','eh-muted','No upcoming events.'));
  if(past.length){const d=schEl('details','sch-past');d.append(schEl('summary','',`Past events (${past.length})`),group(past));box.append(d);}
}
function schCalendar(box,evs){
  const m=s.calMonth,y=m.getFullYear(),mo=m.getMonth(),now=easternWallDate(new Date()),todayKey=schDay(now);
  if(!s.calSel)s.calSel=todayKey;
  const head=schEl('div','sch-calhead');
  const btn=(label,aria,fn)=>{const b=schEl('button','eh-btn',label);b.type='button';b.setAttribute('aria-label',aria);b.onclick=fn;return b;};
  head.append(btn('‹','Previous month',()=>{s.calMonth=new Date(y,mo-1,1);renderSchedule();}),
    schEl('strong','',m.toLocaleDateString(undefined,{month:'long',year:'numeric'})),
    btn('Today','Go to today',()=>{s.calMonth=new Date(now.getFullYear(),now.getMonth(),1);s.calSel=todayKey;renderSchedule();}),
    btn('›','Next month',()=>{s.calMonth=new Date(y,mo+1,1);renderSchedule();}));
  const byDay={};evs.forEach(e=>{(byDay[easternDay(e.d)]=byDay[easternDay(e.d)]||[]).push(e);});
  const grid=schEl('div','sch-grid');
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>grid.append(schEl('div','sch-dow',d)));
  const first=new Date(y,mo,1),weeks=Math.ceil((first.getDay()+new Date(y,mo+1,0).getDate())/7);
  for(let i=0;i<weeks*7;i++){
    const d=new Date(y,mo,1-first.getDay()+i),k=schDay(d),list=byDay[k]||[];
    const cell=schEl('button','sch-cell'+(d.getMonth()!==mo?' other':'')+(k===todayKey?' today':'')+(k===s.calSel?' sel':''));
    cell.type='button';cell.setAttribute('aria-label',d.toLocaleDateString(undefined,{dateStyle:'full'})+', '+list.length+' events');
    cell.append(schEl('span','sch-num',String(d.getDate())));
    list.slice(0,3).forEach(e=>cell.append(schEl('span','sch-chip sch-'+schType(e.type),schTime(e.d)+' '+(e._team?e._team.name+' · ':'')+e.title)));
    if(list.length>3)cell.append(schEl('span','sch-more','+'+(list.length-3)+' more'));
    cell.onclick=()=>{s.calSel=k;const di=document.querySelector('#eventForm [name=date]');if(di)di.value=k;renderSchedule();};
    grid.append(cell);
  }
  box.append(head,grid);
  const [sy,sm,sd]=s.calSel.split('-').map(Number),view=schEl('div','sch-dayview');
  view.append(schEl('h3','sch-day',new Date(sy,sm-1,sd).toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})));
  const todays=byDay[s.calSel]||[];
  if(todays.length)todays.forEach(e=>view.append(schCard(e)));else view.append(schEl('p','eh-muted','No events this day.'));
  box.append(view);
}
function renderSchedule(){
  if(location.hash==='#schedule')updateTabTitle('schedule');
  const box=$('events');box.replaceChildren();
  const bar=schEl('div','sch-bar');
  const teamLabel=schEl('label','eh-schedule-filter','Team '),teamSelect=document.createElement('select');teamSelect.setAttribute('aria-label','Schedule team filter');
  if((s.teams||[]).length>1){const all=document.createElement('option');all.value='all';all.textContent='All teams';teamSelect.append(all);}
  for(const team of s.teams||[]){const option=document.createElement('option');option.value=team.id;option.textContent=`${team.name} · ${team.game_name}`;teamSelect.append(option);}
  teamSelect.value=s.scheduleScope==='all'&&s.teams.length>1?'all':s.team?.id||'';teamSelect.disabled=!s.teams.length;
  teamSelect.onchange=async()=>{teamSelect.disabled=true;try{if(teamSelect.value==='all'){s.scheduleScope='all';s.scheduleAllEvents=null;await loadAllScheduleEvents();}else{const team=s.teams.find(t=>t.id===teamSelect.value);s.scheduleRequest=(s.scheduleRequest||0)+1;s.scheduleLoading=false;s.scheduleScope='';if(team)await selectTeam(team);}}catch(error){notify(error.message,true);renderSchedule();}finally{teamSelect.disabled=!s.teams.length;}};teamLabel.append(teamSelect);bar.append(teamLabel);
  const viewToggle=schEl('div','sch-view-toggle');viewToggle.setAttribute('aria-label','Schedule view');
  [['list','Agenda'],['calendar','Calendar']].forEach(([v,label])=>{
    const b=schEl('button','eh-btn',label);b.type='button';b.setAttribute('aria-pressed',String(s.schedView===v));
    b.onclick=()=>{s.schedView=v;try{localStorage.setItem('eh_sched_view',v);}catch{}renderSchedule();};viewToggle.append(b);
  });
  bar.append(viewToggle);
  box.append(bar);
  const all=s.scheduleScope==='all'&&(s.teams||[]).length>1;
  $('eventForm').classList.toggle('hidden',all||!s.team||!managesTeam(s.team));
  $('scheduleCreate').classList.toggle('hidden',all||!s.team||!managesTeam(s.team));
  if(!all&&s.team&&managesTeam(s.team)){const create=schEl('button','eh-btn sch-create-button','+ Create event');create.type='button';create.onclick=()=>{$('scheduleCreate').open=true;$('eventForm').scrollIntoView({behavior:'smooth',block:'center'});$('eventForm').elements.title.focus();};bar.append(create);}
  if(all&&!s.scheduleAllEvents&&!s.scheduleLoading){void loadAllScheduleEvents();return;}
  if(all&&s.scheduleLoading){box.append(schEl('p','eh-muted','Loading schedules for all teams…'));return;}
  if(all){box.append(schEl('p','eh-muted','Showing all accessible teams. Open a team schedule to create or edit its events.'));if(s.scheduleErrors?.length){const warning=schEl('p','eh-alert',`Could not load: ${s.scheduleErrors.join(', ')}. The combined schedule is incomplete.`),retry=schEl('button','eh-btn tiny','Retry');retry.type='button';retry.onclick=()=>{s.scheduleAllEvents=null;void loadAllScheduleEvents();};box.append(warning,retry);}}
  const evs=(all?s.scheduleAllEvents||[]:s.events||[]).map(e=>({...e,d:new Date(e.starts_at)})).filter(e=>!isNaN(e.d)).sort((a,b)=>a.d-b.d);
  const upcoming=evs.filter(e=>e.d>=new Date()&&!['final','cancelled','postponed'].includes(e.result_status)&&!String(e.title).startsWith('[Cancelled]'));
  const overview=schEl('div','sch-overview');for(const [value,label] of [[upcoming.filter(e=>e.d-Date.now()<7*86400000).length,'in the next 7 days'],[upcoming.filter(e=>e.type==='match').length,upcoming.filter(e=>e.type==='match').length===1?'upcoming match':'upcoming matches'],[upcoming.filter(e=>['practice','scrim'].includes(e.type)).length,'practices & scrims']]){const metric=schEl('div','');metric.append(schEl('strong','',String(value)),schEl('span','',label));overview.append(metric);}box.append(overview);
  const filters=schEl('div','sch-filters'),search=document.createElement('input');search.type='search';search.placeholder='Search events or opponents';search.setAttribute('aria-label','Search events or opponents');search.value=s.scheduleSearch||'';
  const type=document.createElement('select');type.setAttribute('aria-label','Filter event type');for(const [value,label]of [['','All event types'],['match','Matches'],['scrim','Scrims'],['practice','Practices'],['event','Other events']]){const option=document.createElement('option');option.value=value;option.textContent=label;type.append(option);}type.value=s.scheduleType||'';filters.append(search,type);
  const count=schEl('p','sch-filter-count'),view=schEl('div','sch-results');box.append(filters,count,view);
  const draw=()=>{s.scheduleSearch=search.value;s.scheduleType=type.value;const query=search.value.trim().toLowerCase(),filtered=evs.filter(e=>(!type.value||e.type===type.value)&&(!query||[e.title,e.opponent,e.notes,e._team?.name].some(x=>String(x||'').toLowerCase().includes(query))));count.textContent=`${filtered.length} event${filtered.length===1?'':'s'} · All times Eastern (EST/EDT)`;view.replaceChildren();if(s.schedView==='calendar')schCalendar(view,filtered);else schList(view,filtered);};
  search.oninput=draw;type.onchange=draw;draw();
}


// Player-centered dashboard, roster, team availability and profile entry point.
function profileButton(m){const id=m.user_id||m.id||'',name=m.display_name||m.name||'Member',role=m.role||'player';return `<button type="button" class="eh-btn tiny" data-profile="${escapeHtml(id)}" data-name="${escapeHtml(name)}" data-role="${escapeHtml(role)}">Profile / contact</button>`;}
function dashboardData(now=new Date()){
 const players=[...new Map((s.teamMembers||[]).filter(m=>['captain','player'].includes(m.role)).map(m=>[String(m.user_id||m.id),m])).values()];
 const schedules=new Map((s.teamAvailability||[]).map(a=>[String(a.user_id),a]));
 const events=(s.events||[]).filter(e=>!isNaN(new Date(e.starts_at)));
 const upcoming=events.filter(e=>new Date(e.starts_at)>=now&&!['cancelled','postponed','final'].includes(e.result_status)&&!String(e.title).startsWith('[Cancelled]')).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at));
 const results=events.filter(e=>e.result_status==='final'&&e.team_score!=null&&e.opponent_score!=null).sort((a,b)=>new Date(b.starts_at)-new Date(a.starts_at)).slice(0,3);
 const submitted=players.filter(m=>schedules.has(String(m.user_id||m.id)));
 const missing=players.filter(m=>!schedules.has(String(m.user_id||m.id)));
 let atNext=[];if(upcoming[0]){const p=easternParts(upcoming[0].starts_at),date=new Date(`${p.year}-${p.month}-${p.day}T12:00:00Z`),day=(date.getUTCDay()+6)%7,slot=day*48+Number(p.hour)*2+(Number(p.minute)>=30?1:0);atNext=submitted.filter(m=>(schedules.get(String(m.user_id||m.id)).slots||[]).map(Number).includes(slot));}
 return {players,schedules,upcoming,results,submitted,missing,atNext};
}
function renderDashboard(){
 if(!$('dashNext'))return;const d=dashboardData(),next=d.upcoming[0],name=m=>m.display_name||m.name||'Team member',esc=escapeHtml;
 const picker=$('dashboardTeamSelect');picker.replaceChildren();for(const t of s.teams||[]){const o=document.createElement('option');o.value=t.id;o.textContent=`${t.name} · ${t.game_name}`;picker.append(o);}picker.value=s.team?.id||'';picker.disabled=!(s.teams||[]).length;
 $('dashNext').innerHTML=next?`<h2 class="eh-next-title">${esc(next.title)}</h2><p class="eh-next-time">${esc(fmt(next.starts_at))}</p><div class="eh-next-meta"><span class="sch-type">${esc(roleLabel(next.type))}</span>${next.opponent?`<span>Opponent: <strong>${esc(next.opponent)}</strong></span>`:''}<span>${esc(s.team?.name||'')}</span></div>${next.notes?`<p class="eh-next-note">${esc(next.notes)}</p>`:''}`:`<h2 class="eh-next-title">${s.team?'No upcoming sessions':'Your team overview starts here'}</h2><p class="eh-muted">${s.team?'No future events are currently listed. Open Schedule to review past events or add a session.':'An administrator can assign you to a team, or you can accept a team invitation.'}</p>`;
 if(next){const tile=schEl('div','eh-next-date');tile.append(schEl('span','',new Date(next.starts_at).toLocaleDateString('en-US',{timeZone:EASTERN_ZONE,month:'short'})),schEl('strong','',new Date(next.starts_at).toLocaleDateString('en-US',{timeZone:EASTERN_ZONE,day:'numeric'})),schEl('small','',new Date(next.starts_at).toLocaleDateString('en-US',{timeZone:EASTERN_ZONE,weekday:'short'})));const content=schEl('div','eh-next-content');while($('dashNext').firstChild)content.append($('dashNext').firstChild);if(s.team)appendEventPlan(content,next);$('dashNext').append(tile,content);}

 const week=d.upcoming.filter(e=>new Date(e.starts_at)-Date.now()<=7*86400000).length;
 $('dashSummary').innerHTML=[['Next 7 days',String(week),week===1?'scheduled session':'scheduled sessions'],['Weekly availability',`${d.submitted.length} / ${d.players.length}`,'players submitted'],['Roster',String(d.players.length),'captains and players']].map(([label,value,note])=>`<div class="eh-panel"><span>${label}</span><strong>${value}</strong><small>${note}</small></div>`).join('');
 $('dashEvents').replaceChildren();for(const event of d.upcoming.slice(0,4)){const row=schEl('div','eh-upcoming-row'),date=schEl('div','eh-upcoming-date');date.append(schEl('strong','',new Date(event.starts_at).toLocaleDateString('en-US',{timeZone:EASTERN_ZONE,day:'numeric'})),schEl('small','',new Date(event.starts_at).toLocaleDateString('en-US',{timeZone:EASTERN_ZONE,month:'short'})));const info=schEl('div','eh-upcoming-info');info.append(schEl('strong','',event.title),schEl('small','',schTime(new Date(event.starts_at))+(event.opponent?' · vs '+event.opponent:'')));const open=schEl('button','eh-dashboard-open','View');open.type='button';open.setAttribute('aria-label','View '+event.title);const team=s.team;open.onclick=()=>openEventPlan(event,team);row.append(date,info,open);$('dashEvents').append(row);}if(!d.upcoming.length)$('dashEvents').append(schEl('p','eh-card-empty','No upcoming events for this team.'));

 const mine=d.schedules.get(String(s.me?.user?.id)),onRoster=d.players.some(m=>String(m.user_id||m.id)===String(s.me?.user?.id));
 $('dashAvailability').innerHTML=`<p><strong>${!onRoster?'Team weekly availability':mine?'Your weekly availability is saved.':'You have not submitted weekly availability.'}</strong></p>${next?`<p><strong>${d.atNext.length}</strong> of ${d.players.length} players marked available at the next session’s start.</p><p class="eh-muted">${d.atNext.length?esc(d.atNext.map(name).join(', ')):'No available players recorded for this slot.'}</p>`:''}<p class="eh-muted">${d.missing.length} player${d.missing.length===1?' has':'s have'} no submitted schedule.</p><p class="eh-dashboard-footnote">Based on recurring weekly half-hour slots in Eastern Time; this is not an RSVP.</p>`;
 const percentage=d.players.length?Math.round(d.submitted.length/d.players.length*100):0;const progress=document.createElement('progress');progress.max=Math.max(d.players.length,1);progress.value=d.submitted.length;progress.setAttribute('aria-label','Players who submitted weekly availability');$('dashAvailability').prepend(progress);const coverage=schEl('div','eh-availability-coverage');coverage.append(schEl('strong','',percentage+'%'),schEl('span','','weekly schedules submitted'));$('dashAvailability').prepend(coverage);
 $('dashResults').innerHTML=d.results.map(e=>{const win=e.team_score>e.opponent_score,outcome=win?'Win':e.team_score<e.opponent_score?'Loss':'Draw';return `<div class="eh-item eh-result-summary"><div><strong>${esc(e.opponent||e.title)}</strong><div class="eh-muted">${esc(fmt(e.starts_at))}</div></div><div><strong class="eh-result-${outcome.toLowerCase()}">${outcome} ${Number(e.team_score)}–${Number(e.opponent_score)}</strong><small>${e.result_source==='necc_page'?'NECC result':'Recorded result'}</small></div></div>`;}).join('')||'<p class="eh-muted">No final scores recorded yet. Results appear here once entered or synced.</p>';
 const reports=(s.teamReports||[]).slice().sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0)).slice(0,3);
 $('dashReports').innerHTML=reports.map(r=>`<div class="eh-item"><strong>${esc(r.title)}</strong><div class="eh-muted">${esc(roleLabel(r.type||'report'))} · ${esc(r.author||'')}${r.created_at?' · '+esc(fmt(r.created_at)):''}</div><div class="eh-note-preview">${formatNotes(r.content||'')}</div></div>`).join('')||'<p class="eh-muted">No shared coaching or scrim notes yet.</p>';
 const members=s.teamMembers||[],contacts=[...new Map(members.filter(m=>['captain','coach','team_manager','game_manager'].includes(m.role)).map(m=>[`${m.user_id||m.id}:${m.role}`,m])).values()];
 $('dashContacts').innerHTML=contacts.map(m=>`<div class="eh-contact"><div class="eh-roster-identity">${rosterAvatar(m)}<div><strong>${esc(name(m))}</strong><small>${esc(roleLabel(m.role))}</small></div></div>${profileButton(m)}</div>`).join('')||'<p class="eh-muted">No captain or manager contacts are visible for this team.</p>';
 loadRosterAvatars($('dashContacts'));
 const actions=[];if(s.team&&onRoster&&!mine)actions.push(['Submit your availability','Help your team find practice times.','availability']);if(s.team&&d.missing.length)actions.push([`${d.missing.length} missing weekly schedules`,d.missing.map(name).join(', '),'availability']);if(s.team&&!next)actions.push(['No upcoming sessions','Check the schedule with your captain or manager.','schedule']);if(!reports.length&&s.team)actions.push(['No shared team notes','Open Reports for scrim and VOD reviews.','reports']);
 $('dashActions').innerHTML=actions.map(([title,detail,page])=>`<div class="eh-item"><strong>${esc(title)}</strong><p class="eh-muted">${esc(detail)}</p><button class="eh-btn tiny" type="button" data-dashboard-go="${page}">Open ${roleLabel(page)}</button></div>`).join('')||`<p class="eh-muted">${s.team?'No missing schedules or upcoming-session gaps detected.':'Select or join a team to see relevant follow-ups.'}</p>`;
}

function renderRoster(){
 const target=$('members');if(!target)return;
 const oldSearch=target.querySelector('input[type=search]'),restoreSearch=oldSearch&&document.activeElement===oldSearch,selection=restoreSearch?[oldSearch.selectionStart,oldSearch.selectionEnd]:null;
 const members=s.teamMembers||[],can=!!s.team&&!!managesTeam(s.team);
 const captains=members.filter(m=>m.role==='captain');
 const others=members.filter(m=>m.role==='player');
 const subs=others.filter(m=>['sub','substitute'].includes(String(m.roster_status||m.lineup_status||m.position||'').toLowerCase()));
 const starters=others.filter(m=>!subs.includes(m));
 const group=(title,items)=>`<section class="eh-roster-group"><h3>${title} <span class="eh-muted">(${items.length})</span></h3>`+(items.map(m=>`<div class="eh-roster-member"><div class="eh-roster-identity">${rosterAvatar(m)}<div><div class="eh-member-name"><strong>${escapeHtml(m.display_name||m.name)}</strong><span class="eh-inline-username">${m.username?'@'+escapeHtml(m.username):'Username not set'}</span></div><div class="eh-muted">${escapeHtml(roleLabel(m.role||'player'))} · <span class="eh-live-presence" data-presence="${escapeHtml(m.presence||'offline')}">${escapeHtml(presenceLabel(m.presence||'offline'))}</span></div></div></div><div class="eh-roster-actions">${profileButton(m)}${can&&m.role==='player'?`<select aria-label="Lineup status for ${escapeHtml(m.display_name)}" data-lineup-user="${escapeHtml(m.user_id||m.id)}"><option value="starter" ${!subs.includes(m)?'selected':''}>Starter</option><option value="sub" ${subs.includes(m)?'selected':''}>Substitute</option></select>`:''}</div></div>`).join('')||'<p class="eh-muted">No members assigned yet.</p>')+'</section>';
 target.innerHTML=group('Captain',captains)+(members.some(m=>m.role==='coach')?group('Coaches',members.filter(m=>m.role==='coach')):'')+(members.some(m=>['team_manager','game_manager'].includes(m.role))?group('Team staff',members.filter(m=>['team_manager','game_manager'].includes(m.role))):'')+group('Players · Starters',starters)+group('Substitutes',subs);loadRosterAvatars(target);if(s.team){const team=s.team,history=schEl('button','eh-btn tiny',managesTeam(team)?'Team attendance history':'My attendance history');history.type='button';history.onclick=()=>openAttendanceHistory(team);const toolbar=schEl('div','eh-roster-toolbar'),search=document.createElement('input');search.type='search';search.placeholder='Find a player or staff member';search.setAttribute('aria-label','Search team roster');search.value=s.rosterQuery||'';toolbar.append(search,history);target.prepend(toolbar);
 const apply=()=>{s.rosterQuery=search.value;const query=search.value.trim().toLowerCase();let visible=0;target.querySelectorAll('.eh-roster-group').forEach(group=>{let matches=0;group.querySelectorAll('.eh-roster-member').forEach(row=>{const show=!query||row.querySelector('.eh-roster-identity').textContent.toLowerCase().includes(query);row.hidden=!show;if(show)matches++;});group.hidden=!!query&&!matches;visible+=matches;});empty.hidden=!query||visible>0;};
 const empty=schEl('p','eh-card-empty','No roster members match your search.');empty.hidden=true;target.append(empty);search.oninput=apply;apply();if(restoreSearch){search.focus({preventScroll:true});if(selection[0]!==null)search.setSelectionRange(...selection);}
 if($('teamRosterSummary')){const players=[...new Set(members.filter(m=>['player','captain'].includes(m.role)).map(m=>m.user_id||m.id))],online=[...new Set(members.filter(m=>m.presence==='online').map(m=>m.user_id||m.id))];$('teamRosterSummary').replaceChildren();for(const [value,label] of [[players.length,'Players'],[subs.length,'Substitutes'],[online.length,'Online']]){const metric=schEl('div','');metric.append(schEl('strong','',String(value)),schEl('small','',label));$('teamRosterSummary').append(metric);}}
 }

}
$('members').addEventListener('change',async e=>{
 const sel=e.target.closest('[data-lineup-user]');if(!sel||!s.team||!managesTeam(s.team))return;
 sel.disabled=true;try{
   // Requires Worker route with server-side role checks and membership update.
   await api(`/teams/${encodeURIComponent(s.team.id)}/lineup`,'PUT',{userId:sel.dataset.lineupUser,status:sel.value});
   await selectTeam(s.team);notify('Lineup updated.');
 }catch(err){sel.value=sel.value==='sub'?'starter':'sub';notify('Lineup could not be saved: '+err.message,true);}finally{sel.disabled=false;}
});
function renderTeamAvailability(){
 const entries=s.teamAvailability||[],memberNames=new Map((s.teamMembers||[]).map(m=>[String(m.user_id||m.id),m.display_name||m.name]));
 const list=$('availabilityMembers');if(!list)return;
 list.innerHTML=`<p class="eh-muted">${entries.length} saved teammate schedules. Darker slots indicate more people available.</p>`+entries.map(entry=>`<div class="eh-availability-person"><strong>${escapeHtml(memberNames.get(String(entry.user_id))||entry.display_name||'Team member')}</strong><span>${(Array.isArray(entry.slots)?entry.slots.length:0)/2} hours / week</span></div>`).join('');
 const players=[...new Map((s.teamMembers||[]).filter(m=>['player','captain'].includes(m.role)).map(m=>[m.user_id||m.id,m])).values()],submitted=players.filter(m=>entries.some(e=>e.user_id===(m.user_id||m.id))).length;
 $('availabilitySummary').replaceChildren();for(const [value,label]of [[submitted+' / '+players.length,'Schedules submitted'],[Math.max(0,players.length-submitted),'Not submitted'],[s.avEditing?s.slots.size/2:(entries.find(e=>e.user_id===s.me?.user.id)?.slots?.length||0)/2,'Your weekly hours']]){const metric=schEl('div','');metric.append(schEl('strong','',String(value)),schEl('small','',label));$('availabilitySummary').append(metric);}
 $('cancelAvailability').classList.toggle('hidden',!s.avEditing);document.querySelector('[data-panel="availability"]').classList.toggle('eh-availability-editing',!!s.avEditing);
 $('availabilityHeading').textContent=s.avEditing?'Editing my availability':'Team availability';
 $('editAvailability').textContent=s.avEditing?'Preview team availability':'Edit my availability';
 $('saveAvailability').classList.toggle('hidden',!s.avEditing);
 $('availabilityHint').textContent=s.avEditing?'Click or drag to select your available times. Save when finished.':'Team availability is view-only. Select Edit my availability to change your schedule.';
 const count=new Map();entries.forEach(a=>(a.slots||[]).forEach(k=>count.set(Number(k),(count.get(Number(k))||0)+1)));
 $('weekGrid').querySelectorAll('button[data-slot]').forEach(b=>{const n=count.get(Number(b.dataset.slot))||0;b.disabled=false;b.setAttribute('aria-readonly',String(!s.avEditing));b.classList.toggle('eh-heat',!s.avEditing&&n>0);b.style.setProperty('--heat',entries.length?String(.13+.7*n/entries.length):'0');b.title=availabilitySlotDetails(Number(b.dataset.slot));b.setAttribute('aria-label',b.title);});
 updateGrid();
}
$('editAvailability').addEventListener('click',()=>{s.avEditing=!s.avEditing;renderTeamAvailability();});
$('cancelAvailability').onclick=()=>{if(!s.me)return;const mine=(s.teamAvailability||[]).find(e=>e.user_id===s.me.user.id);s.slots=new Set((mine?.slots||[]).map(Number));s.avEditing=false;renderTeamAvailability();};
function showSlotInfo(slot){if($('availabilitySlotInfo'))$('availabilitySlotInfo').textContent=availabilitySlotDetails(slot);}


document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>go(b.dataset.jump));
$('accountProfile').addEventListener('click',()=>{setAccountMenu(false);if(!s.me)return;const m={user_id:s.me.user.id,display_name:s.me.user.name,role:s.me.roles?.[0]?.role||'player'};const b=document.createElement('button');b.dataset.profile=m.user_id;b.dataset.name=m.display_name;b.dataset.role=m.role;b.hidden=true;document.body.append(b);b.click();b.remove();});
$('pdEdit').addEventListener('click',()=>{pd.close();go('settings');setSettingsTab('profile');$('pfFirst').focus();});

function roleLabel(role){return String(role||'Member').replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());}
function rosterAvatar(m){const name=m.display_name||m.name||'Member';const initials=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('').toUpperCase();return `<span class="eh-roster-avatar" data-avatar-user="${escapeHtml(m.user_id||m.id)}" aria-hidden="true">${escapeHtml(initials)}</span>`;}
const rosterAvatarCache=new Map();
async function loadRosterAvatars(target){
 const cells=[...target.querySelectorAll('[data-avatar-user]')];
 // Limit profile requests to four at a time; cache successful results.
 let next=0;await Promise.all(Array.from({length:Math.min(4,cells.length)},async()=>{
  while(next<cells.length){const cell=cells[next++],id=cell.dataset.avatarUser;
   try{let url=rosterAvatarCache.get(id);if(url===undefined){const profile=await api('/profile/'+encodeURIComponent(id));url=profile.image_url||'';rosterAvatarCache.set(id,url);}
    if(!cell.isConnected||!url)continue;if(!trustedAvatar(url))continue;
    const img=document.createElement('img');img.alt='';img.referrerPolicy='no-referrer';img.src=url;img.loading='lazy';img.addEventListener('error',()=>img.remove());cell.append(img);
   }catch{/* Keep initials if a profile or picture is unavailable. */}
  }
 }));
}
function availabilitySlotDetails(slot){
 const half=slot%48,day=Math.floor(slot/48),time=availabilityTime;
 const schedules=new Map((s.teamAvailability||[]).map(x=>[String(x.user_id),new Set((x.slots||[]).map(Number))]));
 const unique=new Map((s.teamMembers||[]).filter(m=>['player','captain'].includes(m.role)).map(m=>[String(m.user_id||m.id),m]));
 const yes=[],no=[],unknown=[];
 for(const [id,m] of unique){const slots=schedules.get(id);(!slots?unknown:slots.has(slot)?yes:no).push(m.display_name||m.name||'Member');}
 return `${days[day]} ${time(half)}–${time(half+1)}\nCan play: ${yes.join(', ')||'None'}\nCannot play: ${no.join(', ')||'None'}\nNot submitted: ${unknown.join(', ')||'None'}`;
}

function availabilityTime(half){const hour=Math.floor(half/2)%24;return `${hour%12||12}:${half%2?'30':'00'} ${hour>=12?'PM':'AM'}`;}
function noteInline(text){return escapeHtml(text).replace(/\*\*([^*\n]+)\*\*/g,'<strong>$1</strong>').replace(/\*([^*\n]+)\*/g,'<em>$1</em>').replace(/~~([^~\n]+)~~/g,'<s>$1</s>');}
function formatNotes(text){
 let html='',list='';const close=()=>{if(list){html+=`</${list}>`;list='';}};
 for(const line of String(text||'').split('\n')){
  const bullet=line.match(/^\s*[-*•]\s+(.*)$/),number=line.match(/^\s*\d+[.)]\s+(.*)$/),heading=line.match(/^(#{1,3})\s+(.*)$/),quote=line.match(/^>\s?(.*)$/);
  if(bullet||number){const type=bullet?'ul':'ol';if(list!==type){close();html+=`<${type}>`;list=type;}html+=`<li>${noteInline((bullet||number)[1])}</li>`;}
  else{close();if(heading)html+=`<h${heading[1].length+1}>${noteInline(heading[2])}</h${heading[1].length+1}>`;else if(quote)html+=`<blockquote>${noteInline(quote[1])}</blockquote>`;else html+=line.trim()?`<div>${noteInline(line)}</div>`:'<div class="eh-note-space" aria-hidden="true"><br></div>';}
 }close();return html;
}

$('reports').addEventListener('click',e=>{const b=e.target.closest('[data-edit-report]');if(!b)return;const report=(s.teamReports||[]).find(r=>String(r.id)===b.dataset.editReport);if(report)openTeamEditor('reports',report);});
function openTeamEditor(kind,item){
 if(!s.team||!managesTeam(s.team))return;const teamId=s.team.id;
 const dialog=document.createElement('dialog');dialog.className='eh-dialog eh-panel eh-editor';
 const event=kind==='events',date=event?easternWallDate(item.starts_at):null;
 dialog.innerHTML=`<form><h2>Edit ${event?'event':'report'}</h2><label>Title<input name="title" required maxlength="${event?120:140}" value="${escapeHtml(item.title)}"></label><label>Type<select name="type">${(event?['match','scrim','practice','event']:['scrim','vod','match','practice']).map(type=>`<option value="${type}" ${type===item.type?'selected':''}>${type==='vod'?'VOD Review':roleLabel(type)}</option>`).join('')}</select></label>${event?`<label>Opponent<input name="opponent" maxlength="100" value="${escapeHtml(item.opponent||'')}"></label><label>Date<input name="date" type="date" required value="${schDay(date)}"></label><label>Time (Eastern)<input name="time" type="time" required value="${String(date.getHours()).padStart(2,'0')}:${String(date.getMinutes()).padStart(2,'0')}"></label>`:''}<label>Notes<textarea name="${event?'notes':'content'}" ${event?'':'required'} maxlength="${event?2000:8000}">${escapeHtml(event?item.notes||'':item.content||'')}</textarea></label><p class="eh-muted">Use blank lines for spacing, - for bullets, or 1. for numbered lists.</p><p role="status"></p><button class="eh-btn" type="submit">Save changes</button> <button class="eh-btn" type="button" data-cancel>Cancel</button></form>`;
 if(!event){mountReportEditor(dialog.querySelector('textarea'));dialog.querySelector('p.eh-muted').textContent='Use the toolbar to format your review. Changes are shared with your team.';}
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.target,b=Object.fromEntries(new FormData(form)),save=form.querySelector('[type=submit]');save.disabled=true;
  try{if(event){const when=fromEasternInput(b.date,b.time);if(isNaN(when))throw Error('Choose a valid date and time');b.startsAt=when.toISOString();delete b.date;delete b.time;}await api(`/teams/${encodeURIComponent(teamId)}/${kind}/${encodeURIComponent(item.id)}`,'PATCH',b);dialog.close();if(s.team?.id===teamId)await selectTeam(s.team);notify('Changes saved.');}
  catch(err){form.querySelector('[role=status]').textContent=err.message;}finally{save.disabled=false;}
 };document.body.append(dialog);dialog.showModal();
}
// Show half a day at a time so the weekly grid fits without an inner scrollbar.
const availabilityPeriod=document.createElement('div');availabilityPeriod.className='eh-period';
for(const [label,start] of [['12–6 AM',0],['6 AM–12 PM',12],['12–6 PM',24],['6 PM–12 AM',36]]){const b=document.createElement('button');b.type='button';b.className='eh-btn tiny';b.textContent=label;b.onclick=()=>showAvailabilityPeriod(start);b.dataset.period=start;availabilityPeriod.append(b);}
const periodBar=document.createElement('div');periodBar.className='eh-availability-gridbar';const selectionCount=document.createElement('span');selectionCount.id='availabilitySelectionCount';selectionCount.className='eh-muted';periodBar.append(availabilityPeriod,selectionCount);$('weekGrid').parentElement.before(periodBar);
function showAvailabilityPeriod(start){
 const cells=[...$('weekGrid').children];for(let i=8;i<cells.length;i++){const half=Math.floor((i-8)/8);cells[i].hidden=half<start||half>=start+12;}
 availabilityPeriod.querySelectorAll('button').forEach(b=>b.setAttribute('aria-pressed',String(Number(b.dataset.period)===start)));
}
showAvailabilityPeriod(36);

function renderNeccSettings(box,team=s.team){
 if(!team||!canSyncTeam(team))return;
 const teamId=team.id,section=schEl('section','eh-necc-settings'),heading=schEl('h3','','NECC Match Sync');section.append(heading);
 const form=document.createElement('form'),label=document.createElement('label');label.textContent='NECC team link';
 const input=document.createElement('input');input.type='url';input.required=true;input.placeholder='https://necc.v1.leagueos.gg/league/teams/…';label.append(input);
 const enabledLabel=document.createElement('label'),enabled=document.createElement('input');enabled.type='checkbox';enabled.checked=true;enabled.style.width='auto';enabledLabel.append(enabled,document.createTextNode(' Enable automatic syncing'));
 const save=schEl('button','eh-btn tiny','Save settings');save.type='submit';const sync=schEl('button','eh-btn tiny','Sync now');sync.type='button';sync.disabled=true;
 const status=schEl('p','eh-muted','Loading sync settings…');status.setAttribute('role','status');form.append(label,enabledLabel,save,document.createTextNode(' '),sync,status);section.append(form);box.append(section);
 const url=`/teams/${encodeURIComponent(teamId)}/necc`;
 async function load(){try{const c=await api(url);if(!section.isConnected)return;input.value=c?.team_url||'';enabled.checked=c?!!c.enabled:true;sync.disabled=!c;status.textContent=c?`${c.enabled?'Auto-sync enabled (requires Worker Cron Trigger).':'Auto-sync paused.'} Last successful sync: ${c.last_synced?fmt(c.last_synced):'Never'}.${c.last_error?' Last error: '+c.last_error:''}`:'Save your NECC team link, then select Sync now.';}catch(e){status.textContent=e.message;}}
 form.onsubmit=async e=>{e.preventDefault();save.disabled=true;try{await api(url,'PUT',{url:input.value.trim(),enabled:enabled.checked});await load();}catch(e){status.textContent=e.message;}finally{save.disabled=false;}};
 sync.onclick=async()=>{sync.disabled=true;status.textContent='Syncing NECC matches…';try{const r=await api(url+'/sync','POST',{});if(s.team?.id===teamId)await selectTeam(s.team);await load();notify(`NECC sync complete: ${r.matched} matches processed. ${r.results?.enabled?`${r.results.synced} results updated, ${r.results.pending||0} not published yet, ${r.results.failed} failed.`:'Result page syncing requires Cloudflare Browser Rendering setup.'}`);}catch(e){status.textContent=e.message;}finally{sync.disabled=false;}};
 void load();
}

async function deleteTeamEvent(event,button){
 if(!s.team||!managesTeam(s.team))return;const teamId=s.team.id;
 if(!window.confirm(`Delete “${event.title}”? This cannot be undone. Imported NECC matches will stay deleted after syncing.`))return;
 button.disabled=true;
 try{await api(`/teams/${encodeURIComponent(teamId)}/events/${encodeURIComponent(event.id)}`,'DELETE');if(s.team?.id===teamId)await selectTeam(s.team);notify('Event deleted.');}
 catch(e){notify('Could not delete event: '+e.message,true);}finally{button.disabled=false;}
}

function setAccountMenu(open,focusFirst=false){
 open=!!open&&!!s.me;const trigger=$('openSelfProfile'),menu=$('accountDropup');
 trigger.setAttribute('aria-expanded',String(open));menu.classList.toggle('hidden',!open);
 if(open){void loadAccountMiniProfile();if(focusFirst)$('accountProfile').focus();}else{s.miniProfileRequest=(s.miniProfileRequest||0)+1;}
}
$('openSelfProfile').addEventListener('click',()=>setAccountMenu($('openSelfProfile').getAttribute('aria-expanded')!=='true'));
$('openSelfProfile').addEventListener('keydown',e=>{if(e.key==='ArrowUp'||e.key==='ArrowDown'){e.preventDefault();setAccountMenu(true,true);}});
document.addEventListener('click',e=>{if(!e.target.closest('.eh-account-area'))setAccountMenu(false);});
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&$('openSelfProfile').getAttribute('aria-expanded')==='true'){setAccountMenu(false);$('openSelfProfile').focus();}});
document.addEventListener('focusin',e=>{if(!e.target.closest('.eh-account-area'))setAccountMenu(false);});

function renderRoleSelector(){
 const wrapper=$('roleViewControls'),select=$('roleViewSelect');if(!wrapper||!select)return;
 const roles=[...new Set(assignedRoles.map(m=>m.role))];wrapper.classList.toggle('hidden',roles.length<2);select.replaceChildren();
 for(const [value,label] of [['','All assigned roles'],...roles.map(role=>[role,roleLabel(role)])]){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}
 select.value=activeViewRole;
}
$('roleViewSelect').addEventListener('change',async e=>{
 const select=e.target,previous=activeViewRole;activeViewRole=select.value;select.disabled=true;setAccountMenu(false);
 // Clear data from the previous role before fetching the scoped view.
 document.querySelectorAll('.eh-coordination').forEach(d=>d.close());s.notifications=null;s.notificationsAt=0;s.notificationRequest=(s.notificationRequest||0)+1;clearTeam();$('memberDirectory').replaceChildren();$('concerns').replaceChildren();$('teamsMirror').replaceChildren();$('signed').classList.add('hidden');
 try{await refresh();notify(activeViewRole?`Viewing as ${roleLabel(activeViewRole)}.`:'Viewing all assigned roles.');}
 catch(error){activeViewRole=previous;try{await refresh();}catch{showGuest('Unable to load this role view. Reload and sign in again.');}notify('Unable to switch role: '+error.message,true);}
 finally{select.disabled=false;}
});

function appendEventResult(card,event){
 if(!['match','scrim'].includes(event.type))return;
 const row=schEl('div','eh-event-result');
 const status=event.result_status||'scheduled';
 row.append(schEl('span','eh-result-status',({scheduled:'Scheduled',in_progress:'In Progress',final:'Final',cancelled:'Cancelled',postponed:'Postponed'})[status]||status));
 if(event.team_score!=null&&event.opponent_score!=null){
  const label=status==='final'?(event.team_score>event.opponent_score?'Win':event.team_score<event.opponent_score?'Loss':'Draw'):'Current Score';
  row.append(schEl('strong','',`${label}: ${event.team_score} – ${event.opponent_score}`));
  row.append(schEl('span','eh-muted',`${event._team?.name||s.team?.name||'Your team'} · ${event.opponent||'Opponent'}`));
 }
 if(event.result_source)row.append(schEl('small','eh-muted',`${event.result_source==='necc_page'?'Synced from NECC':'Entered manually'} · ${fmt(event.result_updated_at)}`));
 if(event.necc_match_id&&/^[a-z0-9]{10,40}$/.test(event.necc_match_id)){const link=schEl('a','eh-result-link','View NECC match');link.href='https://necc.v1.leagueos.gg/league/matches/'+event.necc_match_id;link.target='_blank';link.rel='noopener noreferrer';row.append(link);}
 if(!event._team&&event.necc_match_id&&s.team&&(admin()||s.me?.roles.some(m=>m.role==='team_manager'&&m.team_id===s.team.id))){
  const sync=schEl('button','eh-btn tiny','Sync NECC result'),status=schEl('span','eh-result-sync-message');status.setAttribute('role','status');sync.type='button';
  sync.onclick=async()=>{if(sync.disabled)return;const teamId=s.team.id;sync.disabled=true;sync.textContent='Reading NECC match…';status.textContent='Opening the match page and checking its scoreboard. This can take up to 45 seconds.';
   try{const result=await api(`/teams/${encodeURIComponent(teamId)}/events/${encodeURIComponent(event.id)}/result/sync`,'POST',{});if(result.pending){status.textContent=result.message||'No result published yet.';status.classList.remove('eh-result-sync-error');return;}status.textContent=result.status==='cancelled'?'Match cancelled.':`Result synced: ${result.teamScore} – ${result.opponentScore}.`;if(s.team?.id===teamId)await selectTeam(s.team);notify('NECC result synced.');}
   catch(e){status.textContent=e.message;status.classList.add('eh-result-sync-error');notify(e.message,true);}
   finally{sync.disabled=false;sync.textContent='Sync NECC result';}
  };row.append(sync,status);
 }
 if(!event._team&&s.team&&managesTeam(s.team)){const button=schEl('button','eh-btn tiny',event.result_status?'Edit result':'Record result');button.type='button';button.onclick=()=>editEventResult(event);row.append(button);}
 card.append(row);
}
function editEventResult(event){
 if(!s.team||!managesTeam(s.team))return;const teamId=s.team.id;
 const dialog=document.createElement('dialog');dialog.className='eh-dialog eh-panel eh-editor';
 dialog.innerHTML=`<form><h2>Match result</h2><p>${escapeHtml(event.title)}</p><label>Status<select name="status">${[['scheduled','Scheduled'],['in_progress','In Progress'],['final','Final'],['cancelled','Cancelled'],['postponed','Postponed']].map(([v,l])=>`<option value="${v}" ${v===(event.result_status||'scheduled')?'selected':''}>${l}</option>`).join('')}</select></label><label>${escapeHtml(s.team.name)} score<input name="teamScore" type="number" min="0" max="999" step="1" value="${event.team_score??''}"></label><label>${escapeHtml(event.opponent||'Opponent')} score<input name="opponentScore" type="number" min="0" max="999" step="1" value="${event.opponent_score??''}"></label><p class="eh-muted">Enter the series score (for example, 3–1). NECC page syncing replaces saved scores with published results. Manual entry is available if results are not published yet.</p><p role="status"></p><button class="eh-btn" type="submit">Save result</button> <button class="eh-btn" type="button" data-cancel>Cancel</button></form>`;
 dialog.querySelector('[data-cancel]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());
 dialog.querySelector('form').onsubmit=async e=>{e.preventDefault();const form=e.target,values=Object.fromEntries(new FormData(form)),button=form.querySelector('[type=submit]');button.disabled=true;
 try{await api(`/teams/${encodeURIComponent(teamId)}/events/${encodeURIComponent(event.id)}/result`,'PUT',{status:values.status,teamScore:values.teamScore===''?null:Number(values.teamScore),opponentScore:values.opponentScore===''?null:Number(values.opponentScore)});dialog.close();if(s.team?.id===teamId)await selectTeam(s.team);notify('Result saved.');}catch(err){form.querySelector('[role=status]').textContent=err.message;}finally{button.disabled=false;}
 };document.body.append(dialog);dialog.showModal();
}

function canSyncTeam(team){return !!team&&(admin()||s.me?.roles.some(m=>m.role==='team_manager'&&m.team_id===team.id));}
function canViewMatchSync(){return !!s.me&&(admin()||(s.teams||[]).some(canSyncTeam));}
function renderMatchSyncPage(){
 const box=$('matchSyncContent');if(!box)return;box.replaceChildren();
 const teams=(s.teams||[]).filter(canSyncTeam);if(!canViewMatchSync())return;
 if(!teams.length){box.append(schEl('p','eh-muted','Create or assign a team before configuring match sync.'));return;}
 const select=document.createElement('select');select.id='syncTeamSelect';const label=document.createElement('label');label.htmlFor=select.id;label.textContent='Team';
 const current=teams.find(t=>t.id===s.team?.id)||teams[0];
 for(const team of teams){const option=document.createElement('option');option.value=team.id;option.textContent=`${team.name} · ${team.game_name}`;select.append(option);}select.value=current.id;
 const settings=document.createElement('div');box.append(label,select,settings);renderNeccSettings(settings,current);
 select.onchange=()=>{settings.replaceChildren();const team=teams.find(t=>t.id===select.value);if(team)renderNeccSettings(settings,team);};
}

$('dashboardTeamSelect').addEventListener('change',async e=>{const select=e.target,old=s.team?.id||'',team=(s.teams||[]).find(t=>t.id===select.value);if(!team)return;select.disabled=true;try{await selectTeam(team);go('dashboard');}catch(error){select.value=old;notify(error.message,true);}finally{select.disabled=!(s.teams||[]).length;}});
document.addEventListener('click',e=>{const button=e.target.closest('[data-dashboard-go]');if(button)go(button.dataset.dashboardGo);});

async function loadAllScheduleEvents(){
 if(s.scheduleLoading)return;const request=(s.scheduleRequest||0)+1;s.scheduleRequest=request;s.scheduleLoading=true;s.scheduleErrors=[];renderSchedule();
 const teams=[...(s.teams||[])],events=[],errors=[];let next=0;
 await Promise.all(Array.from({length:Math.min(4,teams.length)},async()=>{while(next<teams.length){const team=teams[next++];try{const rows=await api(`/teams/${encodeURIComponent(team.id)}/events`);if(!Array.isArray(rows))throw Error('Invalid event list');events.push(...rows.map(e=>({...e,_team:team})));}catch(error){errors.push(`${team.name}: ${error.message}`);}}}));
 if(s.scheduleRequest!==request)return;s.scheduleAllEvents=events;s.scheduleErrors=errors;s.scheduleLoading=false;renderSchedule();
}

function dashboardGreeting(user){return user?.dashboard_display==='username'&&user.username?user.username:user?.name||'member';}
function updateDashboardGreeting(){const el=$('welcome');if(el)el.textContent=dashboardGreeting(s.me?.user);}

function chooseDashboardTeam(teams,currentId,defaultId){return teams.find(t=>t.id===currentId)||teams.find(t=>t.id===defaultId)||teams[0];}
function renderDefaultTeamSettings(){
 const select=$('defaultDashboardTeam');select.replaceChildren();const automatic=document.createElement('option');automatic.value='';automatic.textContent='Automatic (first accessible team)';select.append(automatic);
 for(const team of s.teams||[]){const option=document.createElement('option');option.value=team.id;option.textContent=`${team.name} · ${team.game_name}`;select.append(option);}
 const saved=s.me?.user?.default_team_id;if(saved&&!s.teams.some(t=>t.id===saved)){const option=document.createElement('option');option.value=saved;option.textContent='Saved default (unavailable in this role)';option.disabled=true;select.append(option);}
 select.value=saved||'';
}
$('defaultTeamForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('saveDefaultTeam'),status=$('defaultTeamStatus'),teamId=$('defaultDashboardTeam').value||null;button.disabled=true;status.textContent='Saving…';
 try{const saved=await api('/me/default-team','PUT',{teamId});s.me.user.default_team_id=saved.default_team_id;status.textContent='Default dashboard team saved.';if(teamId){const team=s.teams.find(t=>t.id===teamId);if(team)await selectTeam(team);}}
 catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});
let loadedCustomization={};
function customizationFields(){return {display_name:$('pfDisplayName').value.trim(),pronouns:$('pfPronouns').value.trim(),bio:$('pfBio').value,status_emoji:$('pfStatusEmoji').value,status_text:$('pfStatusText').value,presence:$('pfPresence').value,primary:$('pfColorPrimary').value,accent:$('pfColorAccent').value,theme:$('pfProfileTheme').value,frame:$('pfAvatarFrame').value,effect:$('pfEffect').value,banner_position:Number($('pfBannerPosition').value),status_expires_at:customStatusExpiration()};}
function customStatusExpiration(){const mode=$('pfStatusExpiry').value;if(mode==='hour')return new Date(Date.now()+3600000).toISOString();if(mode==='day')return new Date(Date.now()+86400000).toISOString();if(loadedCustomization.status_text===$('pfStatusText').value&&loadedCustomization.status_emoji===$('pfStatusEmoji').value)return loadedCustomization.status_expires_at||null;return null;}
function fillCustomization(value){loadedCustomization=value||{};const v=loadedCustomization;for(const [id,key,defaultValue] of [['pfDisplayName','display_name',''],['pfPronouns','pronouns',''],['pfBio','bio',''],['pfStatusEmoji','status_emoji',''],['pfStatusText','status_text',''],['pfPresence','presence','online'],['pfColorPrimary','primary','#501d83'],['pfColorAccent','accent','#b095de'],['pfProfileTheme','theme','auto'],['pfAvatarFrame','frame','none'],['pfEffect','effect','none'],['pfBannerPosition','banner_position',50]])$(id).value=v[key]??defaultValue;$('pfStatusExpiry').value='never';renderProfilePreview();}
function profileGradientPalette(primary,accent,mode){
 const rgb=hex=>[1,3,5].map(i=>parseInt(hex.slice(i,i+2),16));
 const luminance=channels=>channels.map(c=>c/255).map(c=>c<=0.04045?c/12.92:((c+0.055)/1.055)**2.4).reduce((sum,c,i)=>sum+c*[0.2126,0.7152,0.0722][i],0);
 const dark=mode!=='light',text=dark?'#ffffff':'#111111',overlay=dark?0:255,textLum=luminance(rgb(text));
 let amount=0;for(;amount<=1;amount+=0.02){const okay=[primary,accent].every(hex=>{const lum=luminance(rgb(hex).map(c=>c*(1-amount)+overlay*amount));return (Math.max(lum,textLum)+0.05)/(Math.min(lum,textLum)+0.05)>=4.5;});if(okay)break;}
 return {text,veil:`rgba(${overlay},${overlay},${overlay},${Math.min(1,amount).toFixed(2)})`,muted:dark?'#ffffff':'#111111',panel:dark?'rgba(0,0,0,.15)':'rgba(255,255,255,.22)'};
}
function applyProfileStyle(container,avatar,banner,v={}){
 container.style.setProperty('--profile-primary',/^#[0-9a-f]{6}$/i.test(v.primary||'')?v.primary:'#501d83');container.style.setProperty('--profile-accent',/^#[0-9a-f]{6}$/i.test(v.accent||'')?v.accent:'#b095de');if(banner.dataset.themeBanner==='true')banner.style.backgroundImage=`linear-gradient(135deg,${container.style.getPropertyValue('--profile-primary')},${container.style.getPropertyValue('--profile-accent')})`;container.style.setProperty('--pc',container.style.getPropertyValue('--profile-primary'));container.dataset.profileTheme=['light','dark'].includes(v.theme)?v.theme:'auto';const palette=profileGradientPalette(container.style.getPropertyValue('--profile-primary'),container.style.getPropertyValue('--profile-accent'),v.theme==='auto'||!v.theme?(document.documentElement.dataset.theme==='light'?'light':'dark'):v.theme);for(const [key,value] of Object.entries(palette))container.style.setProperty('--profile-'+key,value);container.dataset.profileEffect=['glow','shimmer'].includes(v.effect)?v.effect:'none';avatar.dataset.frame=['ring','double','hex'].includes(v.frame)?v.frame:'none';banner.style.backgroundPosition=`center ${Math.max(0,Math.min(100,Number(v.banner_position)||0))}%`;
}
function renderProfilePreview(){
 const v=customizationFields(),box=$('profileLivePreview'),name=v.display_name||[$('pfFirst').value,$('pfLast').value].filter(Boolean).join(' ')||s.me?.user?.name||'Your profile';
 box.innerHTML=`<div class="eh-preview-banner"></div><div class="eh-preview-body"><div class="eh-preview-avatar">${escapeHtml(name.split(/\s+/).slice(0,2).map(x=>x[0]).join(''))}</div><h3>${escapeHtml(name)}</h3><p class="eh-muted">${$('pfUser').value?'@'+escapeHtml($('pfUser').value):''}${v.pronouns?' · '+escapeHtml(v.pronouns):''}</p><span class="eh-presence-label">${escapeHtml(presenceLabel(v.presence))} (preview)</span><p>${escapeHtml(v.status_emoji)} ${escapeHtml(v.status_text)}</p><div class="eh-rich-notes">${formatNotes(v.bio)}</div></div>`;
 const banner=box.querySelector('.eh-preview-banner'),avatar=box.querySelector('.eh-preview-avatar');applyBanner(banner,bannerValue());const existing=$('pfBannerPreview');if(bannerValue()==='upload'&&existing.style.backgroundImage)banner.style.backgroundImage=existing.style.backgroundImage;applyProfileStyle(box,avatar,banner,v);
 const source=$('pfAvatarPreview').querySelector('img');if(source){const img=source.cloneNode();img.alt='';avatar.replaceChildren(img);}
}
function presenceLabel(value){return ({online:'Online',idle:'Away',dnd:'Do not disturb',invisible:'Offline',offline:'Offline'})[value]||'Online';}
function showCustomization(profile){const v=profile.customization||{};const full=profile.name||'Member';$('pdName').textContent=v.display_name||full;$('pdFullName').textContent=v.display_name&&v.display_name!==full?full:'';$('pdPronouns').textContent=v.pronouns||'';$('pdStatus').textContent=[v.status_emoji,v.status_text].filter(Boolean).join(' ');$('pdPresence').textContent=presenceLabel(profile.presence||'offline');$('pdPresence').dataset.presence=profile.presence||'offline';$('pdBio').innerHTML=formatNotes(v.bio||'');$('pdBioWrap').classList.toggle('hidden',!v.bio);applyProfileStyle(pd,$('pdAvatar'),$('pdBanner'),v);}
$('profileForm').addEventListener('input',()=>renderProfilePreview());$('profileForm').addEventListener('change',()=>renderProfilePreview());
$('resetProfileStyle').onclick=()=>{s.profileDirty=true;s.profileEditVersion=(s.profileEditVersion||0)+1;updateProfileDraftNotice();for(const [id,value] of [['pfColorPrimary','#501d83'],['pfColorAccent','#b095de'],['pfProfileTheme','auto'],['pfAvatarFrame','none'],['pfEffect','none'],['pfBannerPosition','50']])$(id).value=value;renderProfilePreview();};

async function loadAccountMiniProfile(){
 if(!s.me)return;const uid=s.me.user.id,request=(s.miniProfileRequest||0)+1;s.miniProfileRequest=request;const box=$('accountMiniProfile');if(!box.firstChild)box.textContent='Loading your profile…';
 try{const p=await api('/profile/'+encodeURIComponent(uid));if(s.miniProfileRequest!==request||s.me?.user.id!==uid)return;const v=p.customization||{},name=v.display_name||p.name||'Member';
 box.innerHTML=`<div class="eh-mini-banner"></div><div class="eh-mini-body"><div class="eh-mini-avatar"></div><h3>${escapeHtml(name)}</h3><p class="eh-muted">${p.username?'@'+escapeHtml(p.username):escapeHtml(p.name||'')}${v.pronouns?' · '+escapeHtml(v.pronouns):''}</p><span class="eh-presence-label">${escapeHtml(presenceLabel(p.presence||'offline'))}</span><p>${escapeHtml([v.status_emoji,v.status_text].filter(Boolean).join(' '))}</p>${v.bio?`<div class="eh-mini-bio">${formatNotes(v.bio)}</div>`:''}<small class="eh-muted">${escapeHtml([...new Set((s.me.roles||[]).map(m=>roleLabel(m.role)))].join(' · '))}</small></div>`;
 const avatar=box.querySelector('.eh-mini-avatar'),banner=box.querySelector('.eh-mini-banner');avatar.textContent=name.split(/\s+/).slice(0,2).map(x=>x[0]).join('');if(trustedAvatar(p.image_url)){const image=document.createElement('img');image.alt='';image.referrerPolicy='no-referrer';image.src=p.image_url;image.onerror=()=>image.remove();avatar.append(image);}
 applyProfileStyle(box,avatar,banner,v);applyProfileStyle($('accountDropup'),avatar,banner,v);
 void applyBannerFor(banner,p.banner,uid,()=>s.miniProfileRequest===request&&s.me?.user.id===uid);
 }catch(error){if(s.miniProfileRequest===request)box.textContent='Unable to load profile: '+error.message;}
}

function showProfileOnboarding(){
 $('loginPage').classList.add('hidden');$('dashboardShell').classList.add('hidden');const dialog=$('onboardingDialog'),user=window.Clerk.user;document.title='Set up your profile | EsportsHub';if(dialog.open)return;
 $('obFirst').value=user?.firstName||'';$('obLast').value=user?.lastName||'';$('obUsername').value=s.me?.user.username||'';$('onboardingStatus').textContent='';if(!dialog.open)dialog.showModal();
}
$('onboardingDialog').addEventListener('cancel',e=>e.preventDefault());
$('onboardingForm').addEventListener('submit',async e=>{
 e.preventDefault();const button=$('finishOnboarding'),status=$('onboardingStatus'),user=window.Clerk?.user;if(!user)return;button.disabled=true;status.textContent='Saving your profile…';
 try{
  await user.update({firstName:$('obFirst').value.trim(),lastName:$('obLast').value.trim()});
  const existing=await api('/profile/'+encodeURIComponent(s.me.user.id));
  await api('/me/profile','PUT',{username:$('obUsername').value.trim(),discord_username:$('obDiscord').value.trim(),banner:existing.banner||'preset:purple',main_game_id:existing.main_game_id||null,game_usernames:Object.fromEntries((existing.game_usernames||[]).map(g=>[g.game_id,g.username])),customization:{...(existing.customization||{}),pronouns:$('obPronouns').value.trim(),bio:$('obBio').value}});
  await api('/me/onboarding/complete','POST',{});$('onboardingDialog').close();await refresh();notify('Your profile is ready. Welcome to EsportsHub!');
 }catch(error){status.textContent=error.message;}finally{button.disabled=false;}
});

$('onboardingSignOut').onclick=async()=>{try{await setOfflinePresence();await window.Clerk.signOut({redirectUrl:signInReturnUrl});$('onboardingDialog').close();showGuest();}catch(error){$('onboardingStatus').textContent=error.message;}};

function setupSettingsTabs(){
 const page=document.querySelector('[data-panel="settings"]'),profile=$('profileForm').closest('article'),dashboard=$('defaultTeamForm').closest('article'),connection=$('api').closest('article');
 const layout=document.createElement('div');layout.className='eh-settings-layout';const nav=document.createElement('nav');nav.className='eh-settings-nav';nav.setAttribute('aria-label','Settings categories');
 const content=document.createElement('div');content.className='eh-settings-content';
 const account=document.createElement('article');account.className='eh-panel';account.innerHTML='<h2>Account & Security</h2><p class="eh-muted">Manage your email, password, and account security through Clerk.</p><button class="eh-btn" type="button" id="settingsAccountManage">Manage account</button>';
 const categories=[['account','Account & Security',account],['profile','Edit Profile',profile],['dashboard','Dashboard',dashboard],['connection','Connection',connection]];
 for(const [id,label,panel] of categories){panel.dataset.settingsPanel=id;panel.id='settings-panel-'+id;const button=document.createElement('button');button.type='button';button.textContent=label;button.dataset.settingsTab=id;button.setAttribute('aria-controls',panel.id);button.onclick=()=>setSettingsTab(id);nav.append(button);content.append(panel);}
 layout.append(nav,content);page.append(layout);$('settingsAccountManage').onclick=()=>window.Clerk?.openUserProfile?.();setSettingsTab('profile');
}
function setSettingsTab(id){document.querySelectorAll('[data-settings-panel]').forEach(p=>{p.hidden=p.dataset.settingsPanel!==id;});document.querySelectorAll('[data-settings-tab]').forEach(b=>b.setAttribute('aria-current',b.dataset.settingsTab===id?'page':'false'));updateTabTitle('settings');}
setupSettingsTabs();

$('closeMobileNav').onclick=()=>{setMobileNav(false);$('menuButton').focus();};

function startLivePresence(){
 if(s.presenceTimer)return;s.lastActivity=Date.now();void sendPresenceHeartbeat();s.presenceTimer=setInterval(()=>{void sendPresenceHeartbeat();},30000);
}
function stopLivePresence(){if(s.presenceTimer)clearInterval(s.presenceTimer);s.presenceTimer=null;}
async function setOfflinePresence(){if(!s.me)return;try{await api('/me/presence','POST',{activity:'offline'});}catch{}stopLivePresence();}
async function sendPresenceHeartbeat(){
 void refreshNotifications().catch(()=>{});
 if(!s.me||!activeClerkSession()||document.visibilityState==='hidden'||s.presenceBusy)return;const uid=s.me.user.id;s.presenceBusy=true;
 try{
  await api('/me/presence','POST',{activity:Date.now()-(s.lastActivity||0)>300000?'idle':'active'});
  if(s.me?.user.id!==uid)return;
  if(s.team){const teamId=s.team.id,info=await api(`/teams/${encodeURIComponent(teamId)}`);if(s.me?.user.id===uid&&s.team?.id===teamId){s.teamMembers=info.members||[];renderRoster();}}
  if(pd.open&&pd.dataset.profileUser){const id=pd.dataset.profileUser,live=await api('/profile/'+encodeURIComponent(id)+'/presence');if(pd.open&&pd.dataset.profileUser===id){$('pdPresence').textContent=presenceLabel(live.presence);$('pdPresence').dataset.presence=live.presence;}}
  if($('openSelfProfile').getAttribute('aria-expanded')==='true'){const live=await api('/profile/'+encodeURIComponent(uid)+'/presence');const badge=$('accountMiniProfile').querySelector('.eh-presence-label');if(badge){badge.textContent=presenceLabel(live.presence);badge.dataset.presence=live.presence;}}
 }catch{/* Presence failures must not interrupt team coordination. */}finally{s.presenceBusy=false;}
}
['pointerdown','keydown'].forEach(type=>document.addEventListener(type,()=>{s.lastActivity=Date.now();},{passive:true}));
document.addEventListener('visibilitychange',()=>{if(document.visibilityState==='visible'){s.lastActivity=Date.now();void sendPresenceHeartbeat();}});

function setProfileInputsDisabled(disabled){$('profileForm').querySelectorAll('input,select,textarea,button').forEach(el=>{el.disabled=disabled;});}
function updateProfileDraftNotice(){const notice=$('profileDraftNotice');notice.hidden=!s.profileDirty;notice.textContent=s.profileSaving?'Saving your changes…':'Unsaved changes — switching sections will keep your edits.';$('discardProfileChanges').disabled=!!s.profileSaving;}
function clearProfileDraft(){s.profileDirty=false;s.profileSaving=false;s.profileOwner=null;s.profileLoadId=(s.profileLoadId||0)+1;for(const id of ['pfAvatar','pfBannerFile'])$(id).value='';setProfileInputsDisabled(false);updateProfileDraftNotice();}
for(const type of ['input','change'])$('profileForm').addEventListener(type,()=>{if(!s.me||s.profileSaving)return;s.profileDirty=true;s.profileEditVersion=(s.profileEditVersion||0)+1;s.profileOwner=s.me.user.id;updateProfileDraftNotice();});
$('discardProfileChanges').onclick=async()=>{if(s.profileSaving)return;if(s.profileDirty&&!window.confirm('Discard your unsaved profile changes?'))return;const loaded=await fillProfile(true);if(loaded){$('pfAvatar').value='';$('pfBannerFile').value='';refreshBannerPreview();renderProfilePreview();}};
window.addEventListener('beforeunload',e=>{if(s.profileDirty){e.preventDefault();e.returnValue='';}});

function updateTabTitle(page){
 if(!s.me){document.title=(currentAuthMode()==='signup'?'Create account':'Sign in')+' | EsportsHub';return;}
 if($('onboardingDialog')?.open){document.title='Set up your profile | EsportsHub';return;}
 if(pd.open){document.title=($('pdName').textContent||'Player')+' — Profile | EsportsHub';return;}
 const screen=page||(location.hash||'#dashboard').slice(1),labels={dashboard:'Overview',teams:'Teams',schedule:'Schedule',availability:'Availability',reports:'Scrim & VOD Reports',concerns:'Player Concerns',invitations:'Invitations',members:'Members',settings:'Settings',matchsync:'Match Sync'};
 let label=labels[screen]||'Overview';if(screen==='settings'){const current=document.querySelector('[data-settings-tab][aria-current="page"]');if(current)label=current.textContent+' — Settings';}
 const scoped=['dashboard','teams','schedule','availability','reports'].includes(screen),team=screen==='schedule'&&s.scheduleScope==='all'?'All Teams':s.team?.name;
 document.title=[label,scoped?team:null,'EsportsHub'].filter(Boolean).join(' | ');
}
pd.addEventListener('close',()=>updateTabTitle());

// Attendance is recorded by staff; players receive only their own record.
function appendEventAttendance(card,event){
 const team=event._team||s.team;if(!team)return;
 const button=schEl('button','eh-btn tiny',managesTeam(team)?'Track attendance':'My attendance');button.type='button';button.onclick=()=>openEventAttendance(event,team);card.append(button);
}
async function openEventAttendance(event,team){
 const dialog=document.createElement('dialog');dialog.className='eh-dialog eh-panel eh-editor';
 dialog.classList.add('eh-coordination');
 dialog.innerHTML='<form><h2>Event attendance</h2><p data-event></p><p class="eh-muted">Present, late, excused, or absent. Unrecorded does not count as absent.</p><div data-attendance></div><p role="status">Loading attendance…</p><button class="eh-btn" type="submit" hidden>Save attendance</button> <button class="eh-btn" type="button" data-close>Close</button></form>';
 dialog.querySelector('[data-event]').textContent=event.title+' · '+fmt(event.starts_at);
 const form=dialog.querySelector('form'),status=form.querySelector('[role=status]'),list=form.querySelector('[data-attendance]'),save=form.querySelector('[type=submit]');
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
 form.onsubmit=e=>e.preventDefault();
 const path=`/teams/${encodeURIComponent(team.id)}/events/${encodeURIComponent(event.id)}/attendance`;
 try{
  const data=await api(path);if(!dialog.open)return;
  const labels={unrecorded:'Unrecorded',present:'Present',late:'Late',excused:'Excused',absent:'Absent'};
  for(const player of data.players){const row=schEl('label','eh-attendance-row');row.append(schEl('span','',player.name));
   if(data.canManage){const select=document.createElement('select');select.dataset.userId=player.user_id;select.setAttribute('aria-label','Attendance for '+player.name);for(const [value,label] of Object.entries(labels)){const option=document.createElement('option');option.value=value;option.textContent=label;select.append(option);}select.value=player.status;row.append(select);}
   else row.append(schEl('strong','',labels[player.status]||'Unrecorded'));list.append(row);
  }
  status.textContent=data.players.length?'':'No player attendance records for this event.';save.hidden=!data.canManage||!data.players.length;
  if(data.canManage&&data.players.length){const all=schEl('button','eh-btn tiny','Mark all present');all.type='button';all.onclick=()=>list.querySelectorAll('select').forEach(x=>x.value='present');list.prepend(all);}
  form.onsubmit=async e=>{e.preventDefault();if(!data.canManage||save.disabled)return;save.disabled=true;status.textContent='Saving…';try{await api(path,'PUT',{records:[...list.querySelectorAll('select')].map(x=>({userId:x.dataset.userId,status:x.value}))});status.textContent='Attendance saved.';notify('Attendance saved.');}catch(error){status.textContent=error.message;}finally{save.disabled=false;}};
 }catch(error){status.textContent='Could not load attendance: '+error.message;}
}
// Event RSVPs, per-event lineups, and match preparation.
function appendEventPlan(card,event){
 const team=event._team||s.team;if(!team)return;
 const button=schEl('button','eh-btn tiny','RSVP & match readiness');button.type='button';button.onclick=()=>openEventPlan(event,team);card.append(button);
}
const rsvpLabels={going:'Going',maybe:'Maybe',unavailable:'Unavailable',unanswered:'No response'};
async function openEventPlan(event,team){
 const dialog=document.createElement('dialog');dialog.className='eh-dialog eh-panel eh-editor eh-coordination';
 dialog.innerHTML='<div class="eh-row"><h2>Event readiness</h2><button class="eh-btn tiny" type="button" data-close>Close</button></div><h3 data-title></h3><p data-date></p><div data-body></div><p role="status">Loading event details…</p>';
 dialog.querySelector('[data-title]').textContent=event.title+' · '+team.name;dialog.querySelector('[data-date]').textContent=fmt(event.starts_at);dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();
 const status=dialog.querySelector('[role=status]'),box=dialog.querySelector('[data-body]'),path=`/teams/${encodeURIComponent(team.id)}/events/${encodeURIComponent(event.id)}`;
 try{
  const data=await api(path+'/plan');if(!dialog.open)return;status.textContent='';
  const summary=schEl('section','eh-readiness-summary');box.append(summary);
  function readiness(){
   const starters=data.plan.lineup.filter(x=>x.position==='starter'),subs=data.plan.lineup.filter(x=>x.position==='sub'),named=id=>data.players.find(p=>p.user_id===id)?.name||'Former team member';
   const unanswered=data.players.filter(p=>p.response==='unanswered'),uncertain=starters.filter(x=>data.players.find(p=>p.user_id===x.userId)?.response!=='going');
   summary.replaceChildren(schEl('h3','','Readiness checklist'));
   for(const [done,text] of [[!!data.plan.confirmed,`Lineup ${data.plan.confirmed?'confirmed':'not confirmed'} · ${starters.length} starter${starters.length===1?'':'s'}, ${subs.length} substitute${subs.length===1?'':'s'}`],[!unanswered.length&&data.players.length>0,`${unanswered.length} missing RSVP response${unanswered.length===1?'':'s'}`],[starters.length>0&&!uncertain.length,starters.length?(uncertain.length?`${uncertain.length} starter${uncertain.length===1?'':'s'} awaiting a Going RSVP`:'All starters RSVP Going'):'Starters not selected'],[!!data.plan.warmup_at,data.plan.warmup_at?'Warmup: '+fmt(data.plan.warmup_at):'Warmup time not set'],[!!data.plan.notes,'Match notes '+(data.plan.notes?'added':'not added')]]){const line=schEl('p',done?'eh-ready':'eh-pending',(done?'✓ ':'○ ')+text);summary.append(line);}
   summary.append(schEl('p','',`${data.players.filter(p=>p.response==='going').length} Going · ${data.players.filter(p=>p.response==='maybe').length} Maybe · ${data.players.filter(p=>p.response==='unavailable').length} Unavailable`));
   summary.append(schEl('p','','Starters: '+(starters.map(x=>named(x.userId)).join(', ')||'Not selected')),schEl('p','','Substitutes: '+(subs.map(x=>named(x.userId)).join(', ')||'Not selected')));
   if(event.necc_match_id&&/^[a-z0-9]{10,40}$/.test(event.necc_match_id)){const a=schEl('a','eh-btn tiny','Open NECC match');a.href='https://necc.v1.leagueos.gg/league/matches/'+event.necc_match_id;a.target='_blank';a.rel='noopener noreferrer';summary.append(a);}
   if(data.plan.notes){const notes=schEl('div','eh-rich-notes');notes.innerHTML=formatNotes(data.plan.notes);summary.append(notes);}
  }
  readiness();
  if(data.canRsvp){const own=data.players.find(p=>p.user_id===s.me?.user.id),form=document.createElement('form');form.innerHTML='<h3>Your RSVP</h3><label>Response<select name="response"></select></label><button class="eh-btn tiny" type="submit">Save RSVP</button><p role="status"></p>';const select=form.querySelector('select');for(const [value,text]of Object.entries(rsvpLabels)){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=own?.response||'unanswered';form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('button'),message=form.querySelector('[role=status]');button.disabled=true;try{await api(path+'/rsvp','PUT',{response:select.value});if(own)own.response=select.value;readiness();for(const el of box.querySelectorAll('[data-rsvp-user]')){const player=data.players.find(p=>p.user_id===el.dataset.rsvpUser);el.textContent=rsvpLabels[player.response];}message.textContent='RSVP saved.';void refreshNotifications(true).catch(()=>{});}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};box.append(form);}
  else box.append(schEl('p','eh-muted',Date.parse(event.starts_at)<=Date.now()?'RSVPs are closed for this event.':'RSVPs are available to assigned players and captains.'));
  const form=document.createElement('form');form.innerHTML='<h3>Event lineup & responses</h3><p class="eh-muted">This lineup applies only to this event. It does not change the team roster.</p><div data-lineup></div>';const roster=form.querySelector('[data-lineup]');
  for(const player of data.players){const row=schEl('div','eh-event-player'),identity=schEl('div','');identity.append(schEl('strong','',player.name));const response=schEl('small','eh-muted',rsvpLabels[player.response]);response.dataset.rsvpUser=player.user_id;identity.append(response);row.append(identity);
   const position=data.plan.lineup.find(x=>x.userId===player.user_id)?.position||'';
   if(data.canManage){const label=schEl('label','', 'Event position');const select=document.createElement('select');select.dataset.lineupUser=player.user_id;for(const [value,text]of [['','Not selected'],['starter','Starter'],['sub','Substitute']]){const option=document.createElement('option');option.value=value;option.textContent=text;select.append(option);}select.value=position;label.append(select);row.append(label);}else row.append(schEl('span','',position==='starter'?'Starter':position==='sub'?'Substitute':'Not selected'));roster.append(row);
  }
  if(!data.players.length)roster.textContent='No players assigned to this team.';
  if(data.canManage){const fields=document.createElement('div');fields.innerHTML='<label class="eh-inline-check"><input type="checkbox" name="confirmed"> Lineup confirmed</label><h3>Warmup time (Eastern)</h3><div class="eh-grid two"><label>Date<input type="date" name="warmupDate"></label><label>Time<input type="time" name="warmupTime"></label></div><p class="eh-muted">Optional. Set within 24 hours before the event; clear both fields to remove.</p><label>Match notes<textarea name="notes" maxlength="4000" rows="5"></textarea></label><p class="eh-muted">Use blank lines, - bullets, and numbered lists.</p><button class="eh-btn" type="submit">Save event plan</button><p role="status"></p>';form.append(fields);form.elements.confirmed.checked=!!data.plan.confirmed;form.elements.notes.value=data.plan.notes||'';if(data.plan.warmup_at){form.elements.warmupDate.value=easternDay(data.plan.warmup_at);form.elements.warmupTime.value=easternClock(data.plan.warmup_at);}
   form.addEventListener('input',()=>form.dataset.dirty='true');
   form.onsubmit=async e=>{e.preventDefault();const button=form.querySelector('[type=submit]'),message=form.querySelector('[role=status]');button.disabled=true;message.textContent='Saving…';try{const date=form.elements.warmupDate.value,time=form.elements.warmupTime.value;if(!!date!==!!time)throw Error('Choose both a warmup date and time, or clear both.');const payload={revision:Number(data.plan.revision),confirmed:form.elements.confirmed.checked,lineup:[...form.querySelectorAll('[data-lineup-user]')].filter(x=>x.value).map(x=>({userId:x.dataset.lineupUser,position:x.value})),warmupAt:date?fromEasternInput(date,time).toISOString():null,notes:form.elements.notes.value};await api(path+'/plan','PUT',payload);Object.assign(data.plan,payload,{confirmed:payload.confirmed?1:0,warmup_at:payload.warmupAt,revision:payload.revision+1});delete form.dataset.dirty;readiness();message.textContent='Event plan saved.';}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};
  }else form.onsubmit=e=>e.preventDefault();box.append(form);
  const attendance=schEl('button','eh-btn tiny',data.canManage?'Track attendance':'My attendance');attendance.type='button';attendance.onclick=()=>openEventAttendance(event,team);box.append(attendance);
  dialog.addEventListener('cancel',e=>{if(form.dataset.dirty&&!window.confirm('Discard unsaved event plan changes?'))e.preventDefault();});dialog.querySelector('[data-close]').onclick=()=>{if(!form.dataset.dirty||window.confirm('Discard unsaved event plan changes?'))dialog.close();};
 }catch(error){status.textContent='Could not load event details: '+error.message;}
}

// Rank continuous weekly availability windows; missing submissions are unknown.
function practiceWindows(players,availability,duration,startHalf,endHalf,dayFilter=-1){
 const schedules=new Map(availability.map(x=>[String(x.user_id),new Set(x.slots||[])])),windows=[];
 for(let day=0;day<7;day++){if(dayFilter>=0&&day!==dayFilter)continue;
  for(let start=startHalf;start+duration<=endHalf;start++){
   const yes=[],no=[],unknown=[];
   for(const player of players){const slots=schedules.get(String(player.user_id||player.id));if(!slots){unknown.push(player);continue;}let available=true;for(let half=0;half<duration;half++)if(!slots.has(day*48+start+half)){available=false;break;}(available?yes:no).push(player);}
   if(yes.length)windows.push({day,start,duration,yes,no,unknown});
  }
 }
 return windows.sort((a,b)=>b.yes.length-a.yes.length||a.unknown.length-b.unknown.length||a.day-b.day||a.start-b.start);
}
function renderPracticeSuggestions(){
 let panel=$('practiceSuggestions');if(!panel){panel=document.createElement('article');panel.id='practiceSuggestions';panel.className='eh-panel';document.querySelector('[data-panel="availability"]').append(panel);}
 panel.replaceChildren();if(!s.team){panel.textContent='Select a team to find practice times.';return;}
 panel.innerHTML='<h2>Suggested practice times</h2><p class="eh-muted">Weekly availability in Eastern Time. Missing schedules are shown as unknown. These suggestions do not reserve a time.</p><div class="eh-practice-filters"><label>Duration<select data-duration><option value="1">30 minutes</option><option value="2" selected>1 hour</option><option value="3">90 minutes</option><option value="4">2 hours</option><option value="6">3 hours</option></select></label><label>Day<select data-day><option value="-1">Any day</option>'+days.map((d,i)=>'<option value="'+i+'">'+d+'</option>').join('')+'</select></label><label>From<select data-from></select></label><label>Until<select data-until></select></label></div><div data-windows></div>';
 for(const select of [panel.querySelector('[data-from]'),panel.querySelector('[data-until]')])for(let half=0;half<=48;half++){const option=document.createElement('option');option.value=half;option.textContent=half===48?'Midnight (end of day)':availabilityTime(half);select.append(option);}
 panel.querySelector('[data-from]').value='32';panel.querySelector('[data-until]').value='46';
 const players=[...new Map((s.teamMembers||[]).filter(m=>['player','captain'].includes(m.role)).map(m=>[String(m.user_id||m.id),m])).values()];
 function draw(){const list=panel.querySelector('[data-windows]');list.replaceChildren();const duration=Number(panel.querySelector('[data-duration]').value),start=Number(panel.querySelector('[data-from]').value),end=Number(panel.querySelector('[data-until]').value);if(start>=end){list.textContent='Choose an end time after the start time.';return;}const ranked=practiceWindows(players,s.teamAvailability||[],duration,start,end,Number(panel.querySelector('[data-day]').value)),chosen=[];for(const slot of ranked){if(chosen.some(x=>x.day===slot.day&&Math.abs(x.start-slot.start)<duration))continue;chosen.push(slot);if(chosen.length===5)break;}
  if(!chosen.length){list.textContent=players.length?'No matching windows. Try a shorter duration or different hours.':'Assign players to this team to find shared practice times.';return;}
  const name=m=>m.display_name||m.name||'Player';
  for(const slot of chosen){const item=schEl('section','eh-practice-window');item.append(schEl('strong','',`${days[slot.day]} · ${availabilityTime(slot.start)}–${availabilityTime(slot.start+slot.duration)} Eastern`),schEl('p','',`${slot.yes.length} / ${players.length} available for the full session`));for(const [label,people]of [['Available',slot.yes],['Unavailable',slot.no],['Not submitted',slot.unknown]])item.append(schEl('p','eh-muted',label+': '+(people.map(name).join(', ')||'None')));
   if(managesTeam(s.team)){const teamId=s.team.id,button=schEl('button','eh-btn tiny','Schedule practice');button.type='button';button.onclick=()=>{if(s.team?.id!==teamId)return;const now=easternWallDate(new Date()),today=(now.getDay()+6)%7;let delta=(slot.day-today+7)%7;if(delta===0&&slot.start*30<=now.getHours()*60+now.getMinutes())delta=7;const date=new Date(now.getFullYear(),now.getMonth(),now.getDate()+delta),day=schDay(date);const form=$('eventForm');form.elements.type.value='practice';form.elements.title.value='Team practice';form.elements.date.value=day;form.elements.time.value=String(Math.floor(slot.start/2)).padStart(2,'0')+':'+(slot.start%2?'30':'00');form.elements.opponent.value='';form.elements.notes.value=`Suggested duration: ${slot.duration*30} minutes.`;go('schedule');$('scheduleCreate').open=true;form.scrollIntoView({behavior:'smooth',block:'center'});form.elements.title.focus();};item.append(button);}list.append(item);
  }
 }
 panel.addEventListener('change',draw);draw();
}

// In-site inbox: polls while the site is open; no browser or Discord permission needed.
async function refreshNotifications(force=false){
 if(!s.me||document.visibilityState==='hidden')return;if(!force&&Date.now()-(s.notificationsAt||0)<60000)return;
 const key=s.me.user.id+'|'+activeViewRole;s.notificationsAt=Date.now();const request=(s.notificationRequest||0)+1;s.notificationRequest=request;
 try{const data=await api('/me/notifications');if(!s.me||key!==s.me.user.id+'|'+activeViewRole||request!==s.notificationRequest)return;s.notifications=data;const unread=data.items.filter(x=>!x.read).length;const button=$('notificationsButton');button.textContent='Notifications'+(unread?' ('+unread+')':'');button.setAttribute('aria-label',unread+' unread notifications');}
 catch{if(force)throw Error('Notifications could not load. Try again.');}
}
async function openNotifications(){
 const dialog=document.createElement('dialog');dialog.className='eh-dialog eh-panel eh-editor eh-coordination';dialog.innerHTML='<div class="eh-row"><h2>Notifications</h2><button class="eh-btn tiny" type="button" data-close>Close</button></div><p class="eh-muted">Reminders refresh every minute while EsportsHub is open. They are not push notifications and will not alert you while the site is closed.</p><div data-inbox></div><p role="status">Loading…</p>';
 dialog.querySelector('[data-close]').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();const status=dialog.querySelector('[role=status]'),box=dialog.querySelector('[data-inbox]');
 try{await refreshNotifications(true);if(!dialog.open||!s.me)return;const data=s.notifications;status.textContent='';
  const preferences=document.createElement('form');preferences.innerHTML='<h3>Notification preferences</h3><label>Remind me before events<select name="minutes"><option value="0">Off</option><option value="15">15 minutes</option><option value="30">30 minutes</option><option value="60">1 hour</option><option value="120">2 hours</option><option value="1440">1 day</option></select></label><label class="eh-inline-check"><input name="updates" type="checkbox"> Schedule changes</label><button class="eh-btn tiny" type="submit">Save preferences</button><p role="status"></p>';preferences.elements.minutes.value=String(data.preferences.reminder_minutes);preferences.elements.updates.checked=!!data.preferences.updates;preferences.onsubmit=async e=>{e.preventDefault();const button=preferences.querySelector('button'),message=preferences.querySelector('[role=status]');button.disabled=true;try{await api('/me/notification-preferences','PUT',{reminderMinutes:Number(preferences.elements.minutes.value),updates:preferences.elements.updates.checked});dialog.close();await openNotifications();}catch(error){message.textContent=error.message;}finally{button.disabled=false;}};box.append(preferences);
  if(!data.items.length)box.append(schEl('p','eh-muted','You’re all caught up.'));
  const unread=data.items.filter(x=>!x.read);if(unread.length){const all=schEl('button','eh-btn tiny','Mark all as read');all.type='button';all.onclick=async()=>{all.disabled=true;try{await api('/me/notifications/read','POST',{ids:unread.map(x=>x.id)});dialog.close();await openNotifications();}catch(error){status.textContent=error.message;all.disabled=false;}};box.append(all);}
  for(const item of data.items){const row=schEl('section','eh-notification'+(item.read?'':' eh-unread'));row.append(schEl('strong','',item.title),schEl('p','',item.message));if(item.startsAt)row.append(schEl('p','eh-muted',fmt(item.startsAt)));const button=schEl('button','eh-btn tiny',item.eventId?'Open event':item.read?'Read':'Mark as read');button.type='button';button.disabled=!item.eventId&&item.read;button.onclick=async()=>{button.disabled=true;try{await api('/me/notifications/read','POST',{ids:[item.id]});if(item.eventId){const team=s.teams.find(t=>t.id===item.teamId);if(!team)throw Error('Team access changed. Refresh the page.');const events=await api(`/teams/${encodeURIComponent(team.id)}/events`),event=events.find(x=>x.id===item.eventId);if(!event)throw Error('This event is no longer available.');dialog.close();await openEventPlan(event,team);void refreshNotifications();}else{dialog.close();await openNotifications();}}catch(error){status.textContent=error.message;button.disabled=false;}};row.append(button);box.append(row);}
 }catch(error){status.textContent=error.message;}
}
$('notificationsButton').onclick=()=>openNotifications();

async function openAttendanceHistory(team){
 const dialog=document.createElement('dialog');dialog.className='eh-dialog eh-panel eh-editor eh-coordination';dialog.innerHTML='<div class="eh-row"><h2>Attendance history</h2><button class="eh-btn tiny" type="button">Close</button></div><p class="eh-muted">Recorded attendance from the last 90 days. Unrecorded events are excluded. Excused absences are listed separately.</p><div data-summary></div><p role="status">Loading…</p>';
 dialog.querySelector('button').onclick=()=>dialog.close();dialog.addEventListener('close',()=>dialog.remove());document.body.append(dialog);dialog.showModal();const status=dialog.querySelector('[role=status]');
 try{const data=await api(`/teams/${encodeURIComponent(team.id)}/attendance`);if(!dialog.open)return;status.textContent=data.records.length?'':'No attendance has been recorded for past events in this period.';const box=dialog.querySelector('[data-summary]'),players=new Map();for(const record of data.records){if(!players.has(record.user_id))players.set(record.user_id,{name:record.name,present:0,late:0,excused:0,absent:0});const summary=players.get(record.user_id);if(record.status in summary&&record.status!=='name')summary[record.status]++;}
 for(const summary of players.values()){const row=schEl('section','eh-item');row.append(schEl('strong','',summary.name),schEl('p','',`${summary.present} present · ${summary.late} late · ${summary.excused} excused · ${summary.absent} absent`));box.append(row);}
 if(data.records.length){box.append(schEl('h3','','Recorded events'));for(const record of data.records){const row=schEl('section','eh-item');row.append(schEl('strong','',record.title),schEl('p','eh-muted',fmt(record.starts_at)),schEl('p','',record.name+' · '+roleLabel(record.status)));box.append(row);}}
 }catch(error){status.textContent='Could not load attendance history: '+error.message;}
}

function reportDocumentText(root){
 function walk(node){
  if(node.nodeType===3)return node.textContent||'';if(node.nodeType!==1)return '';
  const tag=node.tagName.toLowerCase(),inside=()=>[...node.childNodes].map(walk).join('');
  if(tag==='br')return '\n';if(['b','strong'].includes(tag))return '**'+inside()+'**';if(['i','em'].includes(tag))return '*'+inside()+'*';if(['s','strike','del'].includes(tag))return '~~'+inside()+'~~';
  if(['ul','ol'].includes(tag))return [...node.children].filter(n=>n.tagName==='LI').map((li,i)=>(tag==='ol'?(i+1)+'. ':'- ')+[...li.childNodes].map(walk).join('').trim()).join('\n')+'\n';
  if(/^h[2-4]$/.test(tag))return '#'.repeat(Number(tag[1])-1)+' '+inside().trim()+'\n';
  if(tag==='blockquote')return inside().trim().split('\n').map(x=>'> '+x).join('\n')+'\n';
  if(tag==='div'||tag==='p')return inside()+'\n';return inside();
 }
 return [...root.childNodes].map(walk).join('').replace(/\n{4,}/g,'\n\n\n').trim();
}
function mountReportEditor(source){
 if(!source||source.dataset.editorMounted)return;source.dataset.editorMounted='true';source.required=false;source.classList.add('eh-report-source');
 const wrapper=document.createElement('div');wrapper.className='eh-word-processor';const toolbar=schEl('div','eh-word-toolbar');toolbar.setAttribute('role','toolbar');toolbar.setAttribute('aria-label','Document formatting');
 const editor=document.createElement('div');editor.className='eh-document eh-rich-notes';editor.contentEditable='true';editor.setAttribute('role','textbox');editor.setAttribute('aria-label','Report content');editor.setAttribute('aria-multiline','true');editor.dataset.placeholder='Write your review, observations, and next steps…';editor.innerHTML=source.value?formatNotes(source.value):'';
 const count=schEl('div','eh-document-count');count.setAttribute('aria-live','polite');let lastRange=null;
 const remember=()=>{const selection=window.getSelection();if(selection?.rangeCount&&editor.contains(selection.anchorNode))lastRange=selection.getRangeAt(0).cloneRange();};
 const sync=()=>{source.value=reportDocumentText(editor);count.textContent=source.value.length+' / 8,000 characters';count.classList.toggle('eh-document-over-limit',source.value.length>8000);};
 function command(name,value){remember();const range=lastRange?.cloneRange();editor.focus();if(range){const selection=window.getSelection();selection.removeAllRanges();selection.addRange(range);}document.execCommand(name,false,value);sync();remember();}
 for(const [label,name,value]of [['Bold','bold',null],['Italic','italic',null],['Strikethrough','strikeThrough',null],['Heading','formatBlock','h2'],['Subheading','formatBlock','h3'],['Paragraph','formatBlock','div'],['Bullets','insertUnorderedList',null],['Numbered list','insertOrderedList',null],['Quote','formatBlock','blockquote'],['Undo','undo',null],['Redo','redo',null]]){const button=schEl('button','',label);button.type='button';button.setAttribute('aria-label',label);button.onmousedown=e=>e.preventDefault();button.onclick=()=>command(name,value);toolbar.append(button);}
 editor.addEventListener('input',()=>{sync();remember();});for(const type of ['keyup','mouseup','focus'])editor.addEventListener(type,remember);
 for(const type of ['paste','drop'])editor.addEventListener(type,e=>{e.preventDefault();editor.focus();const text=(e.clipboardData||e.dataTransfer)?.getData('text/plain')||'';document.execCommand('insertText',false,text);sync();});
 source.form?.addEventListener('submit',e=>{sync();if(!source.value.trim()||source.value.length>8000){e.preventDefault();e.stopImmediatePropagation();count.textContent=!source.value.trim()?'Write some report content first.':'Report exceeds 8,000 characters. Shorten it before saving.';editor.focus();}},true);
 wrapper.append(toolbar,editor,count);source.after(wrapper);sync();
}
function resetReportEditor(){const source=$('reportForm').elements.content,editor=source.parentElement.querySelector('.eh-document');if(editor)editor.replaceChildren();source.value='';const count=source.parentElement.querySelector('.eh-document-count');if(count)count.textContent='0 / 8,000 characters';}
function renderReports(){
 const box=$('reports');if(!box)return;box.replaceChildren();const reports=s.teamReports||[],toolbar=schEl('div','eh-reports-toolbar'),search=document.createElement('input');search.type='search';search.placeholder='Search reports, authors, or notes';search.setAttribute('aria-label','Search reports');search.value=s.reportQuery||'';
 const filter=document.createElement('select');filter.setAttribute('aria-label','Filter report type');for(const [value,label]of [['','All reports'],['scrim','Scrims'],['vod','VOD reviews'],['match','Matches'],['practice','Practices']]){const option=document.createElement('option');option.value=value;option.textContent=label;filter.append(option);}filter.value=s.reportType||'';toolbar.append(search,filter);box.append(toolbar);const total=schEl('p','eh-reports-total'),list=schEl('div','eh-report-library');box.append(total,list);
 function draw(){s.reportQuery=search.value;s.reportType=filter.value;const query=search.value.toLowerCase(),visible=reports.filter(r=>(!filter.value||r.type===filter.value)&&[r.title,r.author,r.content].some(x=>String(x||'').toLowerCase().includes(query))).sort((a,b)=>new Date(b.created_at||0)-new Date(a.created_at||0));total.textContent=visible.length+' report'+(visible.length===1?'':'s')+' · Shared with your team';list.replaceChildren();for(const report of visible){const card=schEl('article','eh-report-card'),head=schEl('div','eh-row'),meta=schEl('div','');meta.append(schEl('span','eh-report-type',report.type==='vod'?'VOD review':roleLabel(report.type)),schEl('h2','',report.title));head.append(meta);if(s.team&&managesTeam(s.team)){const edit=schEl('button','eh-btn tiny','Edit report');edit.type='button';edit.dataset.editReport=report.id;head.append(edit);}const details=schEl('p','eh-muted',[report.author,report.created_at?fmt(report.created_at):''].filter(Boolean).join(' · ')),content=schEl('div','eh-document eh-rich-notes');content.innerHTML=formatNotes(report.content);card.append(head,details,content);list.append(card);}if(!visible.length)list.append(schEl('div','sch-empty',reports.length?'No reports match your search.':'No reports yet. Shared reviews and coaching notes will appear here.'));}
 search.oninput=draw;filter.onchange=draw;draw();
 $('reportComposer').classList.toggle('hidden',!s.team||!managesTeam(s.team));
}
mountReportEditor($('reportForm').elements.content);
