import { createClient } from '@libsql/client/web';
import { createClerkClient } from '@clerk/backend';

const uuid = () => crypto.randomUUID();
const j = (data, status=200) => Response.json(data,{status});
function fail(status,message){throw Object.assign(new Error(message),{status});}
const clean=(x,n=200)=>String(x??'').trim().slice(0,n);
function required(x,n=200){const v=clean(x,n);if(!v)fail(400,'Missing required field');return v;}
async function body(req){if(!(req.headers.get('content-type')||'').includes('application/json'))fail(415,'Expected JSON');let v;try{v=await req.json();}catch{fail(400,'Invalid JSON');}if(!v||Array.isArray(v)||typeof v!=='object')fail(400,'Invalid JSON');return v;}
const q=(db,sql,args=[])=>db.execute({sql,args});
const one=async(db,sql,args=[]) => (await q(db,sql,args)).rows[0]||null;
const later=h=>new Date(Date.now()+h*3600000).toISOString();
const hex=buf=>Array.from(buf,x=>x.toString(16).padStart(2,'0')).join('');
const token=()=>hex(crypto.getRandomValues(new Uint8Array(32)));
const sha=async text=>hex(new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(text))));
const memberships=async(db,id)=>(await q(db,'SELECT m.role,m.game_id,m.team_id,g.name AS game_name,t.name AS team_name FROM memberships m LEFT JOIN games g ON g.id=m.game_id LEFT JOIN teams t ON t.id=m.team_id WHERE m.user_id=?',[id])).rows;
const admin=ms=>ms.some(m=>m.role==='admin');
const managesGame=(ms,id)=>admin(ms)||ms.some(m=>m.role==='game_manager'&&m.game_id===id);
const manageTeam=(ms,t)=>managesGame(ms,t.game_id)||ms.some(m=>m.role==='captain'&&m.team_id===t.id);
const belongs=(ms,t)=>manageTeam(ms,t)||ms.some(m=>m.role==='player'&&m.team_id===t.id);
async function teamById(db,id){const t=await one(db,'SELECT * FROM teams WHERE id=?',[id]);if(!t)fail(404,'Team not found');return t;}

