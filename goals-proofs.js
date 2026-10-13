(() => {
 'use strict';
 /* VIVID Goals proof uploads: PDF / HTML / PNG / Video.
    Private bucket requires goals-storage-setup.sql executed once in Supabase.
    Offline fallback is IndexedDB, explicitly labelled "on this device". */
 const OWNER='fenric18@gmail.com', BUCKET='vivid-goals-proofs', START='2026-10-15';
 const EXT=new Set(['pdf','html','htm','png','mp4','webm','mov','m4v']);
 const MIME={pdf:'application/pdf',html:'text/html',htm:'text/html',png:'image/png',mp4:'video/mp4',webm:'video/webm',mov:'video/quicktime',m4v:'video/x-m4v'};
 const MAX=50*1024*1024;
 const safe=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const active=()=>window.VividGoals?.isOpen()&&window.VocabCloud?.enabled&&window.VocabCloud?.userId&&window.VocabCloud?.email?.toLowerCase()===OWNER;
 let client=null, uploading=false, dbPromise=null, status='';
 function getClient(){
   if(!client&&window.supabase&&window.VOCAB_SUPABASE){
     const c=window.VOCAB_SUPABASE;
     client=window.supabase.createClient(c.url,c.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
   }
   return client;
 }
 async function verify(){
   if(!active())throw Error('Faqat ruxsat berilgan hisobda ishlaydi.');
   const c=getClient();if(!c)throw Error('Supabase ulanishi yo‘q.');
   const res=await c.auth.getUser(),u=res?.data?.user;
   if(res.error||!u||u.id!==window.VocabCloud.userId||u.email?.toLowerCase()!==OWNER)throw Error('Akkauntni qayta tekshirish muvaffaqiyatsiz.');
   return {client:c,uid:u.id};
 }
 function openDB(){
   if(dbPromise)return dbPromise;
   dbPromise=new Promise((resolve,reject)=>{
      if(!('indexedDB' in window))return reject(Error('IndexedDB mavjud emas.'));
      const req=indexedDB.open('vivid-goals-proofs-v1',1);
      req.onupgradeneeded=()=>{if(!req.result.objectStoreNames.contains('files'))req.result.createObjectStore('files')};
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error||Error('Local storage unavailable'));
   }).catch(e=>{dbPromise=null;throw e});
   return dbPromise;
 }
 async function store(op,key,value){
   const db=await openDB();
   return new Promise((resolve,reject)=>{
      const tx=db.transaction('files',op==='read'?'readonly':'readwrite'),os=tx.objectStore('files');
      const req=op==='read'?os.get(key):op==='delete'?os.delete(key):os.put(value,key);
      req.onsuccess=()=>resolve(req.result);
      req.onerror=()=>reject(req.error);
   });
 }
 function notify(msg){
    status=msg;
    const t=document.getElementById('goalProofStatus');
    if(t)t.textContent=msg;
 }
 function proofEntries(){
   const state=window.VividGoals?.get();
   return Array.isArray(state?.extras?.proofs)?state.extras.proofs:[];
 }
 function proofKey(uid,id){return uid+':'+id}
 function escapeKey(s){return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,100)}
 function extOf(file){return String(file.name||'').split('.').pop().toLowerCase()}
 async function upload(files,task,day){
   if(uploading){notify('Fayl yuklanmoqda; tugashini kuting.');return;}
   if(!active()||day<START)return;
   uploading=true;
   try{
     const {client:c,uid}=await verify();
     let ok=0,localOnly=0;
     for(const file of files){
       const ext=extOf(file);
       if(!EXT.has(ext)){notify(file.name+' — faqat PDF, HTML, PNG va video qabul qilinadi.');continue;}
       if(file.size>MAX){notify(file.name+' — 50 MB dan katta. Video hajmini kichraytiring.');continue;}
       const id=(crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
       const key=proofKey(uid,id),path=uid+'/'+day+'/'+escapeKey(task)+'/'+id+'.'+ext;
       const mime=MIME[ext];
       notify('Saqlanmoqda: '+file.name);
       let local=false,remote=false,error='';
       try{await store('write',key,file);local=true;}catch(err){error='Mahalliy xotira: '+(err.message||err);}
       try{
         const res=await c.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:mime});
         if(res.error)throw res.error;
         remote=true;
       }catch(err){error=String(err?.message||err);}
       if(!local&&!remote){notify('Saqlash muvaffaqiyatsiz: '+file.name+'. '+error);continue;}
       const entry={id,task:String(task).slice(0,120),day,filename:String(file.name).slice(0,180),
          mime,size:file.size,location:remote?'cloud':'device',path:remote?path:'',
          uploadedAt:new Date().toISOString()};
       const saved=window.VividGoals.saveExtras(ex=>{
         ex.proofs??=[];if(!ex.proofs.some(x=>x.id===entry.id))ex.proofs.push(entry);
       });
       if(!saved){notify('Dalil metadata sini saqlashda xato.');continue;}
       if(remote&&local)try{await store('delete',key);}catch{}
       ok++;if(!remote)localOnly++;
       notify((remote?'Bulutga saqlandi: ':'Faqat shu qurilmada saqlandi: ')+file.name);
     }
     if(ok)notify(ok+' ta dalil qo‘shildi. '+(localOnly?localOnly+' tasi faqat shu qurilmada; cloud bucket sozlamalarini tekshiring.':'Barchasi bulutda.'));
   }catch(err){notify('Dalil yuklanmadi: '+(err.message||err));}
   finally{uploading=false;render();}
 }
 function fileLabel(p){
   const short=p.filename.length>28?p.filename.slice(0,25)+'…':p.filename;
   const icon=p.mime==='application/pdf'?'📄':p.mime==='text/html'?'🌐':p.mime==='image/png'?'🖼️':'🎬';
   return icon+' '+short;
 }
 function render(){
   if(!active())return;
   const root=document.getElementById('vividGoalsPage');if(!root)return;
   const s=window.VividGoals.get(),day=window.VividGoals.getDay();
   if(!s)return;
   if(!root.querySelector('#goalsProofInput')){
     const input=document.createElement('input');
     input.type='file';input.id='goalsProofInput';input.multiple=true;
     input.accept='.pdf,.html,.htm,.png,.mp4,.webm,.mov,.m4v,application/pdf,image/png,video/mp4,video/webm';
     input.hidden=true;root.appendChild(input);
   }
   const anchors=[...root.querySelectorAll('[data-proof-task]')];
   // Planner tasks, custom goals and saved IELTS/SAT practice records also get an attachment slot.
   root.querySelectorAll('.ga-plan-task[data-plan-id],.ga-custom-list [data-custom-id],.ga-log-list [data-activity-id],.gs-sat-row[data-sat-row]').forEach(el=>{
      if(el.querySelector('[data-proof-task]'))return;
      const wrap=document.createElement('span');
      wrap.className='goals-proof-anchor';
      const id=el.dataset.planId?'plan_'+el.dataset.planId:el.dataset.customId?'custom_'+el.dataset.customId:el.dataset.activityId?'activity_'+el.dataset.activityId:'sat_'+el.dataset.satRow;
      wrap.dataset.proofTask=id;wrap.dataset.proofDay=day;
      el.appendChild(wrap);anchors.push(wrap);
   });
   const proofs=proofEntries();
   for(const anchor of anchors){
     const task=anchor.dataset.proofTask,d=anchor.dataset.proofDay||day;
     const match=proofs.filter(p=>p.day===d&&p.task===task);
     const btn='<button type="button" class="gp-add" data-gp-add="'+safe(task)+'" data-gp-day="'+safe(d)+'" title="PDF, HTML, PNG yoki video biriktirish">📎 Dalil '+(match.length?'('+match.length+')':'+')+'</button>';
     const list=match.map(p=>'<span class="gp-file"><button type="button" data-gp-open="'+safe(p.id)+'" title="'+safe(p.filename)+'">'+safe(fileLabel(p))+'</button><small>'+ (p.location==='cloud'?'☁️ Cloud':'📱 Faqat shu qurilmada')+'</small><button type="button" data-gp-delete="'+safe(p.id)+'" aria-label="Dalilni o‘chirish">×</button></span>').join('');
     anchor.innerHTML=btn+(list?'<div class="gp-files">'+list+'</div>':'');
   }
   if(!root.querySelector('#goalProofStatus')){
     const bar=document.createElement('div');
     bar.id='goalProofStatus';bar.className='gp-status';bar.setAttribute('role','status');bar.textContent=status||
       'Dalillar: PDF, HTML, PNG, MP4/WEBM/MOV (har biri 50 MB gacha). Cloud ulanishi mavjud bo‘lmasa, shu qurilmada saqlanadi.';
     root.querySelector('.goals-footer')?.before(bar);
   }
 }
 async function getProof(id){
    const {client:c,uid}=await verify();
    const p=proofEntries().find(x=>x.id===id);
    if(!p)throw Error('Fayl topilmadi.');
    if(p.location==='cloud'&&p.path){
      const res=await c.storage.from(BUCKET).download(p.path);
      if(!res.error&&res.data)return {file:res.data,p};
    }
    const blob=await store('read',proofKey(uid,id));
    if(!blob)throw Error('Fayl faqat oldingi qurilmada saqlangan yoki Storage hali sozlanmagan.');
    return {file:blob,p};
 }
 async function openProof(id){
   try{
     notify('Dalil yuklanmoqda...');
     const {file,p}=await getProof(id);
     const url=URL.createObjectURL(file),a=document.createElement('a');
     a.href=url;a.download=p.filename;document.body.append(a);a.click();a.remove();
     setTimeout(()=>URL.revokeObjectURL(url),60000);notify('Fayl yuklab olindi: '+p.filename);
   }catch(err){notify(String(err.message||err));}
 }
 async function delProof(id){
   try{
     const {client:c,uid}=await verify();
     const p=proofEntries().find(x=>x.id===id);if(!p)return;
     if(!confirm(p.filename+' faylini dalillar ro‘yxatidan o‘chirasizmi?'))return;
     if(p.location==='cloud'&&p.path){
       const {data}=await c.auth.getSession(),token=data?.session?.access_token;
       if(!token)throw Error('Cloud sessiya topilmadi.');
       const config=window.VOCAB_SUPABASE;
       const endpoint=config.url+'/storage/v1/object/'+BUCKET+'/'+p.path.split('/').map(encodeURIComponent).join('/');
       const response=await fetch(endpoint,{method:'DELETE',headers:{apikey:config.key,Authorization:'Bearer '+token}});
       if(!response.ok)throw Error('Cloud faylini o‘chirishda xato ('+response.status+').');
     }
     try{await store('delete',proofKey(uid,id))}catch{}
     window.VividGoals.saveExtras(ex=>{ex.proofs=(ex.proofs||[]).filter(x=>x.id!==id)});
     notify('Dalil o‘chirildi.');render();
   }catch(err){notify('O‘chirishda xato: '+(err.message||err));}
 }
 let queued={task:'',day:''};
 document.addEventListener('vivid-goals:rendered',render);
 document.addEventListener('click',e=>{
   if(!active())return;
   const add=e.target.closest('[data-gp-add]');
   if(add){
     e.preventDefault();queued={task:add.dataset.gpAdd,day:add.dataset.gpDay};
     document.getElementById('goalsProofInput')?.click();return;
   }
   const open=e.target.closest('[data-gp-open]');
   if(open){e.preventDefault();openProof(open.dataset.gpOpen);return;}
   const del=e.target.closest('[data-gp-delete]');
   if(del){e.preventDefault();delProof(del.dataset.gpDelete);}
 });
 document.addEventListener('change',e=>{
   if(e.target.id!=='goalsProofInput')return;
   const files=[...e.target.files];e.target.value='';
   if(files.length)upload(files,queued.task,queued.day);
 });
 window.VividGoalsProofs={refresh:render,bucket:BUCKET};
})();