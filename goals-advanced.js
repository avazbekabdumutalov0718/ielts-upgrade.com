(() => {
 'use strict';
 /* Advanced Goals adds a private dashboard to the existing VividGoals tracker.
    It never runs as a public user and delegates account persistence to Goals + Supabase RLS. */
 const OWNER='fenric18@gmail.com', START='2026-10-15', EVENT_TYPES=new Set(['reading','article','listening','speaking','writing','mock']);
 const SKILLS=['Reading','Listening','Speaking','Writing','SAT','General English','Turkish'];
 const LABELS={reading:'Reading',article:'Reading',listening:'Listening',speaking:'Speaking',writing:'Writing',mock:'Mock'};
 const TABS=[['dashboard','Overview'],['planner','Planner'],['focus','Focus'],['analytics','Progress'],['ielts','IELTS'],['sat','SAT'],['settings','Settings & Export']];
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
 const selected=()=>api()?.getDay()||(localDate()<START?START:localDate());
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
    return Object.prototype.hasOwnProperty.call(d.checks||{},task.id)?!!d.checks[task.id]:got>=required;
   }
   return !!d.checks?.[task.id];
 };
 const completed=(s,day)=>knownTasks().filter(t=>isDone(s,day,t)).length;
 const activeDay=(s,day)=>day>=START&&(completed(s,day)>0||duration(s,day)>0||logs(s).some(x=>x.day===day));
 const sum=(arr,fn)=>arr.reduce((a,x)=>a+fn(x),0);
 let tab='dashboard',weekCursor=0,focused=null,focusCategory='Reading',manualCategory='Reading',focusPrefsLoaded=false,focusElapsed=0,focusSince=0,focusTicker=null;
 let reminderPending=false, chartPeriod=30, editingDay=null, periodMode='week', periodAnchor=(localDate()<START?START:localDate());
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
 // Countdowns are anchored to Uzbekistan Standard Time (+05:00), not the browser's timezone.
 // If no exam start hour is supplied, 00:00 on the selected date is the explicit default.
 function clockTarget(date,time='00:00'){
   const d=String(date||''),t=String(time||'00:00');
   if(!/^\d{4}-\d{2}-\d{2}$/.test(d)||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t))return NaN;
   const utc=Date.parse(d+'T'+t+':00+05:00');
   return Number.isFinite(utc)?utc:NaN;
 }
 function clockParts(target,now=Date.now()){
   if(!Number.isFinite(target))return null;
   const seconds=Math.max(0,Math.ceil((target-now)/1000));
   return [Math.floor(seconds/86400),Math.floor(seconds%86400/3600),Math.floor(seconds%3600/60),seconds%60];
 }
 function clockHtml(parts){
   if(!parts)return '<span class="ga-clock-error">Sanani tekshiring</span>';
   return '<span class="ga-clock-parts">'+parts.map((v,i)=>
     '<span class="ga-clock-unit"><b>'+String(v).padStart(2,'0')+'</b><small>'+['kun','soat','daqiqa','soniya'][i]+'</small></span>'
   ).join('')+'</span>';
 }
 function clockNode(date,time){
   return '<span class="ga-live-countdown" data-goals-date="'+esc(date)+'" data-goals-time="'+esc(time)+'" aria-label="Teskari sanoq: kun soat daqiqa soniya">'+
     clockHtml(clockParts(clockTarget(date,time)))+'</span>';
 }
 function updateCountdowns(){
   if(!authorized()||!api()?.isOpen())return;
   const root=document.getElementById('vividGoalsPage');
   if(!root)return;
   const now=Date.now();
   root.querySelectorAll('.ga-live-countdown[data-goals-date]').forEach(node=>{
      const date=node.dataset.goalsDate,time=node.dataset.goalsTime;
      const parts=clockParts(clockTarget(date,time),now);
      const signature=parts?.join(':')||'invalid';
      if(node.dataset.lastCountdown!==signature){
        node.dataset.lastCountdown=signature;
        node.innerHTML=clockHtml(parts);
      }
   });
 }
 function stats(s){
   const real=localDate(),end=real>=START?real:START;
   const dayCount=real<START?0:Math.min(2000,Math.round((new Date(real+'T12:00:00')-new Date(START+'T12:00:00'))/86400000)+1);
   const days=Array.from({length:dayCount},(_,i)=>offset(START,i));
   const today=real>=START?completed(s,real):0,yesterday=real>START?completed(s,offset(real,-1)):0;
   let streak=0,day=activeDay(s,real)?real:offset(real,-1);
   while(day>=START&&activeDay(s,day)&&streak<dayCount){streak++;day=offset(day,-1)}
   const covered=days.filter(d=>activeDay(s,d));
   const taskTotal=sum(days,d=>completed(s,d));
   const allMinutes=sum(sessions(s).filter(x=>x.day>=START),x=>mins(x.minutes));
   const best=covered.map(d=>({day:d,score:completed(s,d)*15+duration(s,d),tasks:completed(s,d),minutes:duration(s,d)})).sort((a,b)=>b.score-a.score||b.day.localeCompare(a.day))[0];
   const longest=sessions(s).filter(x=>x.day>=START).reduce((best,x)=>mins(x.minutes)>mins(best?.minutes)?x:best,null);
   const maxTime=days.map(d=>({day:d,minutes:duration(s,d)})).sort((a,b)=>b.minutes-a.minutes)[0];
   const cats=Object.fromEntries(SKILLS.map(k=>[k,sum(sessions(s).filter(x=>x.day>=START&&x.category===k),x=>mins(x.minutes))]));
   const thisWeek=Array.from({length:7},(_,i)=>offset(end,-6+i)).filter(d=>d>=START&&d<=real);
   const lastWeek=Array.from({length:7},(_,i)=>offset(end,-13+i)).filter(d=>d>=START&&d<=real);
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
   const examTimes=extra(s).settings?.examTimes||{};
   const countDown=Object.entries({ielts:'IELTS exam',sat:'SAT exam',turkish:'Turkish goal'}).map(([k,l])=>{
     const date=examDates[k],time=examTimes[k]||'00:00';
     return '<div class="ga-deadline"><div class="ga-deadline-label"><b>'+l+'</b><small>'+esc(date)+' · '+esc(time)+' (Toshkent UTC+5)</small></div>'+clockNode(date,time)+'</div>';
   }).join('');
   return '<section class="ga-panel"><h3>🗓 Smart Countdown</h3><div class="ga-deadlines">'+countDown+'</div></section>'+
   '<section class="ga-tiles">'+card('🔥','Study Streak',st.streak+' kun','Har kuni kamida 1 faoliyat')+
    card('⏱','Focused study',hh(st.allMinutes),'Taymer va sessiyalardan')+
    card('🌟','Best Study Day',st.best?fmt(st.best.day):'—',st.best?st.best.tasks+' tasks · '+hh(st.best.minutes):'Hali qayd yo‘q')+
    card('🏆','Personal Record',st.longest?hh(st.longest.minutes):'—','Eng uzun sessiya')+'</section>';
 }
 function heatmap(s){
   const st=stats(s);
   const cells=st.days.map(d=>{
     const c=completed(s,d),m=duration(s,d),a=activeDay(s,d),lvl=!a?0:m>=180||c>=15?4:m>=90||c>=10?3:m>=30||c>=5?2:1;
     return '<span class="ga-heat ga-h'+lvl+'" title="'+d+' · '+c+' tasks · '+m+' min" aria-label="'+d+': '+c+' tasks '+m+' minutes"></span>';
   }).join('');
   return '<section class="ga-panel ga-heat-panel"><div class="ga-panel-head"><h3>📅 15-oktabrdan boshlab faoliyat</h3><span>'+st.covered.length+' faol kun · '+st.days.length+' kun kuzatildi</span></div>'+
   (st.days.length?'<div class="ga-heat-scroll"><div class="ga-heat-grid">'+cells+'</div></div><div class="ga-heat-legend">Kam <i class="ga-h0"></i><i class="ga-h1"></i><i class="ga-h2"></i><i class="ga-h3"></i><i class="ga-h4"></i> Ko‘p</div>':
    '<p class="ga-muted">Tracker 2026-yil 15-oktabrda boshlanadi. Shu sanadan keyingi barcha kunlar saqlanib boradi.</p>')+'</section>';
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
     '<div class="ga-plan-list">'+(items.length?items.map((x,i)=>'<div data-plan-id="'+esc(x.id)+'" class="ga-plan-task '+(x.done?'ga-done':'')+'"><input type="checkbox" data-ga-plan-done="'+esc(x.id)+'" '+(x.done?'checked':'')+'><div><b>'+esc(x.start)+' · '+esc(x.title)+'</b><small>'+esc(x.category)+' · '+clamp(x.length,0,360)+' min</small></div><button data-ga-shift="'+esc(x.id)+'" data-direction="-1" aria-label="Move up" '+(!i?'disabled':'')+'>↑</button><button data-ga-shift="'+esc(x.id)+'" data-direction="1" aria-label="Move down" '+(i===items.length-1?'disabled':'')+'>↓</button><button data-ga-plan-remove="'+esc(x.id)+'">×</button></div>').join(''):'<p class="ga-muted">Hali kunlik vazifa rejalashtirilmagan.</p>')+'</div></section>'+
     '<section class="ga-panel"><h3>📝 Editable Goals & Custom Goals</h3><p class="ga-muted">Asosiy Goals checklistidagi sonli maqsadlar va nomlarni sozlashingiz mumkin.</p>'+
     '<div class="ga-editable-list">'+knownTasks().filter(t=>t.target).map(t=>'<label><input type="text" maxlength="90" data-ga-goal-name="'+t.id+'" aria-label="Goal label" value="'+esc(extra(s).names?.[t.id]||t.name)+'"><input type="number" min="1" max="99999" data-ga-goal-target="'+t.id+'" aria-label="Daily target" value="'+(Number(extra(s).targets?.[t.id])||t.target)+'"></label>').join('')+'</div>'+
     '<form id="gaCustomGoal" class="ga-form"><label class="ga-grow">Custom daily goal<input name="title" maxlength="80" placeholder="Yangi vazifa" required></label><button type="submit">Add goal</button></form>'+
     '<div class="ga-custom-list">'+todos.map(t=>'<label data-custom-id="'+esc(t.id)+'"><input type="checkbox" data-ga-custom-check="'+esc(t.id)+'" '+(extra(s).customCompletion?.[day]?.[t.id]?'checked':'')+'><span>'+esc(t.name)+'</span><button type="button" data-ga-custom-remove="'+esc(t.id)+'">×</button></label>').join('')+'</div></section>';
 }
 function focusClock(){
   const total=focusElapsed+(focused?Math.floor((Date.now()-focusSince)/1000):0);
   const m=Math.floor(total/60).toString().padStart(2,'0'),ss=(total%60).toString().padStart(2,'0');
   return m+':'+ss;
 }
 function focus(s){
   const day=selected(),list=sessions(s).filter(x=>x.day===day);
   const total=duration(s,day),manual=clamp(valDay(s,day).hours,0,24)*60;
   const pills=(kind,selectedSkill)=>'<div class="ga-skill-pill-list" role="group" aria-label="'+(kind==='focus'?'Focus skill':'Manual session skill')+'">'+
     SKILLS.map(x=>'<button type="button" class="ga-skill-pill '+(selectedSkill===x?'selected':'')+'" data-ga-'+kind+'-skill="'+esc(x)+'" aria-pressed="'+(selectedSkill===x?'true':'false')+'">'+esc(x)+'</button>').join('')+'</div>';
   return '<section class="ga-panel ga-focus"><h3>⏲ Focus Timer · Automatic Study Hours</h3>'+
     '<div class="ga-focus-clock" id="gaFocusClock">'+focusClock()+'</div>'+
     '<div class="ga-focus-skill-selector"><b>🎯 Taymer uchun skillni tanlang</b><p class="ga-muted">Reading, Listening, Speaking, Writing, SAT va boshqa yo‘nalishlardan birini tanlang.</p>'+
     pills('focus',focused?.category||focusCategory)+'<input type="hidden" id="gaFocusCat" value="'+esc(focused?.category||focusCategory)+'"></div>'+
     '<div class="ga-focus-controls"><label>Rating (1–10)<input id="gaFocusRating" type="number" min="1" max="10" value="8"></label><button type="button" id="gaFocusStart">'+(focused?'● Running':'▶ Start')+'</button><button type="button" id="gaFocusPause">Ⅱ Pause</button><button type="button" id="gaFocusSave">✓ Save Session</button><button type="button" id="gaFocusReset">↻ Reset</button></div>'+
     '<p class="ga-muted">Skillni Start bosishdan oldin tanlang. Boshlangan sessiya tugamaguncha skill o‘zgarmaydi; Pause → Save Session yoki Reset qilib keyingi skillga o‘ting. Vaqt tanlangan kunga ('+esc(day)+') saqlanadi.</p>'+
     '<div class="ga-tiles">'+card('⏲','Timer logged',hh(total),'Tanlangan sana')+card('✍️','Manual hours',hh(Math.round(manual)),'Asosiy Goals trackeridan')+
      card('📌','Combined total',hh(Math.round(manual)+total),'Ikki hisob alohida kiritilgan')+'</div>'+
     '<form id="gaManualSession" class="ga-manual-form">'+
      '<div class="ga-focus-skill-selector"><b>✍️ Qo‘lda kiritish uchun skill</b>'+pills('manual',manualCategory)+
      '<input type="hidden" name="category" id="gaManualCategory" value="'+esc(manualCategory)+'"></div>'+
      '<div class="ga-form ga-manual-fields"><label>Minutes<input name="minutes" type="number" min="1" max="1440" value="30" required></label>'+
      '<label>Session rating (1–10)<input name="rating" type="number" min="1" max="10" value="8" required></label>'+
      '<button type="submit">+ Add manual session</button></div></form></section>'+
     '<section class="ga-panel"><h3>⭐ Study Session Rating · History</h3>'+
     (list.length?'<div class="ga-session-list">'+list.slice().reverse().map(x=>'<div data-session-id="'+esc(x.id)+'"><span>'+esc(x.category)+'<small>'+esc(x.source||'focus')+'</small></span><b>'+hh(mins(x.minutes))+'</b><em>'+esc(x.rating||'—')+'/10</em><button type="button" data-ga-session-remove="'+esc(x.id)+'">×</button></div>').join('')+'</div>':'<p class="ga-muted">Hali sessiya qayd qilinmagan.</p>')+'</section>';
 }
 function analytics(s){
   const st=stats(s),today=localDate(),last=st.days[st.days.length-1]||START;
   const anchor=(periodAnchor<START||periodAnchor>today)?last:periodAnchor;
   const date=new Date(anchor+'T12:00:00');
   const monday=offset(anchor,-((date.getDay()+6)%7));
   const first=anchor.slice(0,7)+'-01';
   const periodStart=periodMode==='all'?START:periodMode==='month'?first:monday;
   const periodEnd=periodMode==='all'?last:periodMode==='month'?offset(first,32).slice(0,7)+'-01':offset(monday,6);
   const monthEnd=periodMode==='month'?offset(periodEnd,-1):periodEnd;
   const start=periodStart<START?START:periodStart;
   const end=monthEnd>last?last:monthEnd;
   const range=st.days.filter(d=>d>=start&&d<=end);
   const doneTotal=sum(range,d=>completed(s,d));
   const minutesTotal=sum(range,d=>duration(s,d)),manualHours=sum(range,d=>clamp(valDay(s,d).hours,0,24)),activeCount=range.filter(d=>activeDay(s,d)).length;
   const percentage=range.length?Math.round(doneTotal/(range.length*Math.max(1,knownTasks().length))*100):0;
   const options=SKILLS.map(k=>({key:k,m:sum(sessions(s).filter(x=>range.includes(x.day)&&x.category===k),x=>mins(x.minutes))}));
   const max=Math.max(1,...options.map(x=>x.m));
   const bars=options.map(x=>'<div class="ga-bar-row"><span>'+esc(x.key)+'</span><div><i style="width:'+Math.round(x.m/max*100)+'%"></i></div><b>'+hh(x.m)+'</b></div>').join('');
   const daysTable=range.slice().reverse().map(d=>'<div class="gp-day-row"><span><b>'+d+'</b><small>'+['Sun','Mon','Tue','Wed','Thu','Fri','Sat'][new Date(d+'T12:00:00').getDay()]+'</small></span><strong>'+completed(s,d)+' / '+knownTasks().length+'</strong><span>'+hh(duration(s,d))+'</span><span>'+logs(s).filter(x=>x.day===d).length+' practice</span></div>').join('');
   const monthKeys=[...new Set(st.days.map(d=>d.slice(0,7)))];
   const monthRows=monthKeys.map(key=>{
      const dates=st.days.filter(d=>d.startsWith(key)),total=sum(dates,d=>completed(s,d));
      return '<button type="button" class="gp-history-month" data-ga-choose-month="'+key+'"><b>'+key+'</b><strong>'+total+' tasks</strong><small>'+hh(sum(dates,d=>duration(s,d)))+'</small></button>';
   }).join('');
   const weekRows=[];
   for(let i=0;i<st.days.length;i+=7){
     const d=st.days.slice(i,i+7);
     weekRows.push('<button type="button" class="gp-history-month" data-ga-choose-week="'+d[0]+'"><b>'+fmt(d[0])+' – '+fmt(d[d.length-1])+'</b><strong>'+sum(d,k=>completed(s,k))+' tasks</strong><small>'+hh(sum(d,k=>duration(s,k)))+'</small></button>');
   }
   const ranked=['Reading','Listening','Speaking','Writing'].map(skill=>{
     const groups=(api()?.getGroups()||[]).filter(g=>g.label===skill);
     const n=sum(range,d=>groups.flatMap(g=>g.tasks).filter(t=>isDone(s,d,t)).length);
     const m=options.find(x=>x.key===skill)?.m||0;return {skill,n,m,total:range.length*groups.flatMap(g=>g.tasks).length};
   }).sort((a,b)=>(a.n+a.m/30)-(b.n+b.m/30));
   return '<section class="ga-panel gp-period"><div class="ga-panel-head"><h3>📊 Kunlik · haftalik · oylik progress</h3><small>Kuzatuv boshlandi: 15.10.2026</small></div>'+
    '<div class="gp-range-controls"><div class="gp-range-buttons">'+[['week','1 hafta'],['month','1 oy'],['all','Boshidan']].map(([v,l])=>'<button type="button" data-ga-period="'+v+'" class="'+(periodMode===v?'selected':'')+'">'+l+'</button>').join('')+'</div>'+
    '<label>Davrni tanlash<input id="gaPeriodDate" type="date" min="'+START+'" value="'+anchor+'"></label></div>'+
    '<p class="ga-muted">'+(range.length?start+' — '+end+' · '+range.length+' kun':'15-oktabr hali boshlanmagan. Oldingi kunlar hisobga olinmaydi.')+'</p>'+
    '<div class="ga-tiles">'+card('✅','Bajarilgan vazifalar',doneTotal+' / '+(range.length*knownTasks().length),'Barcha checklistlar')+
     card('📈','Bajarilish foizi',percentage+'%','Tanlangan davr')+
     card('⏱','O‘qish sessiyalari',hh(minutesTotal),'Taymer va sessiyalar')+
     card('🗓','Faol kunlar',activeCount+' / '+range.length,'Tanlangan davr')+'</div><p class="ga-muted">Qo‘lda kiritilgan o‘qish soatlari: <b>'+manualHours.toFixed(2)+' soat</b> (taymer vaqtiga qo‘shilmaydi, ikki marta hisoblanmasligi uchun).</p></section>'+
    '<section class="ga-panel"><h3>📅 Har bir kunning natijasi</h3><div class="gp-day-history">'+(daysTable||'<p class="ga-muted">Hozircha hisoblangan kunlar yo‘q.</p>')+'</div></section>'+
    '<section class="ga-panel"><h3>📈 Oylik arxiv</h3><div class="gp-history-grid">'+(monthRows||'<p class="ga-muted">15-oktabrdan boshlanadi.</p>')+'</div></section>'+
    '<section class="ga-panel"><h3>📆 Haftalik arxiv</h3><div class="gp-history-grid">'+(weekRows.join('')||'<p class="ga-muted">15-oktabrdan boshlanadi.</p>')+'</div></section>'+
    '<section class="ga-panel"><h3>⌛ Study Time Distribution</h3><div class="ga-bars">'+bars+'</div></section>'+
    '<section class="ga-panel"><h3>🏆 Rekordlar · Eng yaxshi kun</h3><div class="ga-tiles">'+card('🌟','Eng yaxshi kun',st.best?.day||'—',st.best?st.best.tasks+' vazifa · '+hh(st.best.minutes):'Hali faol kun yo‘q')+
      card('⏳','Eng uzun sessiya',st.longest?hh(st.longest.minutes):'—',st.longest?.category||'')+
      card('🔥','Streak',st.streak+' kun','Ketma-ket o‘qilgan kunlar')+
      card('📗','Jami vazifalar',st.taskTotal,'15-oktabrdan')+'</div></section>'+
    '<section class="ga-panel"><h3>🔎 Weak Skill Detector</h3><p class="ga-muted">Tanlangan davrdagi checklist va o‘qish vaqtiga asoslangan — IELTS band emas.</p>'+
      '<div class="ga-skill-rows">'+ranked.map((x,i)=>'<div><b>'+esc(x.skill)+'</b><span>'+x.n+'/'+x.total+' tasks · '+hh(x.m)+'</span>'+(i===0&&range.length?'<em>Ko‘proq mashq kerak</em>':'')+'</div>').join('')+'</div></section>';
 }
 function inputField(label,name,kind='text',placeholder='',value='',opts=''){
   return '<label>'+label+'<input name="'+name+'" type="'+kind+'" placeholder="'+esc(placeholder)+'" value="'+esc(value)+'" '+opts+'></label>';
 }
 function taskChecklist(s,groups){
   const day=selected(),g=api()?.getGroups()||[];
   return '<div class="gs-skill-grid">'+groups.map(name=>{
     const group=g.find(x=>x.label===name);
     if(!group)return '';
     const count=group.tasks.filter(t=>isDone(s,day,t)).length;
     return '<section class="gs-skill-card"><header><div><b>'+group.icon+' '+esc(group.label)+'</b><small>'+count+'/'+group.tasks.length+' bajarildi</small></div><span>'+Math.round(100*count/group.tasks.length)+'%</span></header>'+
      '<div class="gs-skill-progress"><i style="width:'+Math.round(100*count/group.tasks.length)+'%"></i></div>'+
      '<div class="gs-skill-tasks">'+group.tasks.map(t=>{
        const enabled=!!t.target,goal=Number(extra(s).targets?.[t.id])||t.target||0,value=Number(valDay(s,day).counts?.[t.id])||0;
        return '<div class="gs-skill-task"><button type="button" class="gs-task-left gs-tick-control '+(isDone(s,day,t)?'is-checked':'')+'" data-goal-toggle="'+t.id+'" aria-pressed="'+(isDone(s,day,t)?'true':'false')+'" aria-label="'+esc(t.name)+'">'+
          '<span class="gs-tick-box" aria-hidden="true">'+(isDone(s,day,t)?'✓':'')+'</span><span>'+esc(extra(s).names?.[t.id]||t.name)+'</span></button>'+
          (enabled?'<label class="gs-task-count"><input type="number" data-goal-count="'+t.id+'" min="0" max="99999" value="'+value+'"> / '+goal+'</label>':'')+
          '<span class="goals-proof-anchor" data-proof-task="'+t.id+'" data-proof-day="'+day+'"></span></div>';
      }).join('')+'</div></section>';
   }).join('')+'</div>';
 }
 function practiceForm(type){
   const defs={
      reading:{title:'Reading Passage',help:'Savollar va to‘g‘ri javoblar sonini yozing.',fields:'score'},
      article:{title:'Article',help:'Maqola nomini yozing.',fields:'simple'},
      listening:{title:'Listening',help:'Audio/test mashq natijasini yozing.',fields:'score'},
      speaking:{title:'Speaking',help:'Gapirgan vaqtni kiriting.',fields:'minutes'},
      writing:{title:'Writing',help:'Essay word count va estimated band.',fields:'writing'}
   };
   const def=defs[type],details=def.fields==='score'?
    '<label>Correct<input type="number" name="score" min="0" max="40" placeholder="30"></label><label>Total<input type="number" name="total" min="1" max="40" placeholder="40"></label><label>Band (optional)<input name="band" maxlength="10" placeholder="7.0"></label>':
     def.fields==='minutes'?'<label>Minutes<input name="minutes" type="number" min="1" max="300" placeholder="20"></label>':
     def.fields==='writing'?'<label>Word count<input name="words" type="number" min="0" max="3000" placeholder="260"></label><label>Estimated band<input name="band" maxlength="10" placeholder="7.0"></label><label>Errors<input name="mistakes" type="number" min="0" max="100" placeholder="3"></label>':'';
   return '<section class="gs-practice-card"><h3>'+esc(def.title)+' result</h3><p>'+esc(def.help)+'</p><form class="gs-practice-form" id="gaIELTSForm-'+type+'">'+
    '<label class="gs-full">Topic / title<input name="title" required maxlength="100" placeholder="'+esc(def.title)+' ..."></label>'+
    details+'<button type="submit">+ Save</button></form></section>';
 }
 function exams(s){
   const day=selected(),all=logs(s).filter(x=>x.day>=START);
   const totals=Object.fromEntries(['reading','article','listening','speaking','writing'].map(k=>[k,all.filter(x=>x.type===k).length]));
   const writing=all.filter(x=>x.type==='writing'),words=sum(writing,x=>Number(x.words)||0);
   const entries=all.slice(-30).reverse();
   return '<section class="gs-hero gs-ielts-hero"><span>IELTS · STUDY HUB</span><h2>IELTS Skills & Progress</h2><p>Har bir skill uchun alohida checklist va natija jurnali. Tanlangan sana: '+day+'</p></section>'+
    '<div class="ga-tiles">'+card('📖','Passages & Articles',totals.reading+totals.article,'Recorded')+
      card('🎧','Listening',totals.listening,'Recorded')+
      card('🗣','Speaking',totals.speaking,'Recorded')+
      card('✍️','Essays',totals.writing,words+' total words')+'</div>'+
    taskChecklist(s,['Reading','Listening','Speaking','Writing','General English'])+
    '<section class="ga-panel"><h3>🧪 Add individual IELTS practice results</h3><p class="ga-muted">Bitta ulkan forma o‘rniga har bir skill uchun qisqa alohida formalar. Saytdagi mos mashqlar tugaganda ayrimlari avtomatik saqlanadi.</p>'+
      '<div class="gs-practice-grid">'+['reading','article','listening','speaking','writing'].map(practiceForm).join('')+'</div></section>'+
    '<section class="ga-panel"><h3>📚 IELTS Study History</h3><div class="ga-log-list">'+
      (entries.length?entries.map(a=>'<div class="gs-log-item" data-activity-id="'+esc(a.id)+'"><div><b>'+esc(a.title||a.type)+'</b><small>'+esc(a.day)+' · '+esc(a.type)+' · '+esc(a.source||'manual')+'</small></div>'+
       '<span>'+esc(a.band||((a.score!==undefined&&a.score!=='')?a.score+'/'+(a.total||'—'):'✓'))+'</span>'+
       '<button data-ga-activity-remove="'+esc(a.id)+'" aria-label="Delete entry">×</button></div>').join(''):'<p class="ga-muted">15-oktabrdan keyingi natijalar shu yerda chiqadi.</p>')+
     '</div></section>';
 }
 function satPage(s){
   const day=selected(),sat=valDay(s,day),settings=extra(s);
   const date=settings.settings?.examDates?.sat||DEFAULT_DATES.sat;
   const examTime=settings.settings?.examTimes?.sat||'00:00';
   const note=settings.satNotes?.[day]||'';
   const history=Object.entries(settings.satNotes||{}).filter(([d,t])=>d>=START&&String(t||'').trim()).sort((a,b)=>b[0].localeCompare(a[0])).slice(0,15);
   return '<section class="gs-hero gs-sat-hero"><span>SAT · MATH PREPARATION</span><h2>SAT Maths & English Math</h2><p>15-oktabrdan boshlangan alohida reja. Test sanasi: '+esc(date)+' · '+esc(examTime)+' (Toshkent UTC+5)</p><span class="gs-countdown">'+clockNode(date,examTime)+'</span></section>'+
    '<section class="ga-panel"><h3>📐 SAT Daily Checklist</h3><p class="ga-muted">PDFdagi aniq maqsadlar: 8–9-sinf matematikasini 1-noyabrgacha o‘rganish, 1-noyabrda darslarni boshlash va ikki kunda 30 ta English Math so‘z o‘rganish.</p>'+
      taskChecklist(s,['SAT & English Math'])+'</section>'+
    '<section class="gs-sat-milestones">'+
      [['sat_math_nov','Finish grade 8–9 Maths','Before 1 November'],['sat_lessons','Start SAT Maths lessons','1 November'],['english_math','Start English Maths lessons','1 November']].map(([k,l,d])=>
       '<div class="gs-sat-row" data-sat-row="milestone_'+k+'"><button type="button" class="gs-sat-milestone gs-tick-control '+(s.milestones?.[k]?'is-checked':'')+'" data-goal-milestone-toggle="'+k+'" aria-pressed="'+(s.milestones?.[k]?'true':'false')+'"><span class="gs-tick-box" aria-hidden="true">'+(s.milestones?.[k]?'✓':'')+'</span><span><b>'+l+'</b><small>'+d+'</small></span></button><span class="goals-proof-anchor" data-proof-task="milestone_'+k+'" data-proof-day="'+day+'"></span></div>').join('')+'</section>'+
    '<section class="ga-panel"><h3>📝 SAT Study Notes</h3><p class="ga-muted">Bugun yechilgan mashqlar, qiyin bo‘lgan mavzu va kitobdagi sahifalar haqida yozing. Qayd tanlangan kunga saqlanadi.</p>'+
      '<form id="gaSATNotes" class="ga-reflection"><label>SAT Maths · '+day+'<textarea name="notes" rows="5" maxlength="4000" placeholder="Bugun o‘rganilgan mavzular, misollar va xulosalar...">'+esc(note)+'</textarea></label><button type="submit">Save SAT notes</button></form>'+
      '<div class="gp-proof-for-notes goals-proof-anchor" data-proof-task="sat_notes" data-proof-day="'+day+'"></div></section>'+
    '<section class="ga-panel"><h3>📆 SAT Notes History</h3><div class="gp-history-grid">'+(history.length?history.map(([d,n])=>
      '<button type="button" class="gp-history-month" data-gs-day="'+d+'"><b>'+d+'</b><small>'+esc(String(n).slice(0,100))+'</small></button>').join(''):'<p class="ga-muted">Saqlangan SAT qaydlar shu yerda ko‘rinadi.</p>')+'</div></section>';
 }
 function settings(s){
   const e=extra(s),settings=e.settings||{},dates={...DEFAULT_DATES,...(settings.examDates||{})},times=settings.examTimes||{};
   const reflection=e.reflections?.[selected()]||{};
   return '<section class="ga-panel"><h3>🗓 Imtihon sanasi va aniq boshlanish vaqti</h3>'+
     '<p class="ga-muted">Teskari sanoq Toshkent vaqti (UTC+5) bo‘yicha. Vaqt ko‘rsatilmasa, 00:00 hisoblanadi. Haqiqiy imtihon boshlanish vaqtini bilganingizda belgilang.</p>'+
     '<form id="gaExamForm" class="ga-form">'+
     inputField('IELTS sana','ielts','date','',''+dates.ielts,'required')+
     inputField('IELTS soat','ieltsTime','time','',times.ielts||'00:00','required')+
     inputField('SAT sana','sat','date','',''+dates.sat,'required')+
     inputField('SAT soat','satTime','time','',times.sat||'00:00','required')+
     inputField('Turkish sana','turkish','date','',''+dates.turkish,'required')+
     inputField('Turkish soat','turkishTime','time','',times.turkish||'00:00','required')+
     '<button type="submit">Sanalarni saqlash</button></form></section>'+
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
   if(!focusPrefsLoaded){
     const preferences=extra(s).settings||{};
     if(SKILLS.includes(preferences.focusCategory))focusCategory=preferences.focusCategory;
     if(SKILLS.includes(preferences.manualCategory))manualCategory=preferences.manualCategory;
     focusPrefsLoaded=true;
   }
   root.dataset.gaTab=tab;
   const area=document.createElement('section');
   area.className='ga-enhanced';
   area.innerHTML='<nav class="ga-tabbar" aria-label="Goals features">'+TABS.map(([k,l])=>'<button type="button" class="'+(tab===k?'active':'')+'" data-ga-tab="'+k+'">'+l+'</button>').join('')+'</nav>'+
    '<section class="ga-screen" '+(tab!=='dashboard'?'hidden':'')+'>'+dashboard(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='planner'?'hidden':'')+'>'+planner(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='focus'?'hidden':'')+'>'+focus(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='analytics'?'hidden':'')+'>'+analytics(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='ielts'?'hidden':'')+'>'+exams(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='sat'?'hidden':'')+'>'+satPage(s)+'</section>'+
    '<section class="ga-screen" '+(tab!=='settings'?'hidden':'')+'>'+settings(s)+'</section>';
   root.querySelector('.goals-summary')?.after(area);
   if(tab==='focus'){const cat=document.getElementById('gaFocusCat');if(cat)cat.value=focused?.category||focusCategory;}
   updateCountdowns();
   ingestPending();
 }
 function saveSession(cat,seconds,rating,source){
   const measured=mins(Math.round(seconds/60));
   if(measured<1){window.alert('Saqlash uchun kamida 1 daqiqa ishlang.');return false;}
   return update(e=>{initialize(e);e.sessions.push({id:id(),day:selected(),category:cat,minutes:measured,rating,source,at:new Date().toISOString()})});
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
   if((el=e.target.closest('[data-ga-focus-skill]'))){
     const skill=el.dataset.gaFocusSkill;
     if(!SKILLS.includes(skill))return;
     if(focused||focusElapsed>0){
       const note=document.querySelector('#vividGoalsPage .ga-focus-skill-selector .ga-muted');
       if(note)note.textContent='Sessiya davom etmoqda yoki pauzada. Skillni o‘zgartirish uchun Save Session yoki Reset bosing.';
       return;
     }
     focusCategory=skill;
     update(ex=>{initialize(ex);ex.settings.focusCategory=skill});
     return;
   }
   if((el=e.target.closest('[data-ga-manual-skill]'))){
     const skill=el.dataset.gaManualSkill;
     if(!SKILLS.includes(skill))return;
     manualCategory=skill;
     update(ex=>{initialize(ex);ex.settings.manualCategory=skill});
     return;
   }
   if((el=e.target.closest('[data-ga-period]'))){periodMode=el.dataset.gaPeriod;api().refresh();return;}
   if((el=e.target.closest('[data-ga-choose-month]'))){
     periodAnchor=el.dataset.gaChooseMonth+'-15';periodMode='month';api().refresh();return;
   }
   if((el=e.target.closest('[data-ga-choose-week]'))){
     periodAnchor=el.dataset.gaChooseWeek;periodMode='week';api().refresh();return;
   }
   if((el=e.target.closest('[data-gs-day]'))){
     const field=document.getElementById('goalsSelectedDate');
     if(field){field.value=el.dataset.gsDay;field.dispatchEvent(new Event('change',{bubbles:true}));}
     return;
   }
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
     if(!focused){focusCategory=document.getElementById('gaFocusCat')?.value||focusCategory;focused={category:focusCategory};focusSince=Date.now();}
     syncClock();return;
   }
   if(e.target.id==='gaFocusPause'){focusPause();return;}
   if(e.target.id==='gaFocusReset'){resetFocus();return;}
   if(e.target.id==='gaFocusSave'){
     const cat=focused?.category||document.getElementById('gaFocusCat')?.value||focusCategory;
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
   if(el.id==='gaFocusCat'){focusCategory=el.value;return;}
   if(el.id==='gaPeriodDate'){periodAnchor=el.value<START?START:el.value;api().refresh();return;}
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
     const cat=SKILLS.includes(d.category)?d.category:manualCategory;
     manualCategory=cat;
     update(x=>{initialize(x);x.sessions.push({id:id(),day,category:cat,minutes:mins(n),rating:Math.round(clamp(d.rating,1,10)),source:'manual',at:new Date().toISOString()})});
   }else if(form.id==='gaExamForm'){
     update(x=>{initialize(x);x.settings.examDates={ielts:String(d.ielts),sat:String(d.sat),turkish:String(d.turkish)};x.settings.examTimes={ielts:String(d.ieltsTime||'00:00'),sat:String(d.satTime||'00:00'),turkish:String(d.turkishTime||'00:00')};});
   }else if(form.id==='gaReflectionForm'){
     update(x=>{initialize(x);x.reflections[day]={learned:String(d.learned||'').slice(0,1600),hard:String(d.hard||'').slice(0,1600),improve:String(d.improve||'').slice(0,1600)}});
   }else if(form.id==='gaSATNotes'){
      update(x=>{initialize(x);x.satNotes??={};x.satNotes[day]=String(d.notes||'').slice(0,4000)});
   }else if(form.id.startsWith('gaIELTSForm-')){
      const type=form.id.replace('gaIELTSForm-','');
      if(!['reading','article','listening','speaking','writing'].includes(type))return;
      update((x,root)=>{
        initialize(x);
        const record={id:id(),day,type,category:LABELS[type]||type,title:String(d.title||'').slice(0,100),source:'manual',
          score:d.score==null||d.score===''?'':clamp(d.score,0,999),
          total:d.total==null||d.total===''?'':clamp(d.total,0,999),
          band:String(d.band||'').slice(0,20),words:clamp(d.words,0,9999),
          mistakes:clamp(d.mistakes,0,9999),minutes:clamp(d.minutes,0,1440)};
        x.activities.push(record);
        if(['reading','article','writing'].includes(type)){
          const key={reading:'read_passage',article:'read_article',writing:'essay'}[type];
          const entry=root.days[day]??={checks:{},counts:{},hours:'',note:''};
          entry.checks??={};entry.checks[key]=true;entry.updatedAt=new Date().toISOString();
        }
      });
   }else if(form.id==='gaPracticeForm'){
     const type=String(d.type);
     if(!['reading','article','listening','speaking','writing'].includes(type))return;
     update(x=>{initialize(x);x.activities.push({id:id(),day,type,category:LABELS[type]||'SAT',title:String(d.title).slice(0,100),
       score:d.score===''?'':clamp(d.score,0,999),total:d.total===''?'':clamp(d.total,0,999),band:String(d.band||'').slice(0,20),source:'manual',words:clamp(d.words,0,9999),mistakes:clamp(d.mistakes,0,9999),minutes:clamp(d.minutes,0,1440)})});
   }
 }
 function pendingKey(uid){return 'vivid:goals:verified-activity:'+uid}
 function pendingRead(uid){try{const data=JSON.parse(localStorage.getItem(pendingKey(uid))||'[]');return Array.isArray(data)?data:[]}catch{return []}}
 function queueAuto(ev){
   if(!authorized())return;
   const raw=ev?.detail||{},type=String(raw.type||'').toLowerCase();
   if(!EVENT_TYPES.has(type)||localDate()<START)return;
   const uid=window.VocabCloud?.userId;if(!uid)return;
   const item={id:id(),day:localDate(),type,category:LABELS[type]||type,title:String(raw.title||type).slice(0,100),
     band:raw.band===undefined?'':String(raw.band).slice(0,20),score:raw.score===undefined?'':clamp(raw.score,0,999),
     total:raw.total===undefined?'':clamp(raw.total,0,999),words:clamp(raw.words,0,9999),source:'automatic'};
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
     }
     if(ex.activities.length>2000)ex.activities.splice(0,ex.activities.length-2000);
   });
   if(ok)try{localStorage.removeItem(pendingKey(uid))}catch{}
   reminderPending=false;
 }
 document.addEventListener('vivid-goals:rendered',putUI);
 document.addEventListener('vivid:study-complete',queueAuto);
 document.addEventListener('click',onClick);
 document.addEventListener('change',onChange);
 document.addEventListener('submit',onSubmit);
 focusTicker=setInterval(()=>{syncClock();updateCountdowns();},1000);
 window.VividGoalsAdvanced={version:'g3',selectedFeatures:23,startDate:START};
})();