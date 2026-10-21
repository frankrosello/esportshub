/* Local PDF rendering. No report data leaves the browser. */
(function(root){
 'use strict';
 const label=value=>String(value).replace(/_/g,' ').replace(/\b\w/g,c=>c.toUpperCase());
 function text(value){if(value===null||value===undefined)return '-';if(typeof value==='string'){try{const parsed=JSON.parse(value);if(parsed&&typeof parsed==='object')return JSON.stringify(parsed,null,2);}catch{}if(/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}/.test(value)&&Number.isFinite(Date.parse(value)))return new Date(value).toLocaleString('en-US',{timeZone:'America/New_York',timeZoneName:'short'})+' ['+value+']';return value.replace(/\r\n/g,'\n');}return typeof value==='object'?JSON.stringify(value,null,2):String(value);}
 function color(value,fallback){const match=String(value||'').match(/^#([a-f\d]{6})$/i);return match?match[1].match(/../g).map(n=>parseInt(n,16)):fallback;}
 function createReport(payload,{jsPDF,accent='#bd94ed',paper='a4',dark=false,fonts=root.EsportsHubPdfFonts}={}){
  if(!jsPDF)throw Error('PDF renderer is unavailable.');
  const doc=new jsPDF({unit:'pt',format:paper,compress:true}),w=doc.internal.pageSize.getWidth(),h=doc.internal.pageSize.getHeight(),ink=dark?[239,239,245]:[32,30,40],bg=dark?[18,18,20]:[255,255,255],soft=dark?[30,30,34]:[245,244,248],line=dark?[70,70,78]:[215,213,222],highlight=color(accent,[96,39,155]);
  let font='helvetica';if(fonts){for(const style of ['normal','bold']){doc.addFileToVFS('Bai-'+style+'.ttf',fonts[style]);doc.addFont('Bai-'+style+'.ttf','Bai',style);}font='Bai';}
  const map=fonts?doc.getFont('Bai','normal').metadata?.cmap?.unicode?.codeMap:null;const printable=value=>Array.from(String(value)).map(c=>c==='\n'||c==='\t'||!map||map[c.codePointAt(0)]?c:'[U+'+c.codePointAt(0).toString(16).toUpperCase()+']').join('');
  const headingInk=(highlight[0]*299+highlight[1]*587+highlight[2]*114)/1000<150?[255,255,255]:[18,18,22];
  const theme={font,fontSize:8.5,textColor:ink,fillColor:bg,lineColor:line,lineWidth:.4,cellPadding:6,overflow:'linebreak',valign:'top'},generated=new Date(payload.generatedAt).toLocaleString('en-US',{timeZone:'America/New_York',timeZoneName:'short'});
  let section='Export Summary';const painted=new Set();
  function page(){const number=doc.internal.getCurrentPageInfo().pageNumber;if(painted.has(number))return;painted.add(number);doc.setFillColor(...bg);doc.rect(0,0,w,h,'F');doc.setFillColor(10,10,11);doc.rect(0,0,w,66,'F');doc.setDrawColor(...highlight);doc.setLineWidth(2);doc.line(32,66,w-32,66);doc.setFont(font,'bold');doc.setFontSize(17);doc.setTextColor(255,255,255);doc.text('ESPORTSHUB',32,29);doc.setFont(font,'normal');doc.setFontSize(9);doc.setTextColor(...highlight);doc.text('ADMINISTRATIVE DATA REPORT',32,47);doc.setTextColor(...ink);doc.setFontSize(8);doc.text(doc.splitTextToSize(section,w-64)[0],32,84);}
  function table(options){doc.autoTable({margin:{top:100,bottom:40,left:32,right:32},styles:theme,headStyles:{fillColor:highlight,textColor:headingInk,fontStyle:'bold'},alternateRowStyles:{fillColor:soft},tableLineColor:line,tableLineWidth:.4,willDrawPage:page,...options,didParseCell:data=>{data.cell.text=data.cell.text.map(printable);}});return doc.lastAutoTable.finalY;}
  doc.setProperties({title:'EsportsHub Administrative Data Report',subject:'Confidential organization records',author:'EsportsHub',creator:'EsportsHub Local PDF Export'});
  const identities=new Map();for(const dataset of payload.datasets||[])if(['users','teams','games','events'].includes(dataset.key))for(const record of dataset.rows)if(record.id)identities.set(String(record.id),record.display_name||record.name||record.title||record.id);
  const fieldValue=(key,value)=>{const display=text(value);return /(?:_id|_by)$/.test(key)&&identities.has(String(value))?identities.get(String(value))+' ['+String(value)+']':display;};
  const summary=(payload.datasets||[]).map(d=>[d.label,String(d.rows.length)]);
  let y=table({startY:100,head:[['Included Section','Records']],body:summary.length?summary:[['No selected datasets','0']],columnStyles:{1:{cellWidth:65,halign:'right'}}});
  const context=[['Generated (Eastern)',generated],['Prepared By',payload.preparedBy||'Administrator'],['Collection Finished',new Date(payload.completedAt||payload.generatedAt).toLocaleString('en-US',{timeZone:'America/New_York',timeZoneName:'short'})],['Scope','All stored records in the selected sections; all teams and roles.'],['Report Handling','Confidential: includes personal information and private concerns when selected.'],['Not Included',(payload.limitations||[]).join('\n')],['No Stored Dataset',(payload.unavailable||[]).join(', ')||'None']];
  table({startY:y+18,body:context,columnStyles:{0:{cellWidth:112,fontStyle:'bold'}}});
  for(const dataset of payload.datasets||[]){section=dataset.label;doc.addPage();let first=true;
   if(!dataset.rows.length){table({startY:100,head:[[dataset.label]],body:[['No stored records.']]});continue;}
   for(let i=0;i<dataset.rows.length;i++){const row=dataset.rows[i],identity=row.title||row.display_name||row.name||row.username||row.id||row.event_id||row.user_id||String(i+1);const start=first?100:doc.lastAutoTable.finalY+14;if(start>h-100){doc.addPage();first=true;}table({startY:first?100:start,head:[[{content:label(dataset.label)+' / '+String(identity),colSpan:2}]],body:Object.entries(row).map(([key,value])=>[label(key),fieldValue(key,value)]),columnStyles:{0:{cellWidth:118,fontStyle:'bold'},1:{cellWidth:w-182}},rowPageBreak:'auto'});first=false;}
  }
  const total=doc.getNumberOfPages();for(let n=1;n<=total;n++){doc.setPage(n);doc.setFont(font,'normal');doc.setFontSize(7);doc.setTextColor(...ink);doc.text('CONFIDENTIAL / '+generated,32,h-20);doc.text(n+' / '+total,w-32,h-20,{align:'right'});}
  return doc;
 }
 const api={createReport,text,label,color};if(typeof module==='object'&&module.exports)module.exports=api;else root.EsportsHubAdminPdf=api;
})(typeof window==='object'?window:this);
