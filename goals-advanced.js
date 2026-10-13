(() => {
 'use strict';
 /* Advanced Goals adds a private dashboard to the existing VividGoals tracker.
    It never runs as a public user and delegates account persistence to Goals + Supabase RLS. */
 const OWNER='fenric18@gmail.com', EVENT_TYPES=new Set(['reading','article','listening','speaking','writing','mock']);
 const SKILLS=['Reading','Listening','Speaking','Writing','SAT','General English','Turkish'];
 const LABELS={reading:'Reading',article:'Reading',listening:'Listening',speaking:'Speaking',writing:'Writing',mock:'Mock'};
 const TABS=[['dashboard','Dashboard'],['planner','Planner'],['focus','Focus & Sessions'],['analytics','Analytics'],['ielts','IELTS & SAT'],['settings','Settings & Export']];
 const DEFAULT_DATES={ielts:'2026-12-07',sat:'2027-03-06',turkish:'2027-05-01'};
 const esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
 const clamp=(v,min,max)=>Math.max(min,Math.min(max,Number(v)||0));
 const id=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():'g'+Date.now()+Math.random().toString(36).slice(2);
 const localDate=(d=new Date())=>[d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
 const offset=(day,n)=>{const d=new Date(day+'T12:00:00');d.setDate(d.getDate()+n);return localDate(d)};
 const fmt=day=>{try{return new Date(day+'T12:00:00').toLocaleDateString('uz-UZ',{day:'numeric',month:'short'})}catch{return day}};
 const mins=v=>Math.round(clamp(v,0,100000));
 const hh=v=>v>=60?(Math.round(v/6)/10)+' h':v+' min';
 const copy=o=>JSON.parse(JSON.stringify(o));
 const api=()=>window.VividGoals;
 const authorized=()=>!!(window.VocabCloud?.enabled&&window.VocabCloud?.userId&&String(window.VocabCloud?.email||'').trim().toLowerCase()===OWNER);
 const current=()=>api()?.get();
 const selected=()=>api()?.getDay()||localDate();
 const extra=s=>s?.extras||{};
 const sessions=s=>Array.isArray(extra(s).sessions)?extra(s).sessions:[];
 const logs=s=>Array.isArray(extra(s).activities)?extra(s).activities:[];
 const planned=s=>extra(s).plan||{};
 const knownTasks=()=>api()?.getTasks()||[];
 const valDay=(s,day)=>s?.days?.[day]||{};
 const duration=(s,day,cat)=>sessions(s).filter(x=>x.day===day&&(!cat||x.category===cat)).reduce((n,x)=>n+mins(x.minutes),0);
 const isDone=(s,day,task)=>{
   const d=valDay(s,day),required=task.target?(Number(extra(s).targets?.[task.id])||task.target):0;
   if(required){
    let got=clamp(d.counts?.[task.id],0,99999);
    if(task.rolling)got+=clamp(valDay(s,offset(day,-1)).counts?.[task.id],0,99999);
    return got>=required;
   }
   return !!d.checks?.[task.id];
 };
 const completed=(s,day)=>knownTasks().filter(t=>isDone(s,day,t)).length;
 const activeDay=(s,day)=>completed(s,day)>0||duration(s,day)>0||logs(s).some(x=>x.day===day);
 const sum=(arr,fn)=>arr.reduce((a,x)=>a+fn(x),0);
 let tab='dashboard',weekCursor=0,focused=null,focusElapsed=0,focusSince=0,focusTicker=null;
 let reminderPending=false, chartPeriod=30, editingDay=null;
 function appendStyleSafe(){
   if(document.getElementById('goalsAdvancedStyles'))return;
 }
 function update(fn){if(!authorized()||!api()?.isOpen())return false;return api().saveExtras(fn)}
 function updateDay(day,fn){if(!authorized()||!api()?.isOpen())return false;return api().saveDay(day,fn)}
 function initialize(e){
   if(!e.settings)e.settings={};
   if(!e.targets)e.targets={};
   if(!e.names)e.names={};
   if(!e.goalProgress)e.goalProgress={};
   if(!e.plan)e.plan={};
   if(!Array.isArray(e.sessions))e.sessions=[];
   if(!Array.isArray(e.activities))e.activities=[];
   if(!Array.isArray(e.mocks))e.mocks=[];
   if(!Array.isArray(e.customGoals))e.customGoals=[];
   if(!e.customCompletion)e.customCompletion={};
   if(!e.reflections)e.reflections={};
 }
 function dateDiff(iso){
   const t=new Date(iso+'T12:00:00');if(!Number.isFinite(t.getTime()))return null;
   const diff=Math.ceil((t-new Date(localDate()+'T12:00:00'))/86400000);
   return diff;
 }
 function stats(s){
   const end=localDate(),days=Array.from({length:365},(_,i)=>offset(end,-364+i));
   const today=completed(s,end),yesterday=completed(s,offset(end,-1));
   let streak=0,day=activeDay(s,end)?end:offset(end,-1);
   while(activeDay(s,day)&&streak<365){streak++;day=offset(day,-1)}
   const covered=days.filter(d=>activeDay(s,d));
   const taskTotal=sum(days,d=>completed(s,d));
   const allMinutes=sum(sessions(s),x=>mins(x.minutes));
   const best=covered.map(d=>({day:d,score:completed(s,d)*15+duration(s,d),tasks:completed(s,d),minutes:duration(s,d)})).sort((a,b)=>b.score-a.score||b.day.localeCompare(a.day))[0];
   const longest=sessions(s).reduce((best,x)=>mins(x.minutes)>mins(best?.minutes)?x:best,null);
   const maxTime=days.map(d=>({day:d,minutes:duration(s,d)})).sort((a,b)=>b.minutes-a.minutes)[0];
   const cats=Object.fromEntries(SKILLS.map(k=>[k, sum(sessions(s).filter(x=>x.category===k),x=>mins(x.minutes))]));
   const thisWeek=Array.from({length:7},(_,i)=>offset(end,-6+i));
   const lastWeek=Array.from({length:7},(_,i)=>offset(end,-13+i));
   return {end,days,today,yesterday,streak,covered,taskTotal,allMinutes,best,longest,maxTime,cats,
    thisWeek,lastWeek,weekTasks:sum(thisWeek,d=>completed(s,d)),prevWeekTasks:sum(lastWeek,d=>completed(s,d)),
    weekMinutes:sum(thisWeek,d=>duration(s,d)),prevWeekMinutes:sum(lastWeek,d=>duration(s,d))};
 }
 function card(icon,label,value,sub){
   return '<article class="ga-card"><span class="ga-card-icon">'+icon+'</span><span class="ga-card-label">'+esc(label)+'</span><strong>'+esc(value)+'</strong><small>'+esc(sub||'')+'</small></article>';
 }
 function meta(s){
   const st=stats(s);
   const examDates={...DEFAULT_DATES,...extra(s).settings?.examDates};
   const countDown=Object.entries({ielts:'IELTS exam',sat:'SAT exam',turkish:'Turkish goal'}).map(([k,l])=>{
     const days=dateDiff(examDates[k]);return '<div class="ga-deadline"><div><b>'+l+'</b><small>'+esc(examDates[k])+'</small></div><strong>'+(
       days===null?'—':days<0?'Passed':days===0?'Today':days+' days')+'</strong></div>';
   }).join('');
   return '<section class="ga-panel"><h3>🗓 Smart Countdown</h3><div class="ga-deadlines">'+countDown+'</div></section>'+
   '<section class="ga-tiles">'+card('🔥','Study Streak',st.streak+' kun','Har kuni kamida 1 faoliyat')+
    card('⏱','Focused study',hh(st.allMinutes),'Taymer va sessiyalardan')+
    card('🌟','Best Study Day',st.best?fmt(st.best.day):'—',st.best?st.best.tasks+' tasks · '+hh(st.best.minutes):'Hali qayd yo‘q')+
    card('🏆','Personal Record',st.longest?hh(st.longest.minutes):'—','Eng uzun sessiya')+'</section>';
 }
 function heatmap(s){
   const st=stats(s),weekdays=['Du','Se','Ch','Pa','Ju','Sh','Ya'];
   const cells=st.days.map(d=>{
     const c=completed(s,d),m=duration(s,d),a=activeDay(s,d),lvl=!a?0:m>=180||c>=15?4:m>=90||c>=10?3:m>=30||c>=5?2:1;
     return '<span class="ga-heat ga-h'+lvl+'" title="'+d+' · '+c+' tasks · '+m+' min" aria-label="'+d+': '+c+' tasks '+m+' minutes"></span>';
   }).join('');
   return '<section class="ga-panel ga-heat-panel"><div class="ga-panel-head"><h3>🟩 365-Day Heatmap</h3><span>'+st.covered.length+' active days</span></div><div class="ga-heat-scroll"><div class="ga-heat-grid">'+cells+'</div></div><div class="ga-heat-legend">Less <i class="ga-h0"></i><i class="ga-h1"></i><i class="ga-h2"></i><i class="ga-h3"></i><i class="ga-h4"></i> More</div></section>';
 }
 function comparison(s){
   const st=stats(s),selectedDay=selected(),past=offset(selectedDay,-1);
   const a=completed(s,selectedDay),b=completed(s,past);
   const build=(label,left,right,unit)=>'<div class="ga-compare"><b>'+esc(label)+'</b><strong>'+left+' '+unit+'</strong><span>Previous: '+right+' '+unit+'</span><em>'+(left-right>0?'+':'')+(left-right)+'</em></div>';
   return '<section class="ga-panel"><div class="ga-panel-head"><h3>📊 Progress Comparison · Target vs Actual</h3><span>'+esc(selectedDay)+'</span></div><div class="ga-compare-grid">'+
    build('Daily checklist',a,b,'tasks')+
    build('7-day checklist',st.weekTasks,st.prevWeekTasks,'tasks')+
    build('7-day focus',st.weekMinutes,st.prevWeekMinutes,'min')+
    build('Day focus',duration(s,selectedDay),duration(s,past),'min')+
   '</div></section>';
 }
 function dashboard(s){
   const st=stats(s);
   const months=Object.keys(s.days||{}).length;
   return meta(s)+heatmap(s)+comparison(s)+
     '<section class="ga-panel"><h3>🎯 Progress Overview</h3><p class="ga-muted">'+st.taskTotal+' vazifa · '+st.covered.length+' faol kun · '+months+' kunlik qayd. Haftalik hisobot, skill statistikasi va Study Time Distribution Analytics tabida joylashgan.</p></section>';
 }
 function periodDays(last=7){const start=offset(selected(),weekCursor*7);return Array.from({length:last},(_,i)=>offset(start,i))}
 function planner(s){
   const day=selected(),items=planned(s)[day]||[];
   const todos=extra(s).customGoals||[];
   const options=SKILLS.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
   return '<section class="ga-panel"><div class="ga-panel-head"><h3>🗓 Smart Daily Planner</h3><small>Date: '+day+'</small></div>'+
     '<p class="ga-muted">Vaqt, yo‘nalish va vazifani kiriting. Vazifalarni vaqt bo‘yicha saralang yoki ↑ ↓ tugmalari bilan o‘zgartiring.</p>'+
     '<form id="gaPlanForm" class="ga-form"><label>Start<input type="time" name="start" value="09:00" required></label><label>Length (min)<input type="number" name="length" min="5" max="360" value="50" required></label>'+
     '<label>Skill<select name="category">'+options+'</select></label><label class="ga-grow">Task<input name="title" maxlength="100" placeholder="Masalan: Reading passage" required></label><button type="submit">+ Add</button></form>'+
     '<div class="ga-plan-list">'+(items.length?items.map((x,i)=>'<div class="ga-plan-task '+(x.done?'ga-done':'')+'"><input type="checkbox" data-ga-plan-done="'+esc(x.id)+'" '+(x.done?'checked':'')+'><div><b>'+esc(x.start)+' · '+esc(x.title)+'</b><small>'+esc(x.category)+' · '+clamp(x.length,0,360)+' min</small></div><button data-ga-shift="'+esc(x.id)+'" data-direction="-1" aria-label="Move up" '+(!i?'disabled':'')+'>↑</button><button data-ga-shift="'+esc(x.id)+'" data-direction="1" aria-label="Move down" '+(i===items.length-1?'disabled':'')+'>↓</button><button data-ga-plan-remove="'+esc(x.id)+'">×</button></div>').join(''):'<p class="ga-muted">Hali kunlik vazifa rejalashtirilmagan.</p>')+'</div></section>'+
     '<section class="ga-panel"><h3>📝 Editable Goals & Custom Goals</h3><p class="ga-muted">Asosiy Goals checklistidagi sonli maqsadlar va nomlarni sozlashingiz mumkin.</p>'+
     '<div class="ga-editable-list">'+knownTasks().filter(t=>t.target).map(t=>'<label><input type="text" maxlength="90" data-ga-goal-name="'+t.id+'" aria-label="Goal label" value="'+esc(extra(s).names?.[t.id]||t.name)+'"><input type="number" min="1" max="99999" data-ga-goal-target="'+t.id+'" aria-label="Daily target" value="'+(Number(extra(s).targets?.[t.id])||t.target)+'"></label>').join('')+'</div>'+
     '<form id="gaCustomGoal" class="ga-form"><label class="ga-grow">Custom daily goal<input name="title" maxlength="80" placeholder="Yangi vazifa" required></label><button type="submit">Add goal</button></form>'+
     '<div class="ga-custom-list">'+todos.map(t=>'<label><input type="checkbox" data-ga-custom-check="'+esc(t.id)+'" '+(extra(s).customCompletion?.[day]?.[t.id]?'checked':'')+'><span>'+esc(t.name)+'</span><button type="button" data-ga-custom-remove="'+esc(t.id)+'">×</button></label>').join('')+'</div></section>';
 }
 function focusClock(){
   const total=focusElapsed+(focused?Math.floor((Date.now()-focusSince)/1000):0);
   const m=Math.floor(total/60).toString().padStart(2,'0'),ss=(total%60).toString().padStart(2,'0');
   return m+':'+ss;
 }
 function focus(s){
   const day=selected(),list=sessions(s).filter(x=>x.day===day);
   const options=SKILLS.map(x=>'<option value="'+esc(x)+'">'+esc(x)+'</option>').join('');
   const total=duration(s,day),manual=clamp(valDay(s,day).hours,0,24)*60;
   return '<section class="ga-panel ga-focus"><h3>⏲ Focus Timer · Automatic Study Hours</h3>'+
     '<div class="ga-focus-clock" id="gaFocusClock">'+focusClock()+'</div>'+
     '<div class="ga-focus-controls"><label>Skill<select id="gaFocusCat">'+options+'</select></label><label>Rating (1–10)<input id="gaFocusRating" type="number" min="1" max="10" value="8"></label><button id="gaFocusStart">'+(focused?'Running…':'▶ Start')+'</button><button id="gaFocusPause">Ⅱ Pause</button><button id="gaFocusSave">✓ Save Session</button><button id="gaFocusReset" type="button">↻ Reset</button></div>'+
     '<p class="ga-muted">Taymer ishlayotganda vaqt avtomatik o‘lchanadi. “Save Session” bosilganda kunlik hisobotga qo‘shiladi. Brauzer yopilsa, saqlanmagan sessiya yo‘qolishi mumkin.</p>'+
     '<div class="ga-tiles">'+card('⏲','Timer logged',hh(total),'Tanlangan sana')+card('✍️','Manual hours',hh(Math.round(manual)),'Asosiy Goals trackeridan')+
      card('📌','Combined total',hh(Math.round(manual)+total),'Ikki hisob alohida kiritilgan')+'</div>'+
     '<form id="gaManualSession" class="ga-form"><label>Skill<select name="category">'+options+'</select></label><label>Minutes<input name="minutes" type="number" min="1" max="1440" value="30" required></label><label>Session rating (1–10)<input name="rating" type="number" min="1" max="10" value="8" required></label><button>Add manual session</button></form></section>'+
     '<section class="ga-panel"><h3>⭐ Study Session Rating · History</h3>'+
     (list.length?'<div class="ga-session-list">'+list.slice().reverse().map(x=>'<div><span>'+esc(x.category)+'<small>'+esc(x.source||'focus')+'</small></span><b>'+hh(mins(x.minutes))+'</b><em>'+esc(x.rating||'—')+'/10</em><button data-ga-session-remove="'+esc(x.id)+'">×</button></div>').join('')+'</div>':'<p class="ga-muted">Hali sessiya qayd qilinmagan.</p>')+'</section>';
 }
 function analytics(s){
   const st=stats(s);
   const max=Math.max(1,...Object.values(st.cats));
   const chart=SKILLS.map(k=>'<div class="ga-bar-row"><span>'+esc(k)+'</span><div><i style="width:'+Math.round(st.cats[k]/max*100)+'%"></i></div><b>'+hh(st.cats[k])+'</b></div>').join('');
   const weekdays=Array.from({length:7},(_,i)=>offset(localDate(),i-6));
   const best=st.best?fmt(st.best.day)+' · '+st.best.tasks+' tasks · '+hh(st.best.minutes):'Yozuv yo‘q';
   const weekly=weekdays.map(d=>'<div class="ga-week-day"><small>'+fmt(d)+'</small><b>'+completed(s,d)+'</b><span>'+hh(duration(s,d))+'</span></div>').join('');
   const firstOfMonth=localDate().slice(0,7)+'-01';
   const daysMonth=Array.from({length:31},(_,i)=>offset(firstOfMonth,i)).filter(d=>d.slice(0,7)===firstOfMonth.slice(0,7));
   const months=Array.from({length:6},(_,i)=>{
     const dt=new Date(localDate()+'T12:00:00');dt.setDate(1);dt.setMonth(dt.getMonth()-5+i);
     const prefix=localDate(dt).slice(0,7);
     const mDays=Object.keys(s.days||{}).filter(d=>d.startsWith(prefix));
     return {month:prefix,task:sum(mDays,d=>completed(s,d)),minutes:sum(sessions(s).filter(x=>x.day.startsWith(prefix)),x=>mins(x.minutes))};
   });
   const maxMonth=Math.max(1,...months.map(x=>x.task));
   const monthly=months.map(m=>'<div class="ga-month-col"><div><i style="height:'+Math.max(2,Math.round(m.task/maxMonth*100))+'%"></i></div><b>'+m.task+'</b><small>'+m.month.slice(5)+'</small></div>').join('');
   const scores=['Reading','Listening','Speaking','Writing'].map(skill=>{
     const doneCount=sum(st.thisWeek,d=> (api()?.getGroups()||[]).filter(g=>g.label===skill).flatMap(g=>g.tasks).filter(t=>isDone(s,d,t)).length);
     const time=st.cats[skill]||0;
     return {skill,weight:doneCount*15+time,doneCount,time};
   }).sort((a,b)=>a.weight-b.weight);
   const countPer=knownTasks().length*7;
   return '<section class="ga-panel"><h3>⌛ Study Time Distribution</h3><div class="ga-bars">'+chart+'</div></section>'+
     '<section class="ga-panel"><h3>🏆 Best Study Day · Personal Records</h3><div class="ga-tiles">'+card('🌟','Best day',st.best?st.best.day:'—',best)+
      card('⏳','Longest session',st.longest?hh(st.longest.minutes):'—',st.longest?.category||'')+
      card('📈','Most focused day',st.maxTime?.minutes?hh(st.maxTime.minutes):'—',st.maxTime?.minutes?st.maxTime.day:'')+'</div></section>'+
     '<section class="ga-panel"><h3>📆 Weekly Report</h3><div class="ga-week-grid">'+weekly+'</div><p class="ga-muted">Oxirgi 7 kun: '+st.weekTasks+' / '+countPer+' checklist va '+hh(st.weekMinutes)+' taymer va sessiya vaqti.</p></section>'+
     '<section class="ga-panel"><h3>📈 Monthly Analytics</h3><div class="ga-month-chart">'+monthly+'</div><p class="ga-muted">Ustunlarda har oydagi bajarilgan asosiy vazifalar soni ko‘rsatilgan.</p></section>'+
     '<section class="ga-panel"><h3>🔎 Weak Skill Detector</h3><p class="ga-muted">Oxirgi 7 kunlik checklist va qayd etilgan fokus vaqtiga asoslangan baho (IELTS band score emas).</p><div class="ga-skill-rows">'+scores.map((x,i)=>'<div><b>'+esc(x.skill)+'</b><span>'+x.doneCount+' completed · '+hh(x.time)+'</span>'+(i===0?'<em>Needs attention</em>':'')+'</div>').join('')+'</div></section>';
 }
 function inputField(label,name,kind='text',placeholder='',value='',opts=''){
   return '<label>'+label+'<input name="'+name+'" type="'+kind+'" placeholder="'+esc(placeholder)+'" value="'+esc(value)+'" '+opts+'></label>';
 }
 function exams(s){
   const e=extra(s),activities=logs(s).filter(a=>a.type!=='mock').slice().reverse().slice(0,35);
   const mocks=(e.mocks||[]).slice().reverse().slice(0,30);
   const fields=SKILLS.slice(0,5).map(k=>'<option value="'+k+'">'+k+'</option>').join('');
   return '<section class="ga-panel"><h3>📚 IELTS / SAT Practice Log</h3>'+
    '<p class="ga-muted">Reading passage, article, listening, speaking va writing natijalarini kiriting. Integratsiyalangan mashqlar tugaganda ayrimlari avtomatik yoziladi; avtomatik qayd bilan qo‘lda kiritilgan qayd alohida ko‘rsatiladi.</p>'+
    '<form id="gaPracticeForm" class="ga-form">'+
     '<label>Activity<select name="type"><option value="reading">Reading passage</option><option value="article">Article</option><option value="listening">Listening</option><option value="speaking">Speaking</option><option value="writing">Writing essay</option><option value="sat">SAT questions</option></select></label>'+
     inputField('Title / topic','title','text','Passage 1 / Essay topic','', 'maxlength="100" required')+
     inputField('Correct / score','score','number','0','', 'min="0" max="999"')+
     inputField('Total questions','total','number','40','', 'min="0" max="999"')+
     inputField('Band / score','band','text','7.0','', 'maxlength="20"')+
     '<button type="submit">Log activity</button></form>'+
    '<div class="ga-log-list">'+(activities.length?activities.map(a=>'<div><div><b>'+esc(a.title||a.type)+'</b><small>'+esc(a.day)+' · '+esc(a.type)+' · '+esc(a.source||'manual')+'</small></div><span>'+esc(a.band||((a.score!==undefined&&a.score!=='')?a.score+'/'+(a.total||'—'):'✓'))+'</span><button data-ga-activity-remove="'+esc(a.id)+'">×</button></div>').join(''):'<p class="ga-muted">Faoliyat tarixi bo‘sh.</p>')+'</div></section>'+
    '<section class="ga-panel"><h3>🏅 IELTS Band Tracker · Mock Exam History</h3>'+
     '<form id="gaMockForm" class="ga-form">'+
       '<label>Skill<select name="category">'+fields+'</select></label>'+
       inputField('Band / SAT score','band','text','7.0','', 'maxlength="16" required')+
       inputField('Test title','title','text','Mock test','', 'maxlength="100" required')+
       '<button type="submit">Save mock</button></form>'+
     '<div class="ga-log-list">'+(mocks.length?mocks.map(m=>'<div><div><b>'+esc(m.category)+' · '+esc(m.title)+'</b><small>'+esc(m.day)+'</small></div><strong>'+esc(m.band)+'</strong><button data-ga-mock-remove="'+esc(m.id)+'">×</button></div>').join(''):'<p class="ga-muted">Mock test natijalari kiritilmagan.</p>')+'</div></section>'+
     '<section class="ga-panel"><h3>🎯 Goal Milestones · 25–100%</h3><div class="ga-milestone-progress">'+
      [['ielts','IELTS exam'],['sat','SAT exam'],['turkish','Turkish goal']].map(([k,l])=>{
       const n=clamp(e.goalProgress?.[k],0,100);
       return '<label>'+l+'<input type="range" min="0" max="100" step="25" value="'+n+'" data-ga-milestone-progress="'+k+'"><strong>'+n+'%</strong></label>';
      }).join('')+'</div></section>';
 }
 function settings(s){
   const e=extra(s),settings=e.settings||{},dates={...DEFAULT_DATES,...(settings.examDates||{})};
   const reflection=e.reflections?.[selected()]||{};
   return '<section class="ga-panel"><h3>🗓 Editable exam deadlines</h3><form id="gaExamForm" class="ga-form">'+
     inputField('IELTS exam','ielts','date','',''+dates.ielts, 'required')+
     inputField('SAT exam','sat','date','',''+dates.sat,'required')+
     inputField('Turkish goal','turkish','date','',''+dates.turkish,'required')+
     '<button type="submit">Save dates</button></form></section>'+
    '<section class="ga-panel"><h3>🧭 Daily Reflection · 3 savol</h3><p class="ga-muted">Sana: '+selected()+'</p>'+
      '<form id="gaReflectionForm" class="ga-reflection">'+
      '<label>1. Bugun nima o‘rgandim?<textarea name="learned" maxlength="1600" rows="3">'+esc(reflection.learned||'')+'</textarea></label>'+
      '<label>2. Eng qiyin qismi nima bo‘ldi?<textarea name="hard" maxlength="1600" rows="3">'+esc(reflection.hard||'')+'</textarea></label>'+
      '<label>3. Ertaga nimani yaxshilayman?<textarea name="improve" maxlength="1600" rows="3">'+esc(reflection.improve||'')+'</textarea></label>'+
      '<button type="submit">Save reflection</button></form></section>'+
    '<section class="ga-panel"><h3>📁 Export & Backup</h3><p class="ga-muted">JSON: barcha shaxsiy Goals ma’lumotlari. CSV: activity va session loglari (Excel’da ochiladi). PDF: brauzeringizdan Print → Save as PDF.</p>'+
      '<div class="ga-export-actions"><button data-ga-export="json">↓ JSON Backup</button><button data-ga-export="csv">↓ Excel-compatible CSV</button><button data-ga-export="print">🖨 Print / Save as PDF</button></div></section>';
 }
 function putUI(){
   const root=document.getElementById('vividGoalsPage'),s=current();
   if(!root||!s||!authorized())return;
   appendStyleSafe();
   root.dataset.gaTab=tab;
   const area=document.createElement('section');
   area.className='ga-enhanced';
   area.innerHTML='<nav class="ga-tabbar" aria-label="Goals features">'+TABS.map(([k,l])=>'<button type="button" class="'+(tab===k?'active':'')+'" data-ga-tab="'+k+'">'+l+'</button>').join('')+'</nav>'+
    '<section class="ga-screen" '+(tab!=='dashboard'?'hidden':'')+'>'+dashboard(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='planner'?'hidden':'')+'>'+planner(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='focus'?'hidden':'')+'>'+focus(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='analytics'?'hidden':'')+'>'+analytics(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='ielts'?'hidden':'')+'>'+exams(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='settings'?'hidden':'')+'>'+settings(s)+'</section>';
   root.querySelector('.goals-summary')?.after(area);
   if(tab==='focus'&&focused){const cat=document.getElementById('gaFocusCat');if(cat)cat.value=focused.category;}
   ingestPending();
 }
 function saveSession(cat,seconds,rating,source){
   const measured=mins(Math.round(seconds/60));
   if(measured<1){window.alert('Saqlash uchun kamida 1 daqiqa ishlang.');return false;}
   return update(e=>{initialize(e);e.sessions.push({id:id(),day:localDate(),category:cat,minutes:measured,rating,source,at:new Date().toISOString()})});
 }
 function focusPause(){if(!focused)return;focusElapsed+=Math.floor((Date.now()-focusSince)/1000);focused=null;syncClock()}
 function syncClock(){const x=document.getElementById('gaFocusClock');if(x)x.textContent=focusClock();}
 function resetFocus(){focused=null;focusElapsed=0;focusSince=0;syncClock();}
 function download(filename,type,body){
   const blob=new Blob([body],{type}),url=URL.createObjectURL(blob),a=document.createElement('a');
   a.href=url;a.download=filename;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),15000);
 }
 function csv(s){
   const rows=[['type','day','category','title','minutes','rating','score','total','band','source']];
   for(const x of sessions(s))rows.push(['session',x.day,x.category,'',x.minutes,x.rating,'','','',x.source||'focus']);
   for(const x of logs(s))rows.push(['activity',x.day,x.category||LABELS[x.type]||x.type,x.title,'','',x.score??'',x.total??'',x.band||'',x.source||'manual']);
   for(const x of extra(s).mocks||[])rows.push(['mock',x.day,x.category,x.title,'','','','',x.band||'','manual']);
   return '\uFEFF'+rows.map(r=>r.map(x=>'"'+String(x??'').replace(/"/g,'""')+'"').join(',')).join('\r\n');
 }
 function onClick(e){
   if(!authorized()||!api()?.isOpen())return;
   const root=e.target.closest('#vividGoalsPage');if(!root)return;
   let el=e.target.closest('[data-ga-tab]');if(el){tab=el.dataset.gaTab;api().refresh();return;}
   const today=selected();
   if((el=e.target.closest('[data-ga-plan-remove]'))){
     update(ex=>{initialize(ex);ex.plan[today]=(ex.plan[today]||[]).filter(x=>x.id!==el.dataset.gaPlanRemove)});return;
   }
   if((el=e.target.closest('[data-ga-shift]'))){
     update(ex=>{initialize(ex);const arr=ex.plan[today]||[],i=arr.findIndex(x=>x.id===el.dataset.gaShift),j=i+Number(el.dataset.direction);
       if(i>=0&&j>=0&&j<arr.length)[arr[i],arr[j]]=[arr[j],arr[i]];});return;
   }
   if((el=e.target.closest('[data-ga-custom-remove]'))){update(ex=>{initialize(ex);ex.customGoals=ex.customGoals.filter(x=>x.id!==el.dataset.gaCustomRemove)});return;}
   if((el=e.target.closest('[data-ga-session-remove]'))){update(ex=>{initialize(ex);ex.sessions=ex.sessions.filter(x=>x.id!==el.dataset.gaSessionRemove)});return;}
   if((el=e.target.closest('[data-ga-activity-remove]'))){update(ex=>{initialize(ex);ex.activities=ex.activities.filter(x=>x.id!==el.dataset.gaActivityRemove)});return;}
   if((el=e.target.closest('[data-ga-mock-remove]'))){update(ex=>{initialize(ex);ex.mocks=ex.mocks.filter(x=>x.id!==el.dataset.gaMockRemove)});return;}
   if(e.target.id==='gaFocusStart'){
     if(!focused){focused={category:document.getElementById('gaFocusCat')?.value||'Reading'};focusSince=Date.now();}
     syncClock();return;
   }
   if(e.target.id==='gaFocusPause'){focusPause();return;}
   if(e.target.id==='gaFocusReset'){resetFocus();return;}
   if(e.target.id==='gaFocusSave'){
     const cat=focused?.category||document.getElementById('gaFocusCat')?.value||'Reading';
     const total=focusElapsed+(focused?Math.floor((Date.now()-focusSince)/1000):0);
     if(saveSession(cat,total,Math.round(clamp(document.getElementById('gaFocusRating')?.value,1,10)),'focus'))resetFocus();return;
   }
   if((el=e.target.closest('[data-ga-export]'))){
     const s=current(),choice=el.dataset.gaExport;if(!s)return;
     if(choice==='json')download('vivid-goals-'+localDate()+'.json','application/json',JSON.stringify({app:'VIVID IELTS Goals',version:2,exportedAt:new Date().toISOString(),data:s},null,2));
     if(choice==='csv')download('vivid-goals-'+localDate()+'.csv','text/csv;charset=utf-8',csv(s));
     if(choice==='print')window.print();
   }
 }
 function onChange(e){
   if(!authorized()||!api()?.isOpen()||!e.target.closest('#vividGoalsPage'))return;
   const el=e.target,day=selected();
   if(el.hasAttribute('data-ga-goal-name')){
     update(x=>{initialize(x);x.names[el.dataset.gaGoalName]=String(el.value||'').trim().slice(0,90)});return;
   }
   if(el.hasAttribute('data-ga-goal-target')){
     update(x=>{initialize(x);x.targets[el.dataset.gaGoalTarget]=Math.round(clamp(el.value,1,99999))});return;
   }
   if(el.hasAttribute('data-ga-plan-done')){
     update(x=>{initialize(x);const item=(x.plan[day]||[]).find(t=>t.id===el.dataset.gaPlanDone);if(item)item.done=el.checked});return;
   }
   if(el.hasAttribute('data-ga-custom-check')){
     update(x=>{initialize(x);x.customCompletion[day]??={};x.customCompletion[day][el.dataset.gaCustomCheck]=el.checked});return;
   }
   if(el.hasAttribute('data-ga-milestone-progress')){
     update(x=>{initialize(x);x.goalProgress[el.dataset.gaMilestoneProgress]=Number(el.value)});return;
   }
 }
 function onSubmit(e){
   if(!authorized()||!api()?.isOpen()||!e.target.closest('#vividGoalsPage'))return;
   const form=e.target,day=selected(),d=Object.fromEntries(new FormData(form).entries());
   if(!/^ga/.test(form.id))return;
   e.preventDefault();
   if(form.id==='gaPlanForm'){
     const name=String(d.title||'').trim();if(!name)return;
     update(x=>{initialize(x);(x.plan[day]??=[]).push({id:id(),title:name.slice(0,100),category:SKILLS.includes(d.category)?d.category:'Reading',
       start:/^\d\d:\d\d$/.test(d.start)?d.start:'09:00',length:clamp(d.length,5,360),done:false});});
   }else if(form.id==='gaCustomGoal'){
     const name=String(d.title||'').trim();if(!name)return;
     update(x=>{initialize(x);x.customGoals.push({id:id(),name:name.slice(0,80)})});
   }else if(form.id==='gaManualSession'){
     const n=clamp(d.minutes,1,1440);if(!n)return;
     update(x=>{initialize(x);x.sessions.push({id:id(),day,category:SKILLS.includes(d.category)?d.category:'Reading',minutes:mins(n),rating:Math.round(clamp(d.rating,1,10)),source:'manual',at:new Date().toISOString()})});
   }else if(form.id==='gaExamForm'){
     update(x=>{initialize(x);x.settings.examDates={ielts:String(d.ielts),sat:String(d.sat),turkish:String(d.turkish)}});
   }else if(form.id==='gaReflectionForm'){
     update(x=>{initialize(x);x.reflections[day]={learned:String(d.learned||'').slice(0,1600),hard:String(d.hard||'').slice(0,1600),improve:String(d.improve||'').slice(0,1600)}});
   }else if(form.id==='gaPracticeForm'){
     const type=String(d.type);
     if(!['reading','article','listening','speaking','writing','sat'].includes(type))return;
     update(x=>{initialize(x);x.activities.push({id:id(),day,type,category:LABELS[type]||'SAT',title:String(d.title).slice(0,100),
       score:d.score===''?'':clamp(d.score,0,999),total:d.total===''?'':clamp(d.total,0,999),band:String(d.band||'').slice(0,20),source:'manual'})});
   }else if(form.id==='gaMockForm'){
     update(x=>{initialize(x);x.mocks.push({id:id(),day,category:SKILLS.includes(d.category)?d.category:'Reading',title:String(d.title).slice(0,100),band:String(d.band).slice(0,16)})});
   }
 }
 function pendingKey(uid){return 'vivid:goals:verified-activity:'+uid}
 function pendingRead(uid){try{const data=JSON.parse(localStorage.getItem(pendingKey(uid))||'[]');return Array.isArray(data)?data:[]}catch{return []}}
 function queueAuto(ev){
   if(!authorized())return;
   const raw=ev?.detail||{},type=String(raw.type||'').toLowerCase();
   if(!EVENT_TYPES.has(type))return;
   const uid=window.VocabCloud?.userId;if(!uid)return;
   const item={id:id(),day:localDate(),type,category:LABELS[type]||type,title:String(raw.title||type).slice(0,100),
     band:raw.band===undefined?'':String(raw.band).slice(0,20),score:raw.score===undefined?'':clamp(raw.score,0,999),
     total:raw.total===undefined?'':clamp(raw.total,0,999),source:'automatic'};
   const old=pendingRead(uid);
   if(old.length>=200)old.shift();
   old.push(item);
   try{localStorage.setItem(pendingKey(uid),JSON.stringify(old))}catch{}
   ingestPending();
 }
 function ingestPending(){
   if(!authorized()||!api()?.isOpen()||reminderPending)return;
   const uid=window.VocabCloud.userId,items=pendingRead(uid);
   if(!items.length)return;
   reminderPending=true;
   // Clear only after a successful local+cloud queued state update, which is cached by VividGoals.
   const ok=update((ex,root)=>{
     initialize(ex);
     const seen=new Set(ex.activities.map(x=>x.id));
     const recorded=new Set((ex.mocks||[]).map(x=>x.autoId).filter(Boolean));
     for(const item of items){
       if(seen.has(item.id))continue;
       seen.add(item.id);ex.activities.push(item);
       if(['reading','article','writing','speaking'].includes(item.type)){
         const d=root.days[item.day]??={checks:{},counts:{},hours:'',note:'',updatedAt:''};
         d.checks??={};
         const key={reading:'read_passage',article:'read_article',writing:'essay',speaking:'speaking_mock'}[item.type];
         if(key)d.checks[key]=true;
         d.updatedAt=new Date().toISOString();
       }
       if(item.type==='writing'&&item.band&&!recorded.has(item.id)){
         ex.mocks.push({id:id(),autoId:item.id,day:item.day,category:'Writing',title:item.title,band:item.band,source:'automatic'});
         recorded.add(item.id);
       }
     }
     if(ex.activities.length>2000)ex.activities.splice(0,ex.activities.length-2000);
     if(ex.mocks.length>500)ex.mocks.splice(0,ex.mocks.length-500);
   });
   if(ok)try{localStorage.removeItem(pendingKey(uid))}catch{}
   reminderPending=false;
 }
 document.addEventListener('vivid-goals:rendered',putUI);
 document.addEventListener('vivid:study-complete',queueAuto);
 document.addEventListener('click',onClick);
 document.addEventListener('change',onChange);
 document.addEventListener('submit',onSubmit);
 focusTicker=setInterval(syncClock,1000);
 window.VividGoalsAdvanced={version:'g2',selectedFeatures:23};
})();