'use strict';
// Workshop CSV layout verified against Parsertime (MIT); see THIRD_PARTY_NOTICES.txt.
function splitWorkshopLine(line){const fields=[];let current='',depth=0;for(const c of line){if(c==='(')depth++;if(c===')')depth--;if(c===','&&depth===0){fields.push(current.trim());current='';}else current+=c;}fields.push(current.trim());return fields;}
function parseWorkshop(text){
 if(typeof text!=='string'||text.length>20*1024*1024)throw Error('Choose a Workshop text log up to 20 MB');
 const rows=[],counts={},latest=new Map(),players=new Map(),kills=[],seen=new Set();let skipped=0;
 const number=x=>Number.isFinite(Number(x))?Number(x):0;
 const player=(team,name)=>{const key=team+'|'+name;if(!players.has(key))players.set(key,{team,name,heroes:new Set(),finalBlows:0,deaths:0,eliminations:0,damage:0,healing:0,ultimates:0});return players.get(key);};
 for(const raw of text.split(/\r?\n/)){if(!raw.trim())continue;const fields=splitWorkshopLine(raw);if(/^\[.*\]/.test(fields[0]))fields.shift();if(fields[0]==='****')fields[0]='kill';const type=fields[0];if(!/^[a-z_]+$/.test(type)){skipped++;continue;}const identity=fields.join('\u0001');if(seen.has(identity))continue;seen.add(identity);counts[type]=(counts[type]||0)+1;rows.push(fields);
  if(type==='player_stat'&&fields.length>=21&&fields[4]){const key=fields[3]+'|'+fields[4]+'|'+fields[5],old=latest.get(key);if(!old||number(fields[1])>=number(old[1]))latest.set(key,fields);}
  if(type==='kill'&&fields.length>=8)kills.push(fields);
  if(['hero_spawn','hero_swap'].includes(type)&&fields[3])player(fields[2],fields[3]).heroes.add(fields[4]);
 }
 const match=rows.find(r=>r[0]==='match_start');if(!match)throw Error('No match_start record found. Upload an English ScrimTime Workshop Inspector log, not a replay code.');
 for(const r of latest.values()){const p=player(r[3],r[4]);p.heroes.add(r[5]);p.eliminations+=number(r[6]);p.damage+=number(r[11]);p.healing+=number(r[12]);p.ultimates+=number(r[20]);if(!kills.length){p.finalBlows+=number(r[7]);p.deaths+=number(r[8]);}}
 for(const r of kills){player(r[5],r[6]).deaths++;if(r[2]!=='All Teams'&&r[3]!==r[6])player(r[2],r[3]).finalBlows++;}
 const end=rows.filter(r=>r[0]==='match_end').at(-1);const duration=rows.reduce((max,r)=>['match_end','round_end'].includes(r[0])?Math.max(max,number(r[1])):max,0);
 const names=new Set([match[4],match[5]]),list=[...players.values()].filter(p=>names.has(p.team)&&p.name&&p.name!=='0').map(p=>({...p,heroes:[...p.heroes].filter(Boolean),damage:Math.round(p.damage),healing:Math.round(p.healing)})).sort((a,b)=>a.team.localeCompare(b.team)||b.finalBlows-a.finalBlows);
 if(!list.length)throw Error('Match header found, but no supported player statistics or kill events were found.');
 return {map:match[2],mode:match[3],teams:[match[4],match[5]],duration,score:end?[number(end[3]),number(end[4])]:null,complete:!!end,players:list,kills:kills.slice(0,2000).map(r=>({time:number(r[1]),attacker:r[3],victim:r[6],hero:r[4]})),counts,skipped,warning:'Damage, healing and eliminations use the latest snapshot for each player/hero. Final blows and deaths use kill events when present. Different Workshop versions may export different counters; review the log before treating totals as official.'};
}
if(typeof self!=='undefined'&&typeof document==='undefined')self.onmessage=e=>{try{self.postMessage({ok:true,data:parseWorkshop(e.data)});}catch(error){self.postMessage({ok:false,error:error.message});}};
if(typeof module!=='undefined')module.exports={parseWorkshop,splitWorkshopLine};
