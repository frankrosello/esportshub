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
function go(page){const screens=['dashboard','teams','schedule','availability','reports','concerns','invitations','members','settings'];if(!screens.includes(page))page='dashboard';if(!s.me&&page!=='dashboard')page='dashboard';if(page==='members'&&!admin())page='dashboard';document.querySelectorAll('[data-panel]').forEach(x=>x.classList.toggle('hidden',x.dataset.panel!==page));document.querySelectorAll('[data-screen]').forEach(x=>x.classList.toggle('active',x.dataset.screen===page));$('breadcrumbCurrent').textContent=({dashboard:'Overview',teams:'Teams',schedule:'Schedule',availability:'Availability',reports:'Reports',concerns:'Player concerns',invitations:'Invitations',members:'Members',settings:'Settings'})[page];document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());const destination=new URL(routes.home());destination.search=new URL(location.href).search;destination.hash=page;history.replaceState(null,'',destination.href);setMobileNav(false);}
function renderTeams(){const elements=[$('teams'),$('teamsMirror')];elements.forEach(el=>{el.replaceChildren();if(!s.teams.length){el.textContent='No assigned team yet. Your captain or manager can ask an administrator to assign you.';return;}s.teams.forEach(t=>{const b=document.createElement('button');b.type='button';b.className='eh-pick'+(s.team?.id===t.id?' active':'');b.textContent=`${t.name} · ${t.game_name}`;b.addEventListener('click',async()=>{try{await selectTeam(t);go('teams');notify(`Viewing ${t.name}`);}catch(e){notify(e.message,true);}});if(admin()&&s.teams.length>1){const row=document.createElement('div');row.className='eh-reorder';row.append(b);[['▲','Move up',-1],['▼','Move down',1]].forEach(([ic,label,d])=>{const m=document.createElement('button');m.type='button';m.className='eh-btn';m.textContent=ic;m.setAttribute('aria-label',label+' '+t.name);m.addEventListener('click',()=>moveTeam(t.id,d));row.append(m);});el.append(row);}else el.append(b);});});}
async function refresh(){const [me,games,teams]=await Promise.all([api('/me'),api('/games'),api('/teams')]);s.me=me;s.games=games;s.teams=teams;$('loginPage').classList.add('hidden');$('dashboardShell').classList.remove('hidden');$('guest').classList.add('hidden');$('signed').classList.remove('hidden');$('logout').classList.remove('hidden');$('authStatus').textContent='Connected';$('welcome').textContent=me.user.name.split(' ')[0];$('sidebarName').textContent=me.user.name;$('sidebarRole').textContent=me.roles.map(m=>m.role.replace('_',' ')).join(' · ')||'Member';$('sidebarAvatar').textContent=me.user.name.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();$('roles').textContent=me.roles.map(m=>m.role.replace('_',' ')+(m.game_name?` · ${m.game_name}`:'')).join(' · ');$('statGames').textContent=games.length;$('statTeams').textContent=teams.length;$('statRole').textContent=admin()?'Admin':me.roles[0]?.role.replace('_',' ')||'Member';$('games').innerHTML=games.map(g=>`<div class="eh-item"><strong>${escapeHtml(g.name)}</strong></div>`).join('')||'No assigned games yet.';renderTeams();$('gameForm').classList.toggle('hidden',!admin());const managed=games.filter(g=>managesGame(g.id));$('teamForm').classList.toggle('hidden',!managed.length);listOptions($('createTeamGame'),managed,g=>g.name);listOptions($('inviteGame'),games,g=>g.name);listOptions($('inviteTeam'),teams,t=>t.name);$('staff').classList.toggle('hidden',!admin()&&!teams.some(managesTeam));document.querySelector('[data-screen="invitations"]').classList.toggle('hidden',!admin()&&!teams.some(managesTeam));$('membersNav').classList.toggle('hidden',!admin());$('waitingForTeam').classList.toggle('hidden',!me.roles.some(m=>m.role==='player'&&!m.game_id&&!m.team_id));if(admin())await loadMemberDirectory();const current=teams.find(t=>t.id===s.team?.id)||teams[0];if(current)await selectTeam(current);else clearTeam();go((location.hash||'#dashboard').slice(1));renderDashboard();fillProfile();notify('Connected securely through Clerk.');}
function clearTeam(){s.team=null;s.teamMembers=[];s.events=[];s.teamReports=[];s.teamAvailability=[];renderDashboard();$('selected').classList.add('hidden');['events','reports','members','concerns'].forEach(id=>$(id).textContent='Select a team to view this section.');['eventForm','reportForm','review'].forEach(id=>$(id).classList.add('hidden'));document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());}
async function selectTeam(t){const [info,events,reports,availability]=await Promise.all([api(`/teams/${t.id}`),api(`/teams/${t.id}/events`),api(`/teams/${t.id}/reports`),api(`/teams/${t.id}/availability`)]);s.team=t;$('selected').classList.remove('hidden');$('teamTitle').textContent=`${t.name} · ${t.game_name}`;$('teamDesc').textContent=info.team.description||'No description';s.events=events;s.teamMembers=info.members||[];s.teamReports=reports||[];s.teamAvailability=Array.isArray(availability)?availability:(availability.members||availability.availability||[]);renderSchedule();renderRoster();renderDashboard();$('reports').innerHTML=reports.map(r=>`<div class="eh-item"><strong>${escapeHtml(r.title)}</strong><div class="eh-muted">${escapeHtml(r.type)} · ${escapeHtml(r.author||'')}</div><p>${escapeHtml(r.content)}</p></div>`).join('')||'No reports published.';$('eventForm').classList.toggle('hidden',!managesTeam(t));$('reportForm').classList.toggle('hidden',!managesTeam(t));$('review').classList.toggle('hidden',!managesGame(t.game_id));if(managesGame(t.game_id)){const concerns=await api(`/teams/${t.id}/concerns`);$('concerns').innerHTML=concerns.map(c=>`<div class="eh-item"><strong>${escapeHtml(c.status||'Open')}</strong> · ${escapeHtml(c.author)}<p>${escapeHtml(c.details)}</p></div>`).join('')||'No private concerns.';}const mine=Array.isArray(availability)?availability.find(x=>x.user_id===s.me.user.id)?.slots||[]:availability.slots||[];s.slots=new Set(mine.map(Number));s.avEditing=false;updateGrid();renderTeamAvailability();renderTeams();document.querySelectorAll('.eh-selected').forEach(x=>x.textContent=selectedLabel());}
function form(id,fn){$(id).addEventListener('submit',async e=>{e.preventDefault();const element=e.currentTarget;const values=Object.fromEntries(new FormData(element).entries());try{await fn(values);element.reset();}catch(err){notify(err.message,true);}});}
form('gameForm',async b=>{await api('/games','POST',{name:b.name});await refresh();notify('Game created');});
form('teamForm',async b=>{await api('/teams','POST',b);await refresh();notify('Team created');});
form('eventForm',async b=>{if(!s.team)throw Error('Select a team first');const when=new Date(`${b.date}T${b.time}`);if(!b.date||!b.time||isNaN(when))throw Error('Choose a valid date and time');const {date,time,...rest}=b;await api(`/teams/${s.team.id}/events`,'POST',{...rest,startsAt:when.toISOString()});s.calMonth=new Date(when.getFullYear(),when.getMonth(),1);s.calSel=date;await selectTeam(s.team);notify('Event scheduled');});
form('reportForm',async b=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/reports`,'POST',b);await selectTeam(s.team);notify('Report published');});
form('concernForm',async b=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/concerns`,'POST',b);if(managesGame(s.team.game_id))await selectTeam(s.team);notify('Private concern submitted');});
form('availabilityForm',async()=>{if(!s.team)throw Error('Select a team first');await api(`/teams/${s.team.id}/availability`,'PUT',{slots:[...s.slots].sort((a,b)=>a-b)});await selectTeam(s.team);notify('Availability saved');});
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
function updateGrid(){document.querySelectorAll('#weekGrid button[data-slot]').forEach(b=>{const on=s.slots.has(Number(b.dataset.slot));b.classList.toggle('chosen',on&&s.avEditing); b.setAttribute('aria-pressed',on?'true':'false');});$('availabilityForm').elements.slots.value=[...s.slots].join(',');}
function buildGrid(){const grid=$('weekGrid');const frag=document.createDocumentFragment();const mk=(tag,cls,txt)=>{const e=document.createElement(tag);e.className='cell '+cls;e.textContent=txt;return e;};frag.append(mk('div','head','Time'));days.forEach(d=>frag.append(mk('div','head',d)));for(let half=0;half<48;half++){const hh=String(Math.floor(half/2)).padStart(2,'0');frag.append(mk('div','time',`${hh}:${half%2?'30':'00'}`));for(let day=0;day<7;day++){const slot=day*48+half;const b=mk('button','', '');b.type='button';b.dataset.slot=slot;b.setAttribute('aria-label',`${days[day]} ${hh}:${half%2?'30':'00'}`);b.addEventListener('pointerdown',e=>{if(e.button!==0)return;dragging=true;suppressClick=true;paint=!s.slots.has(slot);if(paint)s.slots.add(slot);else s.slots.delete(slot);updateGrid();});b.addEventListener('pointerenter',()=>{if(dragging){if(paint)s.slots.add(slot);else s.slots.delete(slot);updateGrid();}});b.addEventListener('click',()=>{if(suppressClick){suppressClick=false;return;}if(s.slots.has(slot))s.slots.delete(slot);else s.slots.add(slot);updateGrid();});frag.append(b);}}grid.append(frag);}window.addEventListener('pointerup',()=>{dragging=false;});buildGrid();
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
function mountClerk(){
  if(!s.clerkReady||window.Clerk.user)return;
  const returnUrl=authReturnUrl();
  const options={...routes.clerkOptions(returnUrl,pendingInvite),routing:'virtual',forceRedirectUrl:returnUrl,fallbackRedirectUrl:returnUrl,appearance:{elements:{rootBox:{width:'100%',maxWidth:'100%'},cardBox:{width:'100%',maxWidth:'100%'},card:{width:'100%',maxWidth:'100%'},formFieldInput:{fontSize:'16px'}}}};
  if(!signInMounted){
    try{window.Clerk.mountSignIn($('clerk-sign-in'),{...options,withSignUp:false});signInMounted=true;}
    catch(e){$('signInLoading').textContent='Sign-in could not load: '+e.message;}
  }
  if(!signUpMounted){
    try{window.Clerk.mountSignUp($('clerk-sign-up'),options);signUpMounted=true;}
    catch(e){$('signUpLoading').textContent='Sign-up could not load: '+e.message;}
  }
  if(signInMounted)$('signInLoading').textContent='';
  if(signUpMounted)$('signUpLoading').textContent='';
}
function showGuest(msg){s.me=null;$('loginPage').classList.remove('hidden');$('dashboardShell').classList.add('hidden');$('guest').classList.remove('hidden');$('signed').classList.add('hidden');$('logout').classList.add('hidden');$('authStatus').textContent='Sign in required';$('sidebarName').textContent='Not signed in';$('sidebarRole').textContent='Clerk authentication';$('guestNotice').textContent=msg||'';$('accountRecovery').classList.toggle('hidden',!window.Clerk?.user||!msg);$('accountRecoveryStatus').textContent=msg||'';mountClerk();}
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
  if(window.Clerk?.user)return;
  $('authCard').classList.remove('hidden');$('signUpCard').classList.remove('hidden');$('signUpCard').classList.remove('hidden');
  mountClerk();
  const card=$(mode==='signup'?'signUpCard':'authCard');
  card.scrollIntoView({behavior:'smooth',block:'center'});
  const field=card.querySelector('input');if(field)field.focus();
}
$('inviteSignIn').onclick=()=>chooseAuth('signin');
$('inviteSignUp').onclick=()=>chooseAuth('signup');
$('retryWorkspace').onclick=()=>{void renderAuth().catch(e=>showGuest(e.message));};
$('recoverySignOut').onclick=async()=>{await window.Clerk.signOut({redirectUrl:authReturnUrl()});};
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
    if(!window.Clerk.user){
      $('authCard').classList.remove('hidden');$('signUpCard').classList.remove('hidden');$('invitationCard').classList.toggle('hidden',!pendingInvite);$('inviteAuthButtons').classList.remove('hidden');$('acceptInvite').classList.add('hidden');$('invitationSwitch').classList.add('hidden');$('invitationAccount').textContent='';
      $('invitationStatus').textContent='You have been invited to EsportsHub. Create an account or sign in, then review and accept your invitation.';showGuest();return;
    }
    unmountClerk();$('invitationSwitch').classList.remove('hidden');
    if(pendingInvite){await showInvitation();return;}
    try{await refresh();}catch(e){$('authCard').classList.add('hidden');$('signUpCard').classList.add('hidden');showGuest(e.message);if(e.status===403){$('enrollmentCard').classList.remove('hidden');$('guestNotice').textContent='Your account is signed in. Accept an invitation from your captain or manager to join a team.';}}
  }finally{s.rendering=false;if(s.authQueued){s.authQueued=false;void renderAuth();}}
}
window.addEventListener('load',async()=>{try{if(!window.Clerk)throw Error('Clerk script did not load. Reload the page or check browser content blocking.');await window.Clerk.load({...routes.clerkOptions(authReturnUrl(),pendingInvite),signInForceRedirectUrl:authReturnUrl(),signInFallbackRedirectUrl:authReturnUrl(),signUpForceRedirectUrl:authReturnUrl(),signUpFallbackRedirectUrl:authReturnUrl(),...(window.__internal_ClerkUICtor?{ui:{ClerkUI:window.__internal_ClerkUICtor}}:{})});s.clerkReady=true;window.Clerk.addListener(()=>{void renderAuth().catch(e=>{showGuest(e.message);});});await renderAuth();}catch(e){$('signInLoading').textContent='Unable to load sign-in: '+e.message;$('signUpLoading').textContent='Unable to load sign-up: '+e.message;notify('Unable to start Clerk: '+e.message,true);showGuest(e.message);}});

