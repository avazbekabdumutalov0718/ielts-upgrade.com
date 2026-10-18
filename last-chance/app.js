(()=>{
'use strict';
const $=s=>document.querySelector(s),$$=s=>Array.from(document.querySelectorAll(s)),E=s=>String(s??'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/"/g,'&quot;').replace(/'/g,'&#39;');
const dateKey=d=>d.getFullYear()+'-'+String(d.getMonth()+1).padStart(2,'0')+'-'+String(d.getDate()).padStart(2,'0'),today=()=>{let d=new Date;d.setHours(0,0,0,0);return d},fromDate=s=>new Date(s+'T00:00:00'),shift=(d,n)=>new Date(d.getFullYear(),d.getMonth(),d.getDate()+n);
const groups=[
['IELTS','Reading',['Read 1 article','Solve 1 passage','ELS book','Learn 25+ words']],
['IELTS','Listening',['Listening 2 podcast','Solve 2 parts and analysis','Keywords table','Siroj method',"G'anisher method"]],
['IELTS','Speaking',['Learn 20+ collections','Speak only English','Mock full','Learn 2 structures','Conversation with Maya']],
['IELTS','Writing',['Write 1 essay','Analysis','Learn 2 structures','Learn 20+ words','Idea generate']],
['IELTS','General English',['Learn new theme 1 every day']],
['SAT','Math va English',['Math 8-9 class (1-noyabrdan)','English math (1-noyabrdan)','Learn 30 words in 2 days']],
["Qo'shimcha",'Kunlik',['15+ pages book','5 times praying','17:00 Gym']]
], milestones=[['IELTS','2026-12-07'],['SAT','2027-03-06'],['Turkcha','2027-05-01']],moods=['😫','😕','😐','🙂','🔥'],weekdays=['Ya','Du','Se','Ch','Pa','Ju','Sh'],cols=['passage','type','reason','evidence','para'];
const defaults=()=>({days:{},custom:[],rows:[{}],mocks:[],goals:{IELTS:'7.5',SAT:'1400',Turkcha:'B1'},reward:'',blocks:[{t:'06:00',x:''}],start:'2026-10-15',theme:'dark',timer:{mode:'focus',left:1500,until:0}});
let S=defaults(),current=today(),mo=0,qfilter='',cloud=null,uid='',saveQueued=false,busy=false,debounce=0;
const stateKey='last_chance_v1',bucket='last-chance-proofs',legacyBucket='vivid-goals-proofs';
function normalize(v){let b=defaults();if(v&&typeof v==='object')Object.assign(b,v);for(let k of ['custom','rows','mocks','blocks'])if(!Array.isArray(b[k]))b[k]=defaults()[k];if(!b.rows.length)b.rows=[{}];if(!b.days||typeof b.days!=='object')b.days={};b.goals=Object.assign({},defaults().goals,b.goals);b.timer=Object.assign({},defaults().timer,b.timer);return b}
const storageKey=()=>stateKey+':'+(uid||'guest');
function localRead(){try{return JSON.parse(localStorage.getItem(storageKey())||(uid?'null':localStorage.getItem('lc'))||'null')}catch(e){return null}}
function localWrite(){try{localStorage.setItem(storageKey(),JSON.stringify(S))}catch(e){setStatus('Qurilma xotirasi to‘ldi',true)}}
function setStatus(message,error=false){let el=$('#cloudStatus');el.textContent=message;el.style.color=error?'var(--red)':'var(--ok)'}
function save(){S._updatedAt=Date.now();localWrite();saveQueued=true;setStatus(uid?'☁ Supabase saqlanmoqda…':'⚠ Login qiling — lokal saqlandi',!uid);clearTimeout(debounce);debounce=setTimeout(sync,650)}
async function sync(){if(busy||!saveQueued||!cloud||!uid)return;busy=true;saveQueued=false;let snapshot=JSON.parse(JSON.stringify(S));try{
 let check=await cloud.auth.getUser();if(check.error||check.data?.user?.id!==uid)throw Error('Sessiya tugagan');
 let r=await cloud.from('user_state').upsert({user_id:uid,key:stateKey,value:snapshot},{onConflict:'user_id,key'});if(r.error)throw r.error;
 setStatus('✓ Supabase’da saqlandi')
}catch(e){saveQueued=true;setStatus('⚠ Sync xato: '+(e.message||e),true)}
finally{busy=false;if(saveQueued&&navigator.onLine){clearTimeout(debounce);debounce=setTimeout(sync,5000)}}}
async function init(){try{
 let conf=window.VOCAB_SUPABASE;if(!conf||!window.supabase)throw Error('Supabase sozlanmagan');
 cloud=window.supabase.createClient(conf.url,conf.key,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}});
 let user=await cloud.auth.getUser();uid=user.data?.user?.id||'';
 if(!uid){S=normalize(localRead());render();setStatus('⚠ VIVID IELTS hisobiga kiring',true);return}
 let local=localRead();let r=await cloud.from('user_state').select('value').eq('user_id',uid).eq('key',stateKey).maybeSingle();if(r.error)throw r.error;
 let server=r.data?.value,localNewer=server&&local&&Number(local._updatedAt||0)>Number(server._updatedAt||0);S=normalize(localNewer?local:(server||local));render();if(server&&!localNewer){localWrite();setStatus('✓ Supabase’dan yuklandi')}else save();
}catch(e){S=normalize(localRead());render();setStatus('⚠ Cloud ishlamadi: '+(e.message||e),true)}}
window.addEventListener('online',()=>{if(saveQueued)sync()});
document.addEventListener('visibilitychange',()=>{if(document.hidden&&saveQueued)sync()});
function day(k=dateKey(current)){return S.days[k]||(S.days[k]={t:{},min:0,mood:0,en:0,note:'',dis:0})}
function tasks(){let a=[];groups.forEach(g=>g[2].forEach(n=>a.push({id:g[0]+'|'+g[1]+'|'+n,n,m:g[0],s:g[1]})));S.custom.forEach(t=>a.push({id:t.id,n:t.n,m:'Mening vazifalarim',s:"Qo‘shimcha",custom:true}));return a}
function fraction(k){let x=S.days[k],a=tasks();return x&&a.length?a.filter(t=>x.t?.[t.id]?.d).length/a.length:0}
function streak(){let d=today(),n=0;if(fraction(dateKey(d))<.8)d=shift(d,-1);while(fraction(dateKey(d))>=.8&&n<10000){n++;d=shift(d,-1)}return n}
function last7(){return Array.from({length:7},(_,i)=>shift(today(),i-6))}
function bar(v,max=100){return '<div class="bar"><i style="width:'+Math.min(100,Math.max(0,v/max*100))+'%"></i></div>'}
function graph(a,max){return '<div class="bars">'+a.map(x=>'<div class="bc"><span>'+E(x.v)+'</span><i style="height:'+Math.min(100,x.v/max*100)+'%"></i><small>'+E(x.l)+'</small></div>').join('')+'</div>'}
function countDown(){
 $('#goalc').innerHTML=milestones.map(x=>'<div class="card gc" data-d="'+x[1]+'"><small>'+x[0]+' · '+x[1]+'</small><div class="n"></div><small class="cdt"></small><div class="bar"><i></i></div><small class="pc"></small><div><input data-i="goal" data-v="'+x[0]+'" value="'+E(S.goals[x[0]])+'" aria-label="'+x[0]+' maqsad"> maqsad</div></div>').join('');
 tick();
}
function tick(){
 $$('.gc').forEach(c=>{let end=fromDate(c.dataset.d),ms=end-new Date,k=Math.max(0,Math.ceil(ms/864e5)),h=Math.max(0,Math.floor(ms/36e5)%24),m=Math.max(0,Math.floor(ms/6e4)%60),st=fromDate(S.start),range=end-st,p=Math.max(0,Math.min(100,range>0?Math.round((new Date-st)/range*100):100));
 c.classList.remove('ok','warn','bad');c.classList.add(k>60?'ok':k>30?'warn':'bad');c.querySelector('.n').textContent=k;c.querySelector('.cdt').textContent=h+' soat '+m+' daqiqa qoldi';c.querySelector('.bar i').style.width=p+'%';c.querySelector('.pc').textContent=p+'% vaqt o‘tdi'});
 let d=new Date,y=d.getFullYear(),yp=Math.round((d-new Date(y,0,1))/(new Date(y+1,0,1)-new Date(y,0,1))*100),mp=Math.round(d.getDate()/new Date(y,d.getMonth()+1,0).getDate()*100);
 $('#yr').innerHTML='<div>'+y+' yil: '+yp+'% o‘tdi'+bar(yp)+'</div><div>Shu oy: '+mp+'% o‘tdi'+bar(mp)+'</div>';
}
function dash(){
 let d=day(),a=tasks(),completed=a.filter(t=>d.t?.[t.id]?.d).length,p=Math.round(completed/a.length*100),goal=dateKey(current)<'2026-11-01'?8:dateKey(current)<'2026-12-08'?4:10;
 $('#dash').innerHTML='<div class="nav"><button class="ghost" data-a="date" data-v="-1">‹</button><b>'+current.toLocaleDateString('uz-UZ',{day:'numeric',month:'long',year:'numeric'})+'</b><button class="ghost" data-a="date" data-v="1">›</button><button class="ghost" data-a="date" data-v="0">Bugun</button></div><div class="g">'+
 '<div class="card dg"><svg width="100" height="100" viewBox="0 0 100 100"><circle cx="50" cy="50" r="42" fill="none" stroke="var(--line)" stroke-width="10"/><circle cx="50" cy="50" r="42" fill="none" stroke="var(--ok)" stroke-width="10" stroke-dasharray="'+(263.9*p/100)+' 263.9" transform="rotate(-90 50 50)"/><text x="50" y="56" text-anchor="middle" fill="currentColor" font-size="19">'+p+'%</text></svg><div><b>'+completed+'/'+a.length+'</b> vazifa<br><small>Streak: '+streak()+' kun (80%+)</small></div></div>'+
 '<div class="card"><h3>O‘qish soati</h3><b>'+((d.min||0)/60).toFixed(1)+'</b> / '+goal+'+ soat'+bar((d.min||0)/60,goal)+'<button class="ghost" data-a="minutes" data-v="-30">-30 daq</button> <button class="ghost" data-a="minutes" data-v="30">+30 daq</button> <button class="ghost" data-a="minutes" data-v="60">+1 soat</button></div>'+
 '<div class="card em"><h3>Kayfiyat</h3>'+moods.map((m,i)=>'<button data-a="mood" data-v="'+(i+1)+'" class="'+(d.mood===i+1?'on':'')+'">'+m+'</button>').join('')+'<h3>Energiya</h3>'+[1,2,3,4,5].map(i=>'<button data-a="energy" data-v="'+i+'" class="'+(d.en===i?'on':'')+'">⚡'+i+'</button>').join('')+'</div>'+
 '<div class="card"><h3>Chalg‘ish</h3><b>'+(d.dis||0)+'</b> daqiqa<br><button class="ghost" data-a="distraction" data-v="5">+5</button> <button class="ghost" data-a="distraction" data-v="15">+15</button> <button class="ghost" data-a="distraction" data-v="-99999">Nol</button></div>'+
 '<div class="card wide"><h3>Bugun nima qildim?</h3><textarea data-i="note" rows="3" style="width:100%">'+E(d.note||'')+'</textarea></div></div>';
}
function renderTasks(){
 let d=day(),m='',s='',h='<div class="card" id="tsum"></div>';
 tasks().forEach(t=>{if(m!==t.m){m=t.m;s='';h+='<h2>'+E(m)+'</h2>'}if(s!==t.s){s=t.s;h+='<h3>'+E(s)+'</h3>'}let state=d.t?.[t.id]||{},p=state.p?.length||0;
 h+='<div class="t'+(state.d?' dn':'')+'"><span class="tx">'+E(t.n)+'</span><span class="tm"><input type="number" class="tmi" min="0" placeholder="reja" title="Reja (daqiqa)" data-i="te" data-v="'+E(t.id)+'" value="'+E(state.e??'')+'"><input type="number" min="0" class="tmi" placeholder="fakt" title="Haqiqiy (daqiqa)" data-i="ta" data-v="'+E(t.id)+'" value="'+E(state.a??'')+'"></span>'+(t.custom?'<button class="x" data-a="delcustom" data-v="'+E(t.id)+'">×</button>':'')+'<button class="pf'+(p?' has':'')+'" data-a="proof" data-v="'+E(t.id)+'">'+(p?'Isbot ('+p+')':'+ Isbot')+'</button><input type="checkbox" class="tick" data-i="tick" data-v="'+E(t.id)+'" '+(state.d?'checked':'')+'></div>'});
 $('#tasklist').innerHTML=h+'<div class="add"><input id="nt" placeholder="Yangi vazifa..."><button class="btn" data-a="addtask">Qo‘shish</button></div>';
 totals();
}
function totals(){let e=0,a=0;tasks().forEach(t=>{let x=day().t?.[t.id]||{};e+=+x.e||0;a+=+x.a||0});$('#tsum').innerHTML='Reja: <b>'+e+'</b> daq · Haqiqat: <b>'+a+'</b> daq · Farq: <b>'+(a-e)+'</b> daq';$$('[data-i="ta"]').forEach(x=>{let r=day().t?.[x.dataset.v]||{};x.classList.toggle('over',+r.a>+r.e&&+r.e>0)})}
function norm(s){return String(s||'').trim().toLowerCase()}
function mistakeFilter(){let opts=[...new Set(S.rows.map(x=>norm(x.type)).filter(Boolean))].sort();if(qfilter&&!opts.includes(qfilter))qfilter='';$('#qf').innerHTML='<option value="">Hammasi</option>'+opts.map(x=>'<option '+(x===qfilter?'selected':'')+'>'+E(x)+'</option>').join('');let n=0;$$('#mb tr').forEach((tr,i)=>{tr.hidden=!!qfilter&&norm(S.rows[i].type)!==qfilter;if(!tr.hidden)n++});$('#qc').textContent=n+'/'+S.rows.length+' qator'}
function mistakes(){$('#mb').innerHTML=S.rows.map((r,i)=>'<tr>'+cols.map(c=>'<td><textarea rows="1" data-i="cell" data-v="'+i+'" data-k="'+c+'">'+E(r[c]||'')+'</textarea></td>').join('')+'<td><button class="x" data-a="delrow" data-v="'+i+'">×</button></td></tr>').join('');$$('#mb textarea').forEach(x=>{x.style.height='auto';x.style.height=x.scrollHeight+'px'});mistakeFilter()}
function mocks(){let a=S.mocks,target=parseFloat(S.goals.IELTS)||7,last=a[a.length-1];$('#mlist').innerHTML=a.slice().reverse().map((m,i)=>'<div class="ml"><span>'+E(m.d)+' · <b>'+m.o+'</b> (R'+m.r+' L'+m.l+' W'+m.w+' S'+m.s+')</span><button class="x" data-a="delmock" data-v="'+(a.length-1-i)+'">×</button></div>').join('');$('#mchart').innerHTML=a.length?graph(a.slice(-8).map(x=>({l:x.d.slice(5),v:x.o})),9):'<p class="sub">Mock kiriting.</p>';
 if(last){let parts=[['Reading',last.r],['Listening',last.l],['Writing',last.w],['Speaking',last.s]],low=Math.min(...parts.map(x=>x[1]));$('#weak').innerHTML=parts.map(x=>'<div class="wk'+(x[1]===low?' low':'')+'"><span>'+x[0]+'</span>'+bar(x[1],9)+'<b>'+x[1]+'</b></div>').join('')+'<p class="sub">Eng zaif: '+parts.find(x=>x[1]===low)[0]+' · Maqsad: '+target+'</p>'}else $('#weak').innerHTML='<p class="sub">Hali mock yo‘q.</p>';
 $('#rwv').textContent=S.reward||'(sovg‘a yozilmagan)';$('#rwv').className='rwv'+(a.some(x=>x.o>=target)?'':' lock')}
