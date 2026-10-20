/* Public product previews only. No authentication or team-data requests. */
(()=>{
 'use strict';
 for(const gallery of document.querySelectorAll('[data-product-gallery]')){
  const tabs=[...gallery.querySelectorAll('[role=tab]')],panels=[...gallery.querySelectorAll('[role=tabpanel]')];
  function select(index,focus=false){tabs.forEach((tab,i)=>{tab.setAttribute('aria-selected',String(i===index));tab.tabIndex=i===index?0:-1;panels[i].hidden=i!==index;});if(focus)tabs[index].focus();}
  tabs.forEach((tab,i)=>{tab.onclick=()=>select(i);tab.onkeydown=event=>{if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?tabs.length-1:(i+(event.key==='ArrowRight'?1:-1)+tabs.length)%tabs.length;select(next,true);};});select(0);
 }
 let viewer,returnTo;
 function close(){viewer.close();}
 document.addEventListener('click',event=>{const button=event.target.closest('[data-product-photo]');if(!button)return;const source=button.querySelector('img');if(!source)return;
  if(!viewer){viewer=document.createElement('dialog');viewer.className='eh-panel eh-product-lightbox';viewer.setAttribute('aria-labelledby','productPhotoTitle');viewer.innerHTML='<header><h2 id="productPhotoTitle"></h2><button type="button" aria-label="Close Screenshot">×</button></header><img alt=""><p>Current interface shown with fictional sample data.</p>';viewer.querySelector('button').onclick=close;viewer.addEventListener('close',()=>{document.documentElement.classList.remove('eh-product-preview-open');returnTo?.focus({preventScroll:true});});viewer.addEventListener('click',e=>{if(e.target===viewer){const rect=viewer.getBoundingClientRect();if(e.clientX<rect.left||e.clientX>rect.right||e.clientY<rect.top||e.clientY>rect.bottom)close();}});document.body.append(viewer);}
  returnTo=button;viewer.querySelector('h2').textContent=button.dataset.productPhoto||'EsportsHub Preview';const image=viewer.querySelector('img');image.src=source.currentSrc||source.src;image.alt=source.alt;viewer.showModal();viewer.scrollTop=0;document.documentElement.classList.add('eh-product-preview-open');
 });
})();
