// Real backend pilot; deliberately separate from the unsafe local demo role selector.
const $=id=>document.getElementById(id), state={api:localStorage.getItem('eh_live_api')||'https://esportshub-api.frankierose212005.workers.dev',me:null,games:[],teams:[],selected:null};
const escapeHtml=s=>String(s??'').replace(/[&<>"']/g,ch=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
const notify=(message,error=false)=>{$('notice').textContent=message;$('notice').style.color=error?'#b13450':'#387a62';};
async function request(path,method='GET',data){if(!state.api)throw Error('Enter your Cloudflare Worker URL first');const token=await window.Clerk?.session?.getToken();if(!token)throw Error('Sign in with Clerk first');const res=await fetch(`${state.api}${path}`,{method,headers:{...(data?{'content-type':'application/json'}:{}),'authorization':`Bearer ${token}`},...(data?{body:JSON.stringify(data)}:{})});const body=await res.json().catch(()=>({}));if(!res.ok)throw Error(body.error||`Request failed (${res.status})`);return body;}
const values=form=>Object.fromEntries(new FormData(form).entries());
function bindForm(id,callback){$(id).addEventListener('submit',async event=>{event.preventDefault();try{await callback(values(event.currentTarget));event.currentTarget.reset();}catch(e){notify(e.message,true);}});}
function options(select,items,label){select.innerHTML=items.map(x=>`<option value="${escapeHtml(x.id)}">${escapeHtml(label(x))}</option>`).join('');}
function isAdmin(){return state.me?.roles.some(x=>x.role==='admin');}
function gameManager(gameId){return isAdmin()||state.me?.roles.some(x=>x.role==='game_manager'&&x.game_id===gameId);}
function teamManager(team){return gameManager(team.game_id)||state.me?.roles.some(x=>x.role==='captain'&&x.team_id===team.id);}
async function refresh(){state.me=await request('/me');state.games=await request('/games');state.teams=await request('/teams');$('guest').classList.add('hidden');$('signed').classList.remove('hidden');$('welcome').textContent=`Signed in: ${state.me.user.name}`;$('roles').textContent=state.me.roles.map(x=>x.role.replace('_',' ')+(x.game_name?` (${x.game_name})`:'')).join(' · ');$('games').innerHTML=state.games.map(x=>`<div class="item">${escapeHtml(x.name)}</div>`).join('')||'No assigned games';$('teams').innerHTML='';state.teams.forEach(t=>{const btn=document.createElement('button');btn.textContent=`${t.name} · ${t.game_name}`;btn.onclick=()=>selectTeam(t);$('teams').append(btn)});$('gameForm').classList.toggle('hidden',!isAdmin());const editableGames=state.games.filter(g=>gameManager(g.id));$('teamForm').classList.toggle('hidden',editableGames.length===0);options($('createTeamGame'),editableGames,x=>x.name);options($('inviteGame'),state.games,x=>x.name);options($('inviteTeam'),state.teams,x=>x.name);$('staff').classList.toggle('hidden',!state.teams.some(teamManager)&&!isAdmin());if(state.selected){const team=state.teams.find(x=>x.id===state.selected.id);if(team)await selectTeam(team);else $('selected').classList.add('hidden');} $('staff').classList.toggle('hidden',!isAdmin()&&!state.teams.some(teamManager));}
async function selectTeam(t){state.selected=t;const [details,events,reports]=await Promise.all([request(`/teams/${t.id}`),request(`/teams/${t.id}/events`),request(`/teams/${t.id}/reports`)]);$('selected').classList.remove('hidden');$('teamTitle').textContent=`${t.name} · ${t.game_name}`;$('teamDesc').textContent=details.team.description||'No team description';$('members').textContent=details.members.map(x=>`${x.display_name} (${x.role})`).join(', ')||'No registered members yet';$('events').innerHTML=events.map(x=>`<div class="item"><strong>${escapeHtml(x.title)}</strong> — ${escapeHtml(x.type)} · ${escapeHtml(new Date(x.starts_at).toLocaleString())}</div>`).join('')||'No scheduled events';$('reports').innerHTML=reports.map(x=>`<div class="item"><strong>${escapeHtml(x.title)}</strong> · ${escapeHtml(x.type)}<p>${escapeHtml(x.content)}</p><small>${escapeHtml(x.author)}</small></div>`).join('')||'No shared reports';$('eventForm').classList.toggle('hidden',!teamManager(t));$('reportForm').classList.toggle('hidden',!teamManager(t));$('review').classList.toggle('hidden',!gameManager(t.game_id));if(gameManager(t.game_id)){const concerns=await request(`/teams/${t.id}/concerns`);$('concerns').innerHTML=concerns.map(x=>`<div class="item"><strong>${escapeHtml(x.status)}</strong> · ${escapeHtml(x.author)}<p>${escapeHtml(x.details)}</p></div>`).join('')||'No private concerns';}try{const a=await request(`/teams/${t.id}/availability`);$('availabilityForm').elements.slots.value=Array.isArray(a)?a.find(x=>x.user_id===state.me.user.id)?.slots?.join(',')||'':a.slots.join(',');}catch{}}
$('api').value=state.api;$('saveApi').onclick=()=>{const value=$('api').value.trim().replace(/\/$/,'');if(!/^https:\/\/[a-z0-9.-]+(?::\d+)?$/i.test(value)&&!/^http:\/\/localhost:\d+$/i.test(value))return notify('Use a valid HTTPS Worker URL (or localhost for development)',true);state.api=value;localStorage.setItem('eh_live_api',value);notify('API URL saved');};
bindForm('redeemForm',async b=>{await request('/invites/redeem','POST',{inviteToken:b.inviteToken.trim()});await refresh();notify('Invitation redeemed. Welcome to EsportsHub!');});
$('logout').onclick=async()=>{await window.Clerk.signOut();renderAuth();notify('Signed out');};
bindForm('gameForm',async b=>{await request('/games','POST',b);await refresh();notify('Game created');});
bindForm('teamForm',async b=>{await request('/teams','POST',b);await refresh();notify('Team created');});
bindForm('eventForm',async b=>{await request(`/teams/${state.selected.id}/events`,'POST',{...b,startsAt:new Date(b.startsAt).toISOString()});await selectTeam(state.selected);notify('Event scheduled');});
bindForm('reportForm',async b=>{await request(`/teams/${state.selected.id}/reports`,'POST',b);await selectTeam(state.selected);notify('Team report published');});
bindForm('availabilityForm',async b=>{const slots=b.slots.split(',').map(s=>s.trim()).filter(Boolean).map(Number);await request(`/teams/${state.selected.id}/availability`,'PUT',{slots});notify('Availability saved');});
bindForm('concernForm',async b=>{await request(`/teams/${state.selected.id}/concerns`,'POST',b);await selectTeam(state.selected);notify('Private concern submitted');});
bindForm('inviteForm',async b=>{const data={role:b.role,...(['admin'].includes(b.role)?{}:{gameId:b.gameId}),...(['player','captain'].includes(b.role)?{teamId:b.teamId}:{})};const r=await request('/invites','POST',data);$('inviteResult').replaceChildren();const input=document.createElement('input');input.readOnly=true;input.value=`${location.href.split('?')[0]}?invite=${encodeURIComponent(r.token)}`;$('inviteResult').append('Share this one-use link privately:',input);notify('Invitation created');});
const invite=new URL(location.href).searchParams.get('invite');
if(invite)$('inviteToken').value=invite;
let clerkReady=false, previousUserId=undefined, mounted=false;
function mountClerkWidgets(){
  if(mounted||!window.Clerk)return;
  mounted=true;
  const signIn=$('clerk-sign-in'),signUp=$('clerk-sign-up');
  if(signIn)window.Clerk.mountSignIn(signIn,{routing:'virtual'});
  if(signUp)window.Clerk.mountSignUp(signUp,{routing:'virtual'});
}
function showGuest(message){
  state.me=null;state.games=[];state.teams=[];state.selected=null;
  $('signed').classList.add('hidden');$('guest').classList.remove('hidden');
  if(message)notify(message,true);
}
async function renderAuth(){
  if(!clerkReady)return;
  const userId=window.Clerk.user?.id||null;
  if(!userId){previousUserId=null;showGuest();mountClerkWidgets();return;}
  $('guest').classList.add('hidden');$('signed').classList.remove('hidden');
  try{await refresh();if(previousUserId!==userId)notify('Signed in with Clerk.');previousUserId=userId;}
  catch(e){previousUserId=userId;if(e.message.includes('not been enrolled')){
    showGuest('Signed in with Clerk, but not enrolled in EsportsHub yet. Redeem your invitation below.');
    mountClerkWidgets();
  }else{showGuest(e.message);}}
}
window.addEventListener('load',async()=>{
  try{
    if(!window.Clerk||!window.__internal_ClerkUICtor)throw Error('Clerk scripts failed to load. Check internet connection and browser blockers.');
    await window.Clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor}});
    clerkReady=true;
    window.Clerk.addListener(()=>{renderAuth().catch(e=>notify(e.message,true));});
    await renderAuth();
  }catch(e){showGuest(`Clerk could not start: ${e.message}`);}
});