function blocks(){$('#blocks').innerHTML=S.blocks.map((b,i)=>'<div class="blk"><input type="time" data-i="blk" data-v="'+i+'" data-k="t" value="'+E(b.t)+'"><input data-i="blk" data-v="'+i+'" data-k="x" value="'+E(b.x)+'" placeholder="Nima qilaman?"><button class="x" data-a="delblock" data-v="'+i+'">×</button></div>').join('')}
function calendar(){let d=today(),first=new Date(d.getFullYear(),d.getMonth()+mo,1),y=first.getFullYear(),m=first.getMonth(),max=new Date(y,m+1,0).getDate(),blank=(first.getDay()+6)%7;
 let h='<div class="cn"><button data-a="month" data-v="-1">‹</button><b>'+first.toLocaleDateString('uz-UZ',{year:'numeric',month:'long'})+'</b><button data-a="month" data-v="1">›</button></div><div class="cal">'+['Du','Se','Ch','Pa','Ju','Sh','Ya'].map(x=>'<small>'+x+'</small>').join('')+'<span></span>'.repeat(blank);
 for(let i=1;i<=max;i++){let k=dateKey(new Date(y,m,i)),p=fraction(k);h+='<button class="dy'+(p>=.8?' g':p?' y':'')+(k===dateKey(current)?' sel':'')+'" data-a="go" data-v="'+k+'">'+i+'</button>'}$('#cal').innerHTML=h+'</div>'}