async function clerkIdentity(req,env){
  if(!env.CLERK_SECRET_KEY||!env.CLERK_PUBLISHABLE_KEY)fail(503,'Clerk is not configured');
  const client=createClerkClient({secretKey:env.CLERK_SECRET_KEY,publishableKey:env.CLERK_PUBLISHABLE_KEY});
  const origins=(env.FRONTEND_ORIGIN||'').split(',').map(x=>x.trim()).filter(Boolean);
  const state=await client.authenticateRequest(req,{authorizedParties:origins,acceptsToken:'session_token'});
  if(!state.isAuthenticated)fail(401,'Sign in with Clerk');
  const clerkUserId=state.toAuth().userId;
  if(!clerkUserId)fail(401,'Invalid Clerk session');
  return {clerkUserId,client};
}
async function currentUser(req,env,db){
  const {clerkUserId}=await clerkIdentity(req,env);
  const u=await one(db,'SELECT id,email,display_name FROM users WHERE clerk_user_id=?',[clerkUserId]);
  if(!u)fail(403,'Your Clerk account has not been enrolled in EsportsHub');
  return {id:u.id,name:u.display_name,email:u.email,roles:await memberships(db,u.id),clerkUserId};
}
async function clerkProfile(client,clerkUserId){
  const user=await client.users.getUser(clerkUserId);
  const email=user.emailAddresses.find(e=>e.id===user.primaryEmailAddressId)?.emailAddress || user.emailAddresses[0]?.emailAddress;
  if(!email)fail(400,'Add a verified email address to Clerk');
  const selected=user.emailAddresses.find(e=>e.emailAddress===email);
  if(selected?.verification?.status!=='verified')fail(403,'Verify your email address in Clerk first');
  return {email:email.toLowerCase(),name:clean([user.firstName,user.lastName].filter(Boolean).join(' ')||user.username||email.split('@')[0],80)};
}
// The preexisting password_hash NOT NULL column is populated with an unusable
// random marker for newly enrolled Clerk users. It is NEVER a password hash;
// run the supplied migration later to remove the legacy column entirely.
const legacyMarker=()=>`clerk-disabled-${uuid()}-${uuid()}`;
async function enrollUser(db,clerkUserId,profile){
  const id=uuid();
  await q(db,'INSERT INTO users(id,email,display_name,password_hash,clerk_user_id) VALUES(?,?,?,?,?)',[id,profile.email,profile.name,legacyMarker(),clerkUserId]);
  return id;
}
async function app(req,env){
  const path=new URL(req.url).pathname.replace(/\/$/,'')||'/';
  const method=req.method;
  if(method==='GET'&&path==='/health')return j({ok:true,service:'EsportsHub API',auth:'Clerk'});
  if(!env.TURSO_DATABASE_URL||!env.TURSO_AUTH_TOKEN)fail(503,'Turso is not configured');
  const db=createClient({url:env.TURSO_DATABASE_URL,authToken:env.TURSO_AUTH_TOKEN});
  if(method==='GET'&&path==='/health/db'){await q(db,'SELECT 1');return j({ok:true,database:'connected'});}
  // First-admin enrollment requires both a real Clerk session and the bootstrap
  // secret. The membership insert is last; repeat attempts cannot add more admins.
  if(method==='POST'&&path==='/setup'){
    const {clerkUserId,client}=await clerkIdentity(req,env);
    if(!env.BOOTSTRAP_SECRET||req.headers.get('x-bootstrap-secret')!==env.BOOTSTRAP_SECRET)fail(403,'Invalid setup secret');
    const n=await one(db,"SELECT COUNT(*) AS n FROM memberships WHERE role='admin'");
    if(Number(n.n)>0)fail(409,'Administrator already enrolled');
    const p=await clerkProfile(client,clerkUserId);
    const existing=await one(db,'SELECT id FROM users WHERE clerk_user_id=?',[clerkUserId]);
    if(existing)fail(409,'User already enrolled');
    // Use a transaction to keep initial enrollment atomic.
    const id=uuid();
    await db.batch([
      {sql:'INSERT INTO users(id,email,display_name,password_hash,clerk_user_id) VALUES(?,?,?,?,?)',args:[id,p.email,p.name,legacyMarker(),clerkUserId]},
      {sql:'INSERT INTO memberships(user_id,role) VALUES(?,?)',args:[id,'admin']},
      {sql:'INSERT OR IGNORE INTO games(id,name) VALUES(?,?)',args:[uuid(),'Overwatch']}
    ],'write');
    return j({ok:true,message:'Administrator enrolled; refresh EsportsHub.'},201);
  }
  // Invite redemption is *not* account signup. Clerk signup happens first.
  if(method==='POST'&&path==='/invites/redeem'){
    const {clerkUserId,client}=await clerkIdentity(req,env);
    const b=await body(req);const raw=required(b.inviteToken,128);
    const invite=await one(db,'SELECT * FROM invites WHERE token_hash=?',[await sha(raw)]);
    if(!invite||invite.revoked_at||invite.used_by||invite.expires_at<=new Date().toISOString())fail(400,'Invalid or expired invitation');
    const existing=await one(db,'SELECT id FROM users WHERE clerk_user_id=?',[clerkUserId]);
    if(existing)fail(409,'Existing members need an additional-membership flow');
    const p=await clerkProfile(client,clerkUserId);const id=uuid();
    await db.batch([
      {sql:'INSERT INTO users(id,email,display_name,password_hash,clerk_user_id) VALUES(?,?,?,?,?)',args:[id,p.email,p.name,legacyMarker(),clerkUserId]},
      {sql:'INSERT INTO memberships(user_id,role,game_id,team_id) VALUES(?,?,?,?)',args:[id,invite.role,invite.game_id,invite.team_id]},
      {sql:'UPDATE invites SET used_by=? WHERE id=? AND used_by IS NULL AND revoked_at IS NULL',args:[id,invite.id]}
    ],'write');
    return j({ok:true,message:'Invitation accepted'},201);
  }
  const user=await currentUser(req,env,db),ms=user.roles;
  if(method==='GET'&&path==='/me')return j({user:{id:user.id,name:user.name,email:user.email},roles:ms});
  if(method==='GET'&&path==='/games'){
    const games=(await q(db,'SELECT * FROM games ORDER BY name')).rows;
    return j(games.filter(g=>admin(ms)||ms.some(m=>m.game_id===g.id)));
  }
  if(method==='POST'&&path==='/games'){
    if(!admin(ms))fail(403,'Admin only');const b=await body(req),id=uuid(),name=required(b.name,80);
    await q(db,'INSERT INTO games(id,name) VALUES(?,?)',[id,name]);return j({id,name},201);
  }
  if(method==='GET'&&path==='/teams'){
    const teams=(await q(db,'SELECT t.*,g.name AS game_name FROM teams t JOIN games g ON g.id=t.game_id ORDER BY g.name,t.name')).rows;
    return j(teams.filter(t=>belongs(ms,t)));
  }
  if(method==='POST'&&path==='/teams'){
    const b=await body(req),gameId=required(b.gameId,80),name=required(b.name,80);
    if(!managesGame(ms,gameId))fail(403,'Not authorized for this game');
    if(!await one(db,'SELECT id FROM games WHERE id=?',[gameId]))fail(404,'Game not found');
    const id=uuid();await q(db,'INSERT INTO teams(id,game_id,name,description) VALUES(?,?,?,?)',[id,gameId,name,clean(b.description,1000)]);
    return j({id,game_id:gameId,name},201);
  }
  const teamPath=path.match(/^\/teams\/([^/]+)$/);
  if(teamPath){
    const team=await teamById(db,teamPath[1]);if(!belongs(ms,team))fail(403,'Team access denied');
    if(method==='GET'){
      const members=(await q(db,'SELECT u.id,u.display_name,m.role FROM memberships m JOIN users u ON u.id=m.user_id WHERE m.team_id=? ORDER BY u.display_name',[team.id])).rows;
      return j({team,members});
    }
    if(method==='PATCH'){
      if(!managesGame(ms,team.game_id))fail(403,'Manager required');const b=await body(req);
      await q(db,'UPDATE teams SET name=?,description=? WHERE id=?',[required(b.name??team.name,80),clean(b.description??team.description,1000),team.id]);return j({ok:true});
    }
    if(method==='DELETE'){
      if(!managesGame(ms,team.game_id))fail(403,'Manager required');await q(db,'DELETE FROM teams WHERE id=?',[team.id]);return j({ok:true});
    }
  }
  if(method==='POST'&&path==='/invites'){
    const b=await body(req),role=required(b.role,30);
    if(!['admin','game_manager','captain','player'].includes(role))fail(400,'Invalid role');
    let gameId=b.gameId||null,teamId=b.teamId||null;
    if(role==='admin'){
      if(!admin(ms))fail(403,'Admin only');gameId=null;teamId=null;
    }else if(role==='game_manager'){
      if(!admin(ms)||!gameId)fail(403,'Admin and game required');
      if(!await one(db,'SELECT id FROM games WHERE id=?',[gameId]))fail(404,'Game not found');teamId=null;
    }else{
      const team=await teamById(db,teamId);
      if(!manageTeam(ms,team))fail(403,'Cannot invite to this team');gameId=team.game_id;
    }
    const secret=token(),id=uuid(),expiresAt=later(72);
    await q(db,'INSERT INTO invites(id,token_hash,created_by,role,game_id,team_id,expires_at) VALUES(?,?,?,?,?,?,?)',[id,await sha(secret),user.id,role,gameId,teamId,expiresAt]);
    return j({token:secret,role,gameId,teamId,expiresAt},201);
  }
  const child=path.match(/^\/teams\/([^/]+)\/(events|availability|reports|concerns)$/);
  if(child){
    const team=await teamById(db,child[1]),kind=child[2];if(!belongs(ms,team))fail(403,'Team access denied');
    if(kind==='events'){
      if(method==='GET')return j((await q(db,'SELECT id,type,title,opponent,starts_at,notes FROM events WHERE team_id=? ORDER BY starts_at DESC LIMIT 200',[team.id])).rows);
      if(method==='POST'){
        if(!manageTeam(ms,team))fail(403,'Captain or manager required');const b=await body(req);
        if(!['practice','scrim','match','event'].includes(b.type)||!Number.isFinite(Date.parse(b.startsAt)))fail(400,'Invalid event details');
        const id=uuid();await q(db,'INSERT INTO events(id,team_id,type,title,opponent,starts_at,notes,created_by) VALUES(?,?,?,?,?,?,?,?)',[id,team.id,b.type,required(b.title,120),clean(b.opponent,100),new Date(b.startsAt).toISOString(),clean(b.notes,2000),user.id]);return j({id},201);
      }
    }
    if(kind==='availability'){
      if(method==='GET'){
        if(manageTeam(ms,team))return j((await q(db,'SELECT a.user_id,u.display_name,a.slots,a.updated_at FROM availability a JOIN users u ON u.id=a.user_id WHERE team_id=?',[team.id])).rows.map(r=>({...r,slots:JSON.parse(r.slots)})));
        const r=await one(db,'SELECT slots,updated_at FROM availability WHERE team_id=? AND user_id=?',[team.id,user.id]);return j(r?{slots:JSON.parse(r.slots),updated_at:r.updated_at}:{slots:[]});
      }
      if(method==='PUT'){
        const b=await body(req);
        if(!Array.isArray(b.slots)||b.slots.length>336||b.slots.some(x=>!Number.isInteger(x)||x<0||x>=336))fail(400,'Expected 0–335 half-hour slots');
        await q(db,'INSERT INTO availability(user_id,team_id,slots,updated_at) VALUES(?,?,?,CURRENT_TIMESTAMP) ON CONFLICT(user_id,team_id) DO UPDATE SET slots=excluded.slots,updated_at=CURRENT_TIMESTAMP',[user.id,team.id,JSON.stringify([...new Set(b.slots)])]);return j({ok:true});
      }
    }
    if(kind==='reports'){
      if(method==='GET')return j((await q(db,'SELECT r.id,r.type,r.title,r.content,r.created_at,u.display_name AS author FROM reports r JOIN users u ON u.id=r.created_by WHERE r.team_id=? ORDER BY r.created_at DESC LIMIT 200',[team.id])).rows);
      if(method==='POST'){
        if(!manageTeam(ms,team))fail(403,'Captain or manager required');const b=await body(req);
        if(!['scrim','vod','match','practice'].includes(b.type))fail(400,'Invalid report type');const id=uuid();await q(db,'INSERT INTO reports(id,team_id,type,title,content,created_by) VALUES(?,?,?,?,?,?)',[id,team.id,b.type,required(b.title,140),required(b.content,8000),user.id]);return j({id},201);
      }
    }
    if(kind==='concerns'){
      if(method==='POST'){
        const b=await body(req);const id=uuid();
        if(b.subjectUserId){const subject=await one(db,'SELECT 1 AS found FROM memberships WHERE user_id=? AND team_id=?',[b.subjectUserId,team.id]);if(!subject)fail(400,'Player not in this team');}
        await q(db,'INSERT INTO concerns(id,team_id,subject_user_id,author_id,details) VALUES(?,?,?,?,?)',[id,team.id,b.subjectUserId||null,user.id,required(b.details,4000)]);
        return j({id,ok:true},201);
      }
      if(method==='GET'){
        if(!managesGame(ms,team.game_id))fail(403,'Only managers and admins can view private concerns');
        return j((await q(db,'SELECT c.id,c.details,c.status,c.created_at,u.display_name AS author FROM concerns c JOIN users u ON u.id=c.author_id WHERE c.team_id=? ORDER BY c.created_at DESC',[team.id])).rows);
      }
    }
  }
  fail(404,'Endpoint not found');
}
export default {
  async fetch(req,env){
    const origin=req.headers.get('origin');
    const allowed=(env.FRONTEND_ORIGIN||'').split(',').map(s=>s.trim()).filter(Boolean);
    const cors=origin&&allowed.includes(origin)?{'access-control-allow-origin':origin,'vary':'Origin','access-control-allow-methods':'GET,POST,PUT,PATCH,DELETE,OPTIONS','access-control-allow-headers':'Authorization,Content-Type,X-Bootstrap-Secret'}:{};
    if(req.method==='OPTIONS')return new Response(null,{status:cors['access-control-allow-origin']?204:403,headers:cors});
    try{
      const res=await app(req,env);
      for(const [k,v] of Object.entries(cors))res.headers.set(k,v);
      res.headers.set('cache-control','no-store');res.headers.set('x-content-type-options','nosniff');return res;
    }catch(e){
      const status=e.status||500;
      if(status>=500)console.error('EsportsHub backend failure',{path:new URL(req.url).pathname,message:String(e.message||e),code:e.code||null});
      const res=j({error:status===500?'Internal server error':e.message},status);
      for(const [k,v] of Object.entries(cors))res.headers.set(k,v);
      res.headers.set('cache-control','no-store');return res;
    }
  }
};