// Profile editing (name, username, picture) through Clerk.
function fillProfileBasics(){const u=window.Clerk?.user;if(!u)return;showAvatars();$('pfFirst').value=u.firstName||'';$('pfLast').value=u.lastName||'';$('pfUser').value='';$('pfEmail').textContent=u.primaryEmailAddress?.emailAddress||'';}
function showAvatars(){
  const u=window.Clerk?.user;if(!u)return;
  const full=[u.firstName,u.lastName].filter(Boolean).join(' ')||'Member';
  const initials=full.split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
  [$('pfAvatarPreview'),$('sidebarAvatar')].forEach(el=>{
    el.replaceChildren();
    if(u.hasImage&&u.imageUrl){const i=document.createElement('img');i.alt='';i.src=u.imageUrl;i.style.cssText='width:100%;height:100%;object-fit:cover;border-radius:50%';el.append(i);}
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
  e.preventDefault();const u=window.Clerk?.user;if(!u)return;
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
  $('sidebarName').textContent=full;$('welcome').textContent=full.split(' ')[0];
  showAvatars();
  status.textContent=problems.length?'Some changes did not save: '+problems.join(' · '):'Profile saved.';
  btn.disabled=false;
});
$('pfManage').onclick=()=>window.Clerk?.openUserProfile?.();

// ---- Extended profile: main game, per-game usernames, banner ----
const BANNERS={purple:'linear-gradient(135deg,#6326a6,#bd94ed)',sunset:'linear-gradient(135deg,#f12711,#f5af19)',ocean:'linear-gradient(135deg,#1c92d2,#2af598)',forest:'linear-gradient(135deg,#134e5e,#71b280)',night:'linear-gradient(135deg,#0f2027,#2c5364)'};
function applyBanner(el,value){
  el.style.backgroundImage=BANNERS.purple;
  if(typeof value==='string'&&value.startsWith('preset:')&&BANNERS[value.slice(7)])el.style.backgroundImage=BANNERS[value.slice(7)];
  else if(typeof value==='string'&&/^https:\/\//.test(value))el.style.backgroundImage='url("'+value.replace(/["\\\s]/g,encodeURIComponent)+'")';
}
function bannerValue(){return $('pfBanner').value==='custom'?$('pfBannerUrl').value.trim():$('pfBanner').value;}
const bannerCache={};
async function bannerBlobUrl(userId){
  if(bannerCache[userId])return bannerCache[userId];
  const token=await window.Clerk?.session?.getToken();
  const r=await fetch(s.api+'/banner/'+encodeURIComponent(userId),{headers:{Authorization:'Bearer '+token}});
  if(!r.ok)throw Error('No banner ('+r.status+')');
  return bannerCache[userId]=URL.createObjectURL(await r.blob());
}
async function applyBannerFor(el,value,userId){
  applyBanner(el,value);
  if(value!=='upload')return null;
  try{const url=await bannerBlobUrl(userId);el.style.backgroundImage='url("'+url+'")';return url;}catch{return null;}
}
async function uploadBanner(f){
  if(f.size>4*1024*1024)throw Error('Banner is over 4 MB');
  const token=await window.Clerk?.session?.getToken();
  const r=await fetch(s.api+'/me/banner',{method:'PUT',headers:{Authorization:'Bearer '+token,'Content-Type':f.type||'application/octet-stream'},body:f});
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
async function fillProfile(){
  fillProfileBasics();
  const games=s.games||[];
  $('pfMain').innerHTML='<option value="">None</option>'+games.map(g=>`<option value="${escapeHtml(g.id)}">${escapeHtml(g.name)}</option>`).join('');
  $('pfGames').innerHTML=games.length?games.map(g=>`<label>${escapeHtml(g.name)}<input data-game="${escapeHtml(g.id)}" maxlength="64" placeholder="Username in ${escapeHtml(g.name)}"/></label>`).join(''):'No games available yet.';
  let prof={};
  try{prof=await api('/profile/'+encodeURIComponent(s.me.user.id));}catch{}
  $('pfDiscord').value=prof.discord_username||'';$('pfMain').value=prof.main_game_id||'';$('pfUser').value=prof.username||'';
  (prof.game_usernames||[]).forEach(x=>{const i=$('pfGames').querySelector(`[data-game="${CSS.escape(String(x.game_id))}"]`);if(i)i.value=x.username;});
  const b=prof.banner||'preset:purple';
  if(b.startsWith('https://')){$('pfBanner').value='custom';$('pfBannerUrl').value=b;}else if(b==='upload')$('pfBanner').value='upload';else $('pfBanner').value=BANNERS[b.slice(7)]?b:'preset:purple';
  refreshBannerPreview();
}
async function saveAppProfile(){
  const game_usernames={};$('pfGames').querySelectorAll('input[data-game]').forEach(i=>{const v=i.value.trim();if(v)game_usernames[i.dataset.game]=v;});
  try{await api('/me/profile','PUT',{discord_username:$('pfDiscord').value.trim(),username:$('pfUser').value.trim(),main_game_id:$('pfMain').value||null,banner:bannerValue()||'preset:purple',game_usernames});}
  catch(e){throw Error('Game profile: '+e.message);}

}
// ---- View another member's profile (Discord-style card) ----
const PRESET_COLORS={purple:'#6326a6',sunset:'#f12711',ocean:'#1c92d2',forest:'#2f7a5a',night:'#2c5364'};
function sampleColor(url){return new Promise(res=>{if(!url)return res(null);const img=new Image();img.crossOrigin='anonymous';img.onload=()=>{try{const c=document.createElement('canvas');c.width=c.height=8;const x=c.getContext('2d');x.drawImage(img,0,0,8,8);const d=x.getImageData(0,0,8,8).data;let r=0,g=0,b=0,n=0;for(let i=0;i<d.length;i+=4){r+=d[i];g+=d[i+1];b+=d[i+2];n++;}res(`rgb(${r/n|0},${g/n|0},${b/n|0})`);}catch{res(null);}};img.onerror=()=>res(null);img.src=url;});}
async function profileColor(banner,avatar){
  if(typeof banner==='string'&&banner.startsWith('preset:'))return PRESET_COLORS[banner.slice(7)]||PRESET_COLORS.purple;
  return (await sampleColor(banner))||(await sampleColor(avatar))||PRESET_COLORS.purple;
}
const pd=$('profileDialog');$('pdClose').onclick=()=>pd.close();
pd.addEventListener('click',e=>{if(e.target===pd)pd.close();});
function setAvatar(url,name){
  const el=$('pdAvatar');el.replaceChildren();
  if(typeof url==='string'&&url.startsWith('https://')){const i=document.createElement('img');i.alt='';i.src=url;i.onerror=()=>{el.replaceChildren(document.createTextNode(initials));};el.append(i);}
  const initials=(name||'?').split(' ').slice(0,2).map(x=>x[0]).join('').toUpperCase();
  if(!el.firstChild)el.textContent=initials;
}
document.addEventListener('click',async e=>{
  const btn=e.target.closest('[data-profile]');if(!btn)return;
  const {profile:uid,name,role}=btn.dataset;$('pdEdit').classList.toggle('hidden',uid!==s.me?.user?.id);
  pd.style.removeProperty('--pc');
  $('pdName').textContent=name;$('pdMeta').textContent='';$('pdRole').textContent=role.replace('_',' ');
  $('pdMain').textContent='';$('pdGames').textContent='';$('pdDiscord').textContent='';$('pdNote').textContent='Loading…';
  applyBanner($('pdBanner'),'preset:purple');setAvatar(null,name);$('pdMainWrap').classList.add('hidden');
  pd.showModal();
  try{
    const p=await api('/profile/'+encodeURIComponent(uid));
    $('pdName').textContent=p.name||name;
    $('pdMeta').textContent=p.username?'@'+p.username:'';$('pdDiscord').textContent=p.discord_username||'Not provided';
    const bUrl=await applyBannerFor($('pdBanner'),p.banner,uid);setAvatar(p.image_url,p.name||name);
    const main=(s.games.find(g=>g.id===p.main_game_id)||{}).name||p.main_game_name;
    $('pdMain').textContent=main||'';$('pdMainWrap').classList.toggle('hidden',!main);
    const list=(p.game_usernames||[]).map(x=>`<div class="eh-ign"><span>${escapeHtml(x.game_name||'Game')}</span><strong>${escapeHtml(x.username)}</strong></div>`).join('');
    $('pdGames').innerHTML=list||'<span class="eh-muted">None added yet.</span>';$('pdNote').textContent='';
    pd.style.setProperty('--pc',await profileColor(p.banner==='upload'?bUrl:p.banner,p.image_url));
  }catch(err){$('pdNote').textContent='Could not load full profile: '+err.message;}
});
// ---- Admin: reorder teams ----
async function moveTeam(id,d){
  const i=s.teams.findIndex(t=>t.id===id),j=i+d;if(i<0||j<0||j>=s.teams.length)return;
  const prev=[...s.teams];[s.teams[i],s.teams[j]]=[s.teams[j],s.teams[i]];renderTeams();
  try{await api('/teams/order','PUT',{ids:s.teams.map(t=>t.id)});notify('Team order saved.');}
  catch(e){s.teams=prev;renderTeams();notify('Could not save team order: '+e.message,true);}
}

// ---- Schedule: date-sorted list + month calendar ----
s.events=[];
s.schedView=(()=>{try{return localStorage.getItem('eh_sched_view')||'list';}catch{return 'list';}})();
s.calMonth=new Date();s.calMonth.setDate(1);s.calSel=null;
const schEl=(tag,cls,text)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(text!=null)n.textContent=text;return n;};
const schDay=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0');
const schTime=d=>d.toLocaleTimeString(undefined,{hour:'numeric',minute:'2-digit'});
const schType=t=>String(t||'event').replace(/[^a-z]/g,'')||'event';
function schCard(e){
  const c=schEl('div','eh-item sch-card sch-'+schType(e.type)),top=schEl('div','sch-top');
  top.append(schEl('span','sch-time',schTime(e.d)),schEl('span','sch-type',e.type||'event'));
  c.append(top,schEl('strong','',e.title));
  if(e.opponent)c.append(schEl('div','eh-muted','vs '+e.opponent));
  if(e.notes)c.append(schEl('p','',e.notes));
  return c;
}
function schList(box,evs){
  if(!evs.length){box.append(schEl('p','eh-muted','No events scheduled.'));return;}
  const today=new Date();today.setHours(0,0,0,0);
  const up=evs.filter(e=>e.d>=today),past=evs.filter(e=>e.d<today).reverse();
  const group=arr=>{const f=document.createDocumentFragment();let last='';arr.forEach(e=>{const k=schDay(e.d);if(k!==last){last=k;f.append(schEl('h3','sch-day',e.d.toLocaleDateString(undefined,{weekday:'long',month:'long',day:'numeric',year:'numeric'})));}f.append(schCard(e));});return f;};
  box.append(up.length?group(up):schEl('p','eh-muted','No upcoming events.'));
  if(past.length){const d=schEl('details','sch-past');d.append(schEl('summary','',`Past events (${past.length})`),group(past));box.append(d);}
}
function schCalendar(box,evs){
  const m=s.calMonth,y=m.getFullYear(),mo=m.getMonth(),now=new Date(),todayKey=schDay(now);
  if(!s.calSel)s.calSel=todayKey;
  const head=schEl('div','sch-calhead');
  const btn=(label,aria,fn)=>{const b=schEl('button','eh-btn',label);b.type='button';b.setAttribute('aria-label',aria);b.onclick=fn;return b;};
  head.append(btn('‹','Previous month',()=>{s.calMonth=new Date(y,mo-1,1);renderSchedule();}),
    schEl('strong','',m.toLocaleDateString(undefined,{month:'long',year:'numeric'})),
    btn('Today','Go to today',()=>{s.calMonth=new Date(now.getFullYear(),now.getMonth(),1);s.calSel=todayKey;renderSchedule();}),
    btn('›','Next month',()=>{s.calMonth=new Date(y,mo+1,1);renderSchedule();}));
  const byDay={};evs.forEach(e=>{(byDay[schDay(e.d)]=byDay[schDay(e.d)]||[]).push(e);});
  const grid=schEl('div','sch-grid');
  ['Sun','Mon','Tue','Wed','Thu','Fri','Sat'].forEach(d=>grid.append(schEl('div','sch-dow',d)));
  const first=new Date(y,mo,1),weeks=Math.ceil((first.getDay()+new Date(y,mo+1,0).getDate())/7);
  for(let i=0;i<weeks*7;i++){
    const d=new Date(y,mo,1-first.getDay()+i),k=schDay(d),list=byDay[k]||[];
    const cell=schEl('button','sch-cell'+(d.getMonth()!==mo?' other':'')+(k===todayKey?' today':'')+(k===s.calSel?' sel':''));
    cell.type='button';cell.setAttribute('aria-label',d.toLocaleDateString(undefined,{dateStyle:'full'})+', '+list.length+' events');
    cell.append(schEl('span','sch-num',String(d.getDate())));
    list.slice(0,3).forEach(e=>cell.append(schEl('span','sch-chip sch-'+schType(e.type),schTime(e.d)+' '+e.title)));
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
  const box=$('events');box.replaceChildren();
  const bar=schEl('div','sch-bar');
  [['list','List'],['calendar','Calendar']].forEach(([v,label])=>{
    const b=schEl('button','eh-btn',label);b.type='button';b.setAttribute('aria-pressed',String(s.schedView===v));
    b.onclick=()=>{s.schedView=v;try{localStorage.setItem('eh_sched_view',v);}catch{}renderSchedule();};bar.append(b);
  });
  box.append(bar);
  const evs=(s.events||[]).map(e=>({...e,d:new Date(e.starts_at)})).filter(e=>!isNaN(e.d)).sort((a,b)=>a.d-b.d);
  if(s.schedView==='calendar')schCalendar(box,evs);else schList(box,evs);
}


// Player-centered dashboard, roster, team availability and profile entry point.
function profileButton(m){const id=m.user_id||m.id||'',name=m.display_name||m.name||'Member',role=m.role||'player';return `<button type="button" class="eh-btn tiny" data-profile="${escapeHtml(id)}" data-name="${escapeHtml(name)}" data-role="${escapeHtml(role)}">Profile / contact</button>`;}
function renderDashboard(){
  const ev=$('dashEvents'),co=$('dashContacts'),rp=$('dashReports'),av=$('dashAvailability');if(!ev)return;
  const now=new Date(),up=(s.events||[]).filter(x=>new Date(x.starts_at)>=now).sort((a,b)=>new Date(a.starts_at)-new Date(b.starts_at)).slice(0,5);
  ev.innerHTML=up.map(e=>`<div class="eh-item eh-dashboard-event sch-${escapeHtml(schType(e.type))}"><strong>${escapeHtml(e.title)}</strong><span class="sch-type">${escapeHtml(e.type||'event')}</span><div class="eh-muted">${escapeHtml(fmt(e.starts_at))}${e.opponent?' · vs '+escapeHtml(e.opponent):''}</div>${e.notes?`<p>${escapeHtml(e.notes)}</p>`:''}</div>`).join('')||'<p class="eh-muted">No upcoming events for this team.</p>';
  const members=s.teamMembers||[],captains=members.filter(m=>m.role==='captain'),managers=members.filter(m=>['game_manager','team_manager'].includes(m.role));
  const contact=(title,list)=>`<h3>${title}</h3>`+(list.length?list.map(m=>`<div class="eh-contact"><div><strong>${escapeHtml(m.display_name||m.name)}</strong><small>${escapeHtml(m.role.replace('_',' '))}</small></div>${profileButton(m)}</div>`).join(''):'<p class="eh-muted">Not assigned or not visible in this team.</p>');
  co.innerHTML=contact('Captain',captains)+contact('Game / team managers',managers);
  rp.innerHTML=(s.teamReports||[]).slice(0,4).map(r=>`<div class="eh-item"><strong>${escapeHtml(r.title)}</strong><div class="eh-muted">${escapeHtml(r.type||'Report')} · ${escapeHtml(r.author||'')}</div><p class="eh-note-preview">${escapeHtml(r.content||'')}</p></div>`).join('')||'<p class="eh-muted">No shared scrim notes yet.</p>';
  const entries=s.teamAvailability||[];av.innerHTML=`<p class="eh-muted">${entries.length} teammate availability ${entries.length===1?'entry':'entries'} loaded for ${escapeHtml(s.team?.name||'your team')}.</p><p class="eh-muted">Open availability to see the weekly overview and edit your times.</p>`;
}
function renderRoster(){
 const target=$('members');if(!target)return;
 const members=s.teamMembers||[],can=!!s.team&&!!managesTeam(s.team);
 const captains=members.filter(m=>m.role==='captain');
 const others=members.filter(m=>m.role==='player');
 const subs=others.filter(m=>['sub','substitute'].includes(String(m.roster_status||m.lineup_status||m.position||'').toLowerCase()));
 const starters=others.filter(m=>!subs.includes(m));
 const group=(title,items)=>`<section class="eh-roster-group"><h3>${title} <span class="eh-muted">(${items.length})</span></h3>`+(items.map(m=>`<div class="eh-roster-member"><div><strong>${escapeHtml(m.display_name||m.name)}</strong><div class="eh-muted">${escapeHtml(m.role||'player')}</div></div><div class="eh-roster-actions">${profileButton(m)}${can&&m.role==='player'?`<select aria-label="Lineup status for ${escapeHtml(m.display_name)}" data-lineup-user="${escapeHtml(m.user_id||m.id)}"><option value="starter" ${!subs.includes(m)?'selected':''}>Starter</option><option value="sub" ${subs.includes(m)?'selected':''}>Substitute</option></select>`:''}</div></div>`).join('')||'<p class="eh-muted">No members in this section.</p>')+'</section>';
 target.innerHTML=group('Captain',captains)+group('Players · starters',starters)+group('Substitutes',subs);
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
 list.innerHTML=`<p class="eh-muted">${entries.length} saved teammate schedules. Darker slots indicate more people available.</p>`+entries.map(entry=>`<div class="eh-availability-person"><strong>${escapeHtml(memberNames.get(String(entry.user_id))||entry.display_name||'Team member')}</strong><span>${Array.isArray(entry.slots)?entry.slots.length:0} half-hour blocks</span></div>`).join('');
 $('availabilityHeading').textContent=s.avEditing?'Editing my availability':'Team availability';
 $('editAvailability').textContent=s.avEditing?'Done editing':'Edit my availability';
 $('saveAvailability').classList.toggle('hidden',!s.avEditing);
 $('availabilityHint').textContent=s.avEditing?'Click or drag to select your available times. Save when finished.':'Team availability is view-only. Select Edit my availability to change your schedule.';
 const count=new Map();entries.forEach(a=>(a.slots||[]).forEach(k=>count.set(Number(k),(count.get(Number(k))||0)+1)));
 $('weekGrid').querySelectorAll('button[data-slot]').forEach(b=>{const n=count.get(Number(b.dataset.slot))||0;b.disabled=!s.avEditing;b.classList.toggle('eh-heat',!s.avEditing&&n>0);b.style.setProperty('--heat',entries.length?String(.13+.7*n/entries.length):'0');b.title=s.avEditing?'Edit your availability':`${n} of ${entries.length} teammates available`;});
 updateGrid();
}
$('editAvailability').addEventListener('click',()=>{s.avEditing=!s.avEditing;renderTeamAvailability();});

document.querySelectorAll('[data-jump]').forEach(b=>b.onclick=()=>go(b.dataset.jump));
$('openSelfProfile').addEventListener('click',()=>{if(!s.me)return;const m={user_id:s.me.user.id,display_name:s.me.user.name,role:s.me.roles?.[0]?.role||'player'};const b=document.createElement('button');b.dataset.profile=m.user_id;b.dataset.name=m.display_name;b.dataset.role=m.role;b.hidden=true;document.body.append(b);b.click();b.remove();});
$('pdEdit').addEventListener('click',()=>{pd.close();go('settings');$('pfFirst').focus();});