function weekly(){let dates=last7(),a=tasks(),done=0,minutes=0,dis=0,successful=0,feels=[];
 $('#wh').innerHTML=graph(dates.map(d=>({l:weekdays[d.getDay()],v:+((S.days[dateKey(d)]?.min||0)/60).toFixed(1)})),12);
 $('#wm').innerHTML=dates.map(d=>{let x=S.days[dateKey(d)]||{};return '<div class="mr"><span>'+weekdays[d.getDay()]+' '+dateKey(d).slice(5)+'</span><span>'+(moods[x.mood-1]||'—')+' ⚡'+(x.en||'—')+'</span></div>'}).join('');
 dates.forEach(d=>{let x=S.days[dateKey(d)];if(!x)return;let n=a.filter(t=>x.t?.[t.id]?.d).length;done+=n;minutes+=x.min||0;dis+=x.dis||0;if(n/a.length>=.8)successful++;if(x.mood)feels.push(x.mood)});
 let left=a.length-a.filter(t=>S.days[dateKey(today())]?.t?.[t.id]?.d).length;
 $('#rep').innerHTML=[['Bajarilgan vazifalar',done+'/'+(a.length*7)],['80%+ kunlar',successful+'/7'],['O‘qish soati',(minutes/60).toFixed(1)],['Chalg‘ish',dis+' daq'],['O‘rtacha kayfiyat',feels.length?moods[Math.round(feels.reduce((a,b)=>a+b,0)/feels.length)-1]:'—'],['Bugun qolgan',left+' ta']].map(x=>'<div class="mr"><span>'+x[0]+'</span><b>'+x[1]+'</b></div>').join('')}
