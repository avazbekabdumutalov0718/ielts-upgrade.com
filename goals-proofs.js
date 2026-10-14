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
 let client=null, uploading=false, dbPromise=null, status='', lastNotice={task:'',day:'',message:'',kind:''};
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
      let result=null,done=false;
      const req=op==='read'?os.get(key):op==='delete'?os.delete(key):os.put(value,key);
      req.onsuccess=()=>{result=req.result};
      req.onerror=()=>{if(!done){done=true;reject(req.error||Error('Device file storage error'))}};
      tx.oncomplete=()=>{if(!done){done=true;resolve(result)}};
      tx.onabort=()=>{if(!done){done=true;reject(tx.error||Error('Device file storage aborted'))}};
      tx.onerror=()=>{if(!done){done=true;reject(tx.error||Error('Device file storage failed'))}};
   });
 }
 function notify(msg,task='',day='',kind='info'){
    status=msg;
    if(task&&day)lastNotice={task,day,message:msg,kind};
    const t=document.getElementById('goalProofStatus');
    if(t)t.textContent=msg;
    const root=document.getElementById('vividGoalsPage');
    if(root&&task&&day){
      for(const anchor of root.querySelectorAll('[data-proof-task]')){
        if(anchor.dataset.proofTask!==task||anchor.dataset.proofDay!==day)continue;
        const t=anchor.querySelector('.gp-inline-status');
        if(t){t.textContent=msg;t.dataset.kind=kind;}
      }
    }
 }
 function proofEntries(){
   const state=window.VividGoals?.get();
   return Array.isArray(state?.extras?.proofs)?state.extras.proofs:[];
 }
 function proofKey(uid,id){return uid+':'+id}
 function escapeKey(s){return String(s||'').replace(/[^a-zA-Z0-9_-]/g,'_').slice(0,100)}
 function extOf(file){return String(file.name||'').split('.').pop().toLowerCase()}
 async function upload(files,task,day){
   if(uploading){notify('Bir fayl yuklanmoqda. Tugashini kuting.',task,day,'warning');return;}
   if(!active()||day<START||!task){notify('Dalil yuklash uchun Goals hisobingizni oching.',task,day,'error');return;}
   uploading=true;
   let ok=0,localOnly=0,fail=0;
   try{
     const {client:c,uid}=await verify();
     for(const file of files){
       const ext=extOf(file);
       if(!EXT.has(ext)){fail++;notify(file.name+' — PDF, HTML, PNG yoki video kerak.',task,day,'error');continue;}
       if(file.size>MAX){fail++;notify(file.name+' — 50 MB dan katta. Kichikroq fayl tanlang.',task,day,'error');continue;}
       const fid=(typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now()+'-'+Math.random().toString(36).slice(2));
       const key=proofKey(uid,fid),path=uid+'/'+day+'/'+escapeKey(task)+'/'+fid+'.'+ext;
       const mime=MIME[ext];
       notify('⏳ Saqlanmoqda: '+file.name,task,day,'info');
       let local=false,remote=false,error='';
       try{await store('write',key,file);local=true;}catch(err){error='Qurilmaga saqlanmadi: '+String(err?.message||err);}
       const entry={id:fid,task:String(task).slice(0,120),day,
         filename:String(file.name).slice(0,180),mime,size:file.size,
         location:'device',path:'',uploadedAt:new Date().toISOString()};
       if(local){
         const saved=window.VividGoals.saveExtras(ex=>{
           ex.proofs??=[];if(!ex.proofs.some(x=>x.id===fid))ex.proofs.push(entry);
         });
         if(!saved){fail++;notify('Fayl saqlandi, lekin Goals ro‘yxatini yangilab bo‘lmadi.',task,day,'error');continue;}
         ok++;localOnly++;
         notify('✅ '+file.name+' — ushbu qurilmada saqlandi. ☁️ Cloud tekshirilmoqda…',task,day,'info');
       }
       try{
         const result=await c.storage.from(BUCKET).upload(path,file,{upsert:false,contentType:mime});
         if(result.error)throw result.error;
         remote=true;
       }catch(err){error=String(err?.message||err);}
       if(remote){
         const saved=window.VividGoals.saveExtras(ex=>{
           ex.proofs??=[];
           const found=ex.proofs.find(x=>x.id===fid);
           if(found){found.location='cloud';found.path=path;}
           else ex.proofs.push({...entry,location:'cloud',path});
         });
         if(saved){
           if(local){localOnly--;try{await store('delete',key);}catch{}}
           if(!local)ok++;
           notify('✅ '+file.name+' — cloudga yuklandi!',task,day,'success');
         }else{
           fail++;notify('Fayl serverga yetdi, lekin Goals qaydini saqlab bo‘lmadi.',task,day,'error');
         }
       }else if(local){
         notify('✅ '+file.name+' — shu qurilmada saqlandi. Cloud uchun Supabase Storage bucket sozlanishi kerak. '+error,task,day,'warning');
       }else{
         fail++;notify('❌ '+file.name+' saqlanmadi. '+error,task,day,'error');
       }
     }
     if(ok&&files.length>1)notify(ok+' ta fayl saqlandi. '+(localOnly?localOnly+' ta faqat ushbu qurilmada.':'')+(fail?' '+fail+' ta xato.':''),task,day,localOnly?'warning':'success');
   }catch(err){notify('❌ Dalil yuklashda xato: '+String(err?.message||err),task,day,'error');}
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
     const btn='<label class="gp-add gp-upload-label" title="PDF, HTML, PNG yoki video biriktirish"><span>📎 Dalil '+(match.length?'('+match.length+')':'+')+'</span><input class="gp-native-file" type="file" data-gp-file="'+safe(task)+'" data-gp-day="'+safe(d)+'" accept=".pdf,.html,.htm,.png,.mp4,.webm,.mov,.m4v,application/pdf,image/png,video/mp4,video/webm" multiple aria-label="Dalil tanlash: '+safe(task)+'"></label>';
     const list=match.map(p=>'<span class="gp-file"><button type="button" data-gp-open="'+safe(p.id)+'" title="'+safe(p.filename)+'">'+safe(fileLabel(p))+'</button><small>'+ (p.location==='cloud'?'☁️ Cloud':'📱 Faqat shu qurilmada')+'</small><button type="button" data-gp-delete="'+safe(p.id)+'" aria-label="Dalilni o‘chirish">×</button></span>').join('');
     const live=lastNotice.task===task&&lastNotice.day===d?'<small role="status" class="gp-inline-status" data-kind="'+safe(lastNotice.kind)+'">'+safe(lastNotice.message)+'</small>':'<small role="status" class="gp-inline-status"></small>';
     anchor.innerHTML=btn+(list?'<div class="gp-files">'+list+'</div>':'')+live;
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
 document.addEventListener('vivid-goals:rendered',render);
 document.addEventListener('click',e=>{
   if(!active())return;
   const open=e.target.closest('[data-gp-open]');
   if(open){e.preventDefault();openProof(open.dataset.gpOpen);return;}
   const del=e.target.closest('[data-gp-delete]');
   if(del){e.preventDefault();delProof(del.dataset.gpDelete);}
 });
 document.addEventListener('change',e=>{
   const input=e.target;
   if(!input?.matches?.('input[data-gp-file]'))return;
   const files=Array.from(input.files||[]);
   const task=input.dataset.gpFile,day=input.dataset.gpDay;
   input.value='';
   if(files.length)upload(files,task,day);
 });
 window.VividGoalsProofs={refresh:render,bucket:BUCKET,upload};
})();