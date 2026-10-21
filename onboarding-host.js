/* Onboarding persistence; invitation authority always comes from the Worker. */
(function(root){
 'use strict';
 const canonical=value=>String(value||'').replace(/[-\s]/g,'').toUpperCase();
 const allowedRoles=['guest','player','captain','coach','game_manager','team_manager','admin'];
 function membershipMatches(roles,invite){const role=invite.role==='team_manager'?'game_manager':invite.role;return roles.some(m=>{const actual=m.role==='team_manager'?'game_manager':m.role;if(actual!==role)return false;if(role==='admin')return true;if(role==='game_manager')return String(m.game_id)===String(invite.gameId);return String(m.team_id)===String(invite.teamId);});}
 function validate(input){if(!input||typeof input!=='object')throw Error('Invalid setup data.');if(!/^[A-Za-z0-9_.]{3,32}$/.test(String(input.username||'').trim()))throw Error('Choose a username with 3–32 letters, numbers, dots, or underscores.');for(const [key,max]of [['display',64],['first',64],['last',64],['pronouns',40],['bio',600],['code',128]])if(typeof input[key]!=='string'||input[key].length>max)throw Error('Check the '+key+' field.');if(!['cyber','charcoal','white'].includes(input.theme))throw Error('Choose a website theme.');for(const key of ['primary','accent'])if(!/^#[a-f0-9]{6}$/i.test(input[key]))throw Error('Choose valid profile colors.');if(!Array.isArray(input.slots)||input.slots.length>336||input.slots.some(n=>!Number.isInteger(n)||n<0||n>=336))throw Error('Invalid availability slots.');if(!Array.isArray(input.followed)||input.followed.length>100||input.followed.some(id=>typeof id!=='string'||id.length>80))throw Error('Invalid followed teams.');if(input.avatar&&(!/^data:image\/(png|jpeg|webp|gif);base64,[A-Za-z0-9+/=]+$/.test(input.avatar)||input.avatar.length>5600000))throw Error('Choose a supported profile photo up to 4 MB.');}
 function playerGameData(input,original,roles,invite,assignment){
  const required=[...(roles||[]).map(m=>m.role),invite?.role,assignment?.role].some(role=>['player','captain','sub','substitute'].includes(role));
  const mainGameId=input.mainGame!==undefined?input.mainGame:original.main_game_id||'',rows=input.playerGames!==undefined?input.playerGames:(original.game_usernames||[]).map(g=>({gameId:g.game_id,username:g.username,rank:g.rank||'',role:g.role||''}));
  if(!required&&input.playerGames===undefined)return null;
  if(!required&&!mainGameId&&!rows.length)return null;
  if(typeof mainGameId!=='string'||!mainGameId.trim()||mainGameId.length>80)throw Error('Choose your primary game in Your Games.');
  if(!Array.isArray(rows)||!rows.length||rows.length>50)throw Error('Add account details for your primary game.');
  const games=rows.map(row=>{if(!row||typeof row.gameId!=='string'||!row.gameId.trim()||row.gameId.length>80)throw Error('Choose a valid game.');for(const [field,max,label]of [['username',64,'username'],['rank',64,'rank, or Unranked'],['role',80,'in-game role']])if(typeof row[field]!=='string'||!row[field].trim()||row[field].length>max)throw Error('Enter your '+label+' for each selected game in Your Games.');return {gameId:row.gameId.trim(),username:row.username.trim(),rank:row.rank.trim(),role:row.role.trim()};});
  if(new Set(games.map(g=>g.gameId)).size!==games.length||!games.some(g=>g.gameId===mainGameId.trim()))throw Error('Your primary game must have one set of account details.');return {mainGameId:mainGameId.trim(),games};
 }
 async function save(input,a){
  validate(input);const check=()=>a.check();
  async function request(path,method='GET',body){check();let result;try{result=await a.api(path,method,body);}catch(error){if((error.status===404||!error.status)&&/^endpoint not found[.!]?$/i.test(String(error.message||'').trim()))throw Object.assign(Error('Setup could not save because the backend is missing '+method+' '+path+'. Deploy the latest EsportsHub Cloudflare Worker, then retry Finish Setup. Your setup draft is kept.'),{status:404,path,method});throw error;}check();return result;}
  const read=path=>request(path),write=(path,method,body)=>request(path,method,body);
  const original=await read('/profile/'+encodeURIComponent(a.userId));let me=await read('/me'),invitation=null;
  if(input.mode==='invite'&&input.code.trim()){
   const fingerprint=await a.fingerprint(canonical(input.code));check();const receipt=a.readReceipt();
   if(receipt?.fingerprint===fingerprint&&membershipMatches(me.roles,receipt.invitation))invitation=receipt.invitation;
   else{invitation=await write('/invites/preview','POST',{inviteCode:input.code.trim()});if(!allowedRoles.includes(invitation.role))throw Error('This invitation has an unsupported role.');a.writeReceipt({fingerprint,invitation});}
  }
  const gameData=playerGameData(input,original,me.roles,invitation,a.assignment);
  check();try{await a.updateName({firstName:input.first.trim()||input.display.trim()||input.username.trim(),lastName:input.last.trim()});}catch(error){throw Error('Account name could not save: '+error.message);}check();
  await write('/me/profile','PUT',{username:input.username.trim(),banner:original.banner||'preset:theme',discord_username:original.discord_username||'',main_game_id:gameData?.mainGameId||original.main_game_id||null,game_usernames:gameData?Object.fromEntries(gameData.games.map(g=>[g.gameId,g.username])):Object.fromEntries((original.game_usernames||[]).map(g=>[g.game_id,g.username]).filter(([id])=>id)),customization:{...(original.customization||{}),display_name:input.display.trim(),pronouns:input.pronouns.trim(),bio:input.bio,public_real_name:input.publicName===true,primary:input.primary,accent:input.accent}});
  if(gameData)await write('/me/player-games','PUT',gameData);
  if(input.avatar){check();await a.updateAvatar(input.avatar);check();}
  if(invitation&&!membershipMatches(me.roles,invitation)){
   await write('/invites/redeem','POST',{inviteCode:input.code.trim()});me=await read('/me');if(!membershipMatches(me.roles,invitation))throw Error('The invitation was accepted, but membership has not loaded. Retry setup.');
  }
  const assigned=invitation||a.assignment;
  if(input.availabilityTouched&&assigned?.teamId&&['player','captain','coach'].includes(assigned.role)){
   const value=await read('/teams/'+encodeURIComponent(assigned.teamId)+'/availability'),own=Array.isArray(value)?value.find(row=>String(row.user_id)===String(a.userId)):value;
   await write('/teams/'+encodeURIComponent(assigned.teamId)+'/availability','PUT',{slots:[...new Set(input.slots)].sort((x,y)=>x-y),revision:Number(own?.revision||0)});
  }
  await write('/me/followed-teams','PUT',{teamIds:[...new Set(input.followed)]});
  const defaultId=assigned?.teamId||input.followed[0];if(defaultId)await write('/me/default-team','PUT',{teamId:defaultId});
  check();a.setTheme(input.theme);await write('/me/onboarding/complete','POST',{});
  return {completed:true,assignment:assigned||null};
 }
 const api={save,validate,playerGameData,membershipMatches,canonical};if(typeof module==='object'&&module.exports)module.exports=api;else root.EsportsHubOnboardingHost=api;
})(typeof window==='object'?window:this);