function timer(){let p=S.timer,r=p.until?Math.max(0,Math.ceil((p.until-Date.now())/1000)):p.left;if(p.until&&r===0){p.until=0;if(p.mode==='focus'){day(dateKey(today())).min=(day(dateKey(today())).min||0)+25;p.mode='rest';p.left=300}else{p.mode='focus';p.left=1500}save();dash();weekly();r=p.left}
 let s=String(Math.floor(r/60)).padStart(2,'0')+':'+String(r%60).padStart(2,'0');$('#pt').textContent=s;$('#ft').textContent=s;$('#pm').textContent=p.mode==='focus'?'Fokus':'Dam olish';$('#fm').textContent=$('#pm').textContent}
function render(){document.documentElement.dataset.theme=S.theme;$('#quote').textContent='Bugungi mehnat ertangi natijaga aylanadi.';$('#rwi').value=S.reward;$('#md').value=dateKey(today());countDown();refresh();mistakes();blocks()}
function refresh(){dash();renderTasks();mocks();calendar();weekly();timer()}
function proofKind(m){if(m.type?.startsWith('image/'))return'img';if(m.type?.startsWith('video/'))return'video';if(/\.pdf$/i.test(m.name))return'iframe';if(/\.html?$/i.test(m.name))return'html';return'file'}
const database=new Promise(ok=>{try{let r=indexedDB.open('lc_files',1);r.onupgradeneeded=()=>{if(!r.result.objectStoreNames.contains('f'))r.result.createObjectStore('f',{keyPath:'id'})};r.onsuccess=()=>ok(r.result);r.onerror=()=>ok(null)}catch(e){ok(null)}});
async function localFile(method,m){let db=await database;if(!db)return null;return new Promise(ok=>{try{let q=method==='put'?db.transaction('f','readwrite').objectStore('f').put(m):method==='del'?db.transaction('f','readwrite').objectStore('f').delete(m):db.transaction('f','readonly').objectStore('f').get(m);q.onsuccess=()=>ok(q.result);q.onerror=()=>ok(null)}catch(e){ok(null)}})}
function proof(id){let d=day(),st=d.t[id]||(d.t[id]={});st.p=st.p||[];$('#ov').dataset.id=id;
 $('#box').innerHTML='<div class="bh"><strong>'+E(id.split('|').slice(-1)[0])+'</strong><button class="ghost" data-a="close">Yopish</button></div><input type="file" id="fi" accept=".pdf,.html,.htm,.png,.jpg,.jpeg,.mp4,.webm" multiple hidden><button class="btn" data-a="pick">Dalil yuklash</button><div id="uploadStatus" class="sub"></div>'+st.p.map((m,i)=>'<div class="fl"><a href="#" data-a="open" data-v="'+i+'">'+E(m.name)+'</a><em>'+(m.state==='cloud'?'☁ Supabase':'📱 Qurilmada')+'</em><button class="x" data-a="delf" data-v="'+i+'">×</button></div>').join('')+'<div id="vw"></div>';
 $('#ov').classList.add('on');$('#fi').onchange=async ev=>{let input=Array.from(ev.target.files||[]);for(let f of input){if(f.size>50*1024*1024){$('#uploadStatus').textContent='50 MB dan oshmasin';continue}
 let idf='f'+Date.now()+Math.random().toString(36).slice(2,9),item={id:idf,name:f.name,type:f.type,state:'device',path:''};await localFile('put',{id:idf,blob:f});st.p.push(item);save();
 if(uid&&cloud){try{let u=await cloud.auth.getUser();if(u.data?.user?.id!==uid)throw Error('Sessiya tugagan');let ext=(f.name.split('.').pop()||'bin').toLowerCase(),path=uid+'/last-chance/'+dateKey(current)+'/'+idf+'.'+ext,r=await cloud.storage.from(bucket).upload(path,f,{upsert:false,contentType:f.type});if(r.error){let old=await cloud.storage.from(legacyBucket).upload(path,f,{upsert:false,contentType:f.type});if(old.error)throw r.error;item.bucket=legacyBucket}else item.bucket=bucket;item.state='cloud';item.path=path;save()}catch(e){setStatus('⚠ Dalil faqat qurilmada: '+(e.message||e),true)}}}
 proof(id)}
}
async function openProof(n){let arr=day().t[$('#ov').dataset.id]?.p||[],m=arr[+n];if(!m)return;let x=null;if(m.state==='cloud'&&m.path&&cloud){let r=await cloud.storage.from(m.bucket||legacyBucket).download(m.path);if(!r.error)x=r.data}
 if(!x){let r=await localFile('get',m.id);x=r?.blob}if(!x){$('#vw').textContent='Dalil topilmadi. Cloud Storage sozlamasini tekshiring.';return}
 let url=URL.createObjectURL(x),t=proofKind(m),el=$('#vw');el.replaceChildren();if(t==='file'){let a=document.createElement('a');a.href=url;a.download=m.name;a.textContent='Faylni yuklab olish';el.append(a);return}
 let obj=document.createElement(t==='html'?'iframe':t);if(t==='html')obj.setAttribute('sandbox','allow-scripts');if(t==='video')obj.controls=true;obj.src=url;obj.className='view';el.append(obj)}
function print(){let a=tasks(),days=last7(),d=day(),rows=days.map(t=>{let k=dateKey(t),x=S.days[k]||{},count=a.filter(y=>x.t?.[y.id]?.d).length;return '<tr><td>'+k+'</td><td>'+count+'/'+a.length+'</td><td>'+((x.min||0)/60).toFixed(1)+'</td><td>'+(x.dis||0)+'</td></tr>'}).join('');
 $('#prt').innerHTML='<h1>LAST CHANCE — haftalik hisobot</h1><table><thead><tr><th>Sana</th><th>Vazifa</th><th>Soat</th><th>Chalg‘ish</th></tr></thead><tbody>'+rows+'</tbody></table><h2>'+dateKey(current)+'</h2><table><thead><tr><th>✔</th><th>Vazifa</th><th>Reja</th><th>Fakt</th><th>Dalil</th></tr></thead><tbody>'+a.map(t=>{let x=d.t?.[t.id]||{};return '<tr><td>'+(x.d?'✔':'☐')+'</td><td>'+E(t.n)+'</td><td>'+(x.e||'')+'</td><td>'+(x.a||'')+'</td><td>'+(x.p?.length||0)+'</td></tr>'}).join('')+'</tbody></table>'}
let audio=null,node=null;
function noise(v){if(node){node.stop();node=null}if(v==='off')return;try{audio=audio||new(window.AudioContext||window.webkitAudioContext)();let b=audio.createBuffer(1,audio.sampleRate*2,audio.sampleRate),a=b.getChannelData(0);for(let i=0;i<a.length;i++)a[i]=Math.random()*2-1;node=audio.createBufferSource();node.buffer=b;node.loop=true;let f=audio.createBiquadFilter(),g=audio.createGain();f.type=v==='rain'?'bandpass':'lowpass';f.frequency.value=v==='rain'?2500:1200;g.gain.value=.2;node.connect(f);f.connect(g);g.connect(audio.destination);node.start()}catch(e){}}
const action={
 sync(){if(!uid){setStatus('Avval VIVID IELTS hisobingizga kiring',true);return}saveQueued=true;sync()},
 theme(){S.theme=S.theme==='light'?'dark':'light';document.documentElement.dataset.theme=S.theme;save()},
 date(v){current=+v===0?today():shift(current,+v);refresh()},
 minutes(v){day().min=Math.max(0,(+day().min||0)+(+v));save();dash();weekly()},
 mood(v){day().mood=+v;save();dash();weekly()},
 energy(v){day().en=+v;save();dash();weekly()},
 distraction(v){day().dis=Math.max(0,(+day().dis||0)+(+v));save();dash();weekly()},
 addtask(){let n=$('#nt').value.trim();if(!n)return;S.custom.push({id:'c'+Date.now(),n});save();refresh()},
 delcustom(v){if(!confirm('Vazifani o‘chirasizmi?'))return;S.custom=S.custom.filter(x=>x.id!==v);save();refresh()},
 proof(v){proof(v)},pick(){$('#fi')?.click()},close(){$('#ov').classList.remove('on');refresh()},open(v){openProof(v)},
 async delf(v){let id=$('#ov').dataset.id,p=day().t[id]?.p;if(!p)return;let f=p[+v];if(!f||!confirm('Dalil o‘chirilsinmi?'))return;p.splice(+v,1);await localFile('del',f.id);save();proof(id)},
 addrow(){qfilter='';S.rows.push({});save();mistakes()},delrow(v){S.rows.splice(+v,1);if(!S.rows.length)S.rows.push({});save();mistakes()},
 sortt(){S.rows.sort((a,b)=>norm(a.type).localeCompare(norm(b.type)));save();mistakes()},
 addmock(){let a=['#mr','#ml','#mw','#ms'].map(id=>parseFloat(($(id).value||'').replace(',','.')));if(a.some(x=>!Number.isFinite(x)||x<0||x>9||x*2!==Math.round(x*2))){alert('0 dan 9 gacha, 0.5 qadamdagi band kiriting.');return}let [r,l,w,s]=a;S.mocks.push({d:$('#md').value||dateKey(today()),r,l,w,s,o:Math.round((r+l+w+s)/2)/2});S.mocks.sort((a,b)=>a.d.localeCompare(b.d));save();['#mr','#ml','#mw','#ms'].forEach(id=>$(id).value='');mocks()},
 delmock(v){S.mocks.splice(+v,1);save();mocks()},
 pstart(){let p=S.timer;if(p.until){p.left=Math.max(1,Math.ceil((p.until-Date.now())/1000));p.until=0}else p.until=Date.now()+p.left*1000;save();timer()},
 preset(){S.timer={mode:'focus',left:1500,until:0};save();timer()},
 focus(){$('#fo').classList.add('on');document.documentElement.requestFullscreen?.().catch(()=>{})},
 unfocus(){$('#fo').classList.remove('on');noise('off');if(document.fullscreenElement)document.exitFullscreen?.()},
 noise(v){noise(v)},addblk(){S.blocks.push({t:'',x:''});save();blocks()},delblk(v){S.blocks.splice(+v,1);save();blocks()},
 month(v){mo+=+v;calendar()},go(v){current=fromDate(v);refresh();$('#today').scrollIntoView()},
 print(){print();window.print()}
};
document.addEventListener('click',ev=>{let el=ev.target.closest('[data-a]');if(!el||!action[el.dataset.a])return;ev.preventDefault();action[el.dataset.a](el.dataset.v)});
document.addEventListener('input',ev=>{let el=ev.target,i=el.dataset.i;if(!i||i==='tick')return;let v=el.dataset.v,k=el.dataset.k;
 if(i==='cell'){S.rows[+v][k]=el.value;el.style.height='auto';el.style.height=el.scrollHeight+'px'}
 else if(i==='note')day().note=el.value;
 else if(i==='goal'){S.goals[v]=el.value;mocks()}
 else if(i==='reward'){S.reward=el.value;$('#rwv').textContent=el.value}
 else if(i==='blk')S.blocks[+v][k]=el.value;
 else if(i==='te'||i==='ta'){let t=day().t[v]||(day().t[v]={});t[i==='te'?'e':'a']=el.value===''?'':Math.max(0,+el.value);totals()}save()});
document.addEventListener('change',ev=>{let el=ev.target;if(el.id==='qf'){qfilter=el.value;mistakeFilter();return}if(el.dataset.i==='cell'&&el.dataset.k==='type'){mistakeFilter();return}if(el.dataset.i==='tick'){let id=el.dataset.v;(day().t[id]||(day().t[id]={})).d=el.checked;save();refresh()}});
$('#ov').addEventListener('click',e=>{if(e.target.id==='ov')action.close()});
window.addEventListener('beforeprint',print);
init();setInterval(()=>{tick();timer()},1000);
fetch('https://api.aladhan.com/v1/timingsByCity?city=Tashkent&country=Uzbekistan&method=3').then(r=>r.json()).then(j=>{$('#pray').innerHTML=[['Bomdod','Fajr'],['Peshin','Dhuhr'],['Asr','Asr'],['Shom','Maghrib'],['Xufton','Isha']].map(x=>'<div><small>'+x[0]+'</small><b>'+j.data.timings[x[1]]+'</b></div>').join('')}).catch(()=>{$('#pray').textContent='Internet kerak.'});
})();