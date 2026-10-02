(() => {
  'use strict';
  const KEY = 'vivid-ielts-100day-v2';
  const today = () => { const d = new Date(); return new Date(d.getTime() - d.getTimezoneOffset()*60000).toISOString().slice(0,10); };
  const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const clone = v => JSON.parse(JSON.stringify(v));
  const dayDate = (start, n) => { const d = new Date(`${start}T00:00:00`); d.setDate(d.getDate() + n - 1); return d; };
  const fmtDate = d => d.toLocaleDateString('uz-UZ', {day:'2-digit', month:'short', year:'numeric'});
  const dayType = d => d.getDay() === 0 ? 'sun' : [1,3,5].includes(d.getDay()) ? 'mwf' : 'tts';

  const IELTS = {
    mwf: [
      ['reading_passage','Reading Upgrade — passage yoki training','Reading'],
      ['reading_words','Reading’dan 15 ta yangi so‘z','Reading'],
      ['listening_core','Listening Upgrade — asosiy mashq','Listening'],
      ['listening_speed','Speed Listening / dictation','Listening'],
      ['speaking_topic','Speaking — 1 topic + recording','Speaking'],
      ['speaking_words','Speaking Words — review','Speaking'],
      ['writing_idea','Writing — idea + paragraph','Writing'],
      ['grammar','Grammar — 1 structure','Grammar']
    ],
    tts: [
      ['reading_review','Reading xatolari va vocabulary review','Reading'],
      ['listening_review','Listening xatolari va transcript review','Listening'],
      ['speaking_part','Speaking Part 1–3 practice','Speaking'],
      ['shadowing','Shadowing — 20 daqiqa','Speaking'],
      ['writing_full','Writing — essay/article practice','Writing'],
      ['writing_collocations','Writing collocations review','Writing'],
      ['grammar_drill','Grammar drill / tense review','Grammar'],
      ['vocab_review','Takrorlash / flashcards','Vocabulary']
    ],
    sun: [
      ['reading_mock','Reading Mock','Mock'],
      ['listening_mock','Listening Mock','Mock'],
      ['speaking_mock','Speaking Mock','Mock'],
      ['writing_mock','Writing Mock / full essay','Mock'],
      ['weekly_review','Haftalik natijalarni tahlil qilish','Review'],
      ['next_week','Keyingi hafta rejasini yozish','Review']
    ]
  };
  const DAILY = [
    ['walk','20–50 daqiqa yurish','Routine'],
    ['book','Kitob o‘qish','Routine'],
    ['phone','Uyqudan oldin telefonni cheklash','Routine'],
    ['plan','Ertangi kun uchun qisqa reja','Routine']
  ];

  function blankState(){ return {version:2,name:'',startDate:today(),goal:'IELTS natijasini oshirish va 100 kun davomida izchil ishlash',days:{},customTasks:[],activeTab:'dashboard',selectedDay:1}; }
  let state = load();
  let host = null;
  let bound = false;

  function normalize(v){
    const b = blankState(), x = v && typeof v === 'object' ? v : {};
    return {
      version:2,
      name:String(x.name || ''),
      startDate:/^\d{4}-\d{2}-\d{2}$/.test(x.startDate || '') ? x.startDate : b.startDate,
      goal:String(x.goal || b.goal).slice(0,500),
      days:x.days && typeof x.days === 'object' && !Array.isArray(x.days) ? x.days : {},
      customTasks:Array.isArray(x.customTasks) ? x.customTasks.filter(t=>t&&t.id&&t.name).slice(0,20) : [],
      activeTab:['dashboard','daily','stats','settings'].includes(x.activeTab) ? x.activeTab : 'dashboard',
      selectedDay:Math.min(100,Math.max(1,Number(x.selectedDay)||1))
    };
  }
  function load(){ try { return normalize(JSON.parse(localStorage.getItem(KEY)||'null')); } catch { return blankState(); } }
  function save(){
    try { localStorage.setItem(KEY, JSON.stringify(state)); } catch {}
    window.VocabCloud?.queue?.();
  }
  function currentDay(){
    const start = new Date(`${state.startDate}T00:00:00`), now = new Date(); now.setHours(0,0,0,0);
    return Math.min(100,Math.max(1,Math.floor((now-start)/86400000)+1));
  }
  function tasksFor(n){
    const d = dayDate(state.startDate,n), type = dayType(d);
    const base = [...IELTS[type], ...DAILY];
    for(const t of state.customTasks) base.push([`custom_${t.id}`,t.name,'Custom']);
    return base.map(([id,name,group])=>({id,name,group}));
  }
  function dayState(n){ if(!state.days[n]) state.days[n]={tasks:{},note:'',savedAt:null}; return state.days[n]; }
  function pct(n){ const tasks=tasksFor(n), d=state.days[n]; if(!d) return 0; const done=tasks.filter(t=>d.tasks?.[t.id]?.done).length; return tasks.length?Math.round(done*100/tasks.length):0; }
  function finishedDays(){ return Array.from({length:100},(_,i)=>i+1).filter(n=>pct(n)===100).length; }
  function avgProgress(){ const vals=Array.from({length:100},(_,i)=>pct(i+1)).filter(Boolean); return vals.length?Math.round(vals.reduce((a,b)=>a+b,0)/vals.length):0; }
  function streaks(){
    const cur=currentDay(); let current=0,best=0,run=0;
    for(let n=1;n<=Math.min(cur,100);n++){ if(pct(n)>=70){run++;best=Math.max(best,run)}else run=0; }
    for(let n=cur;n>=1;n--){ if(pct(n)>=70)current++;else break; }
    return {current,best};
  }
  function categoryStats(){
    const map={};
    for(let n=1;n<=100;n++){
      const d=state.days[n]; if(!d) continue;
      for(const t of tasksFor(n)){
        map[t.group] ||= {done:0,total:0}; map[t.group].total++;
        if(d.tasks?.[t.id]?.done) map[t.group].done++;
      }
    }
    return map;
  }
  function top(){
    return `<section class="j100-hero"><div><span class="j100-kicker">VIVID IELTS · 100 DAY UPGRADE</span><h1>Har kuni ozgina.<br><em>100 kunda katta o‘zgarish.</em></h1><p>${esc(state.goal)}</p></div><div class="j100-hero-stat"><span>BUGUN</span><strong>${currentDay()}</strong><small>/ 100 kun</small></div></section>
    <nav class="j100-tabs" aria-label="100 Day bo‘limlari">
      ${[['dashboard','Bosh sahifa'],['daily','Kunlik jurnal'],['stats','Statistika'],['settings','Sozlamalar']].map(([id,l])=>`<button type="button" data-j100-tab="${id}" class="${state.activeTab===id?'active':''}">${l}</button>`).join('')}
    </nav>`;
  }
  function dashboard(){
    const cur=currentDay(), p=pct(cur), st=streaks();
    const cells=Array.from({length:100},(_,i)=>{const n=i+1,pr=pct(n);return `<button type="button" data-j100-day="${n}" class="j100-day ${pr===100?'done':pr?'started':''} ${n===cur?'today':''}" title="${n}-kun · ${pr}%"><span>${n}</span></button>`}).join('');
    const todayTasks=tasksFor(cur).slice(0,8), d=dayState(cur);
    return `${top()}<div class="j100-grid j100-dashboard">
      <section class="j100-card j100-overview"><div class="j100-section-head"><div><span class="j100-kicker">SIZNING YO‘LINGIZ</span><h2>100 kunlik progress xaritasi</h2></div><button type="button" class="j100-primary" data-j100-open-day="${cur}">Bugungi jurnal →</button></div><div class="j100-map">${cells}</div><div class="j100-legend"><span><i class="done"></i>Tugallangan</span><span><i class="started"></i>Boshlangan</span><span><i class="today"></i>Bugun</span></div></section>
      <aside class="j100-card j100-side"><span class="j100-kicker">UMUMIY HOLAT</span><div class="j100-metrics"><div><strong>${finishedDays()}</strong><span>100% kun</span></div><div><strong>${avgProgress()}%</strong><span>o‘rtacha</span></div><div><strong>${st.current}</strong><span>joriy streak</span></div><div><strong>${st.best}</strong><span>eng yaxshi streak</span></div></div></aside>
    </div>
    <section class="j100-card"><div class="j100-section-head"><div><span class="j100-kicker">${fmtDate(dayDate(state.startDate,cur))}</span><h2>Bugungi asosiy vazifalar</h2></div><strong class="j100-percent">${p}%</strong></div><div class="j100-mini-tasks">${todayTasks.map(t=>`<label><input type="checkbox" data-j100-check="${t.id}" data-day="${cur}" ${d.tasks?.[t.id]?.done?'checked':''}><span><b>${esc(t.name)}</b><small>${esc(t.group)}</small></span></label>`).join('')}</div></section>`;
  }
  function daily(){
    const n=state.selectedDay, d=dayState(n), tasks=tasksFor(n), p=pct(n), date=dayDate(state.startDate,n);
    return `${top()}<section class="j100-card"><div class="j100-day-head"><div><span class="j100-kicker">KUNLIK JURNAL</span><h2>${n}-kun · ${fmtDate(date)}</h2><p>${dayType(date)==='sun'?'Haftalik mock va review kuni':dayType(date)==='mwf'?'Asosiy skill practice kuni':'Review, Speaking va Writing kuni'}</p></div><div class="j100-day-switch"><button type="button" data-j100-shift="-1" ${n<=1?'disabled':''}>←</button><input type="number" id="j100DayInput" min="1" max="100" value="${n}"><span>/100</span><button type="button" data-j100-shift="1" ${n>=100?'disabled':''}>→</button></div></div><div class="j100-progress"><span style="width:${p}%"></span></div><div class="j100-progress-label"><span>${tasks.filter(t=>d.tasks?.[t.id]?.done).length}/${tasks.length} vazifa</span><strong>${p}%</strong></div></section>
    <section class="j100-card"><div class="j100-task-list">${tasks.map(t=>`<label class="j100-task ${d.tasks?.[t.id]?.done?'done':''}"><input type="checkbox" data-j100-check="${t.id}" data-day="${n}" ${d.tasks?.[t.id]?.done?'checked':''}><span class="j100-checkmark">✓</span><span class="j100-task-copy"><b>${esc(t.name)}</b><small>${esc(t.group)}</small></span></label>`).join('')}</div></section>
    <section class="j100-card"><div class="j100-section-head"><div><span class="j100-kicker">KUN YAKUNI</span><h2>Qisqa reflection</h2></div><span id="j100Saved">${d.savedAt?'Saqlandi ✓':''}</span></div><textarea id="j100Note" rows="6" maxlength="4000" placeholder="Bugun nimani yaxshi qildingiz? Nima qiyin bo‘ldi? Ertaga nimani o‘zgartirasiz?">${esc(d.note||'')}</textarea></section>`;
  }
  function stats(){
    const st=streaks(), cats=categoryStats(), cur=currentDay();
    const recent=[]; for(let n=Math.max(1,cur-13);n<=cur;n++) recent.push({n,p:pct(n)});
    const bars=recent.map(x=>`<div class="j100-bar-wrap"><span class="j100-bar" style="height:${Math.max(4,x.p)}%"><i>${x.p}%</i></span><small>${x.n}</small></div>`).join('');
    const rows=Object.entries(cats).sort((a,b)=>b[1].total-a[1].total).map(([k,v])=>{const p=v.total?Math.round(v.done*100/v.total):0;return `<div class="j100-stat-row"><span>${esc(k)}</span><div><i style="width:${p}%"></i></div><strong>${p}%</strong></div>`}).join('') || '<p class="j100-empty">Statistika uchun hali vazifalar bajarilmagan.</p>';
    return `${top()}<div class="j100-grid j100-stat-cards"><div class="j100-card"><span>100% tugallangan kunlar</span><strong>${finishedDays()}</strong></div><div class="j100-card"><span>O‘rtacha progress</span><strong>${avgProgress()}%</strong></div><div class="j100-card"><span>Joriy streak</span><strong>${st.current} kun</strong></div><div class="j100-card"><span>Eng yaxshi streak</span><strong>${st.best} kun</strong></div></div>
    <div class="j100-grid"><section class="j100-card"><div class="j100-section-head"><div><span class="j100-kicker">OXIRGI 14 KUN</span><h2>Kunlik bajarilish</h2></div></div><div class="j100-bars">${bars}</div></section><section class="j100-card"><div class="j100-section-head"><div><span class="j100-kicker">YO‘NALISHLAR</span><h2>Qaysi skill ko‘proq bajarilgan?</h2></div></div><div class="j100-stat-list">${rows}</div></section></div>`;
  }
  function settings(){
    return `${top()}<div class="j100-grid"><section class="j100-card"><span class="j100-kicker">JURNAL SOZLAMALARI</span><h2>100 kunlik yo‘lni moslang</h2><div class="j100-form"><label>Ismingiz<input id="j100Name" value="${esc(state.name)}" placeholder="Ism"></label><label>Boshlanish sanasi<input id="j100Start" type="date" value="${state.startDate}"></label><label class="wide">Asosiy maqsad<textarea id="j100Goal" rows="4" maxlength="500">${esc(state.goal)}</textarea></label></div><button type="button" class="j100-primary" data-j100-save-settings>Saqlash</button></section>
      <section class="j100-card"><span class="j100-kicker">SHAXSIY VAZIFALAR</span><h2>O‘zingizga kerakli task qo‘shing</h2><div class="j100-add"><input id="j100CustomTask" maxlength="80" placeholder="Masalan: 30 daqiqa Python"><button type="button" data-j100-add-task>Qo‘shish</button></div><div class="j100-custom-list">${state.customTasks.length?state.customTasks.map(t=>`<div><span>${esc(t.name)}</span><button type="button" data-j100-delete-task="${esc(t.id)}">×</button></div>`).join(''):'<p class="j100-empty">Hali shaxsiy vazifa yo‘q.</p>'}</div><hr><button type="button" class="j100-danger" data-j100-reset>100 Day ma’lumotlarini tozalash</button></section></div>`;
  }
  function render(target){
    if(target) host=target;
    if(!host) return;
    host.innerHTML=`<div class="j100-app">${state.activeTab==='dashboard'?dashboard():state.activeTab==='daily'?daily():state.activeTab==='stats'?stats():settings()}</div>`;
    bind();
  }
  function setTab(tab){ state.activeTab=tab; save(); render(); }
  function bind(){
    if(bound) return; bound=true;
    document.addEventListener('click', e=>{
      const app=e.target.closest('.j100-app'); if(!app) return;
      const tab=e.target.closest('[data-j100-tab]'); if(tab){setTab(tab.dataset.j100Tab);return;}
      const day=e.target.closest('[data-j100-day],[data-j100-open-day]'); if(day){state.selectedDay=Number(day.dataset.j100Day||day.dataset.j100OpenDay);state.activeTab='daily';save();render();return;}
      const sh=e.target.closest('[data-j100-shift]'); if(sh){state.selectedDay=Math.min(100,Math.max(1,state.selectedDay+Number(sh.dataset.j100Shift)));save();render();return;}
      const saveBtn=e.target.closest('[data-j100-save-settings]'); if(saveBtn){state.name=document.getElementById('j100Name')?.value.trim().slice(0,80)||'';const s=document.getElementById('j100Start')?.value;if(/^\d{4}-\d{2}-\d{2}$/.test(s||''))state.startDate=s;state.goal=document.getElementById('j100Goal')?.value.trim().slice(0,500)||blankState().goal;save();render();return;}
      const add=e.target.closest('[data-j100-add-task]'); if(add){const input=document.getElementById('j100CustomTask'),name=input?.value.trim();if(name){state.customTasks.push({id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),name:name.slice(0,80)});save();render();}return;}
      const del=e.target.closest('[data-j100-delete-task]'); if(del){state.customTasks=state.customTasks.filter(t=>t.id!==del.dataset.j100DeleteTask);save();render();return;}
      const reset=e.target.closest('[data-j100-reset]'); if(reset&&confirm('100 Day progressini butunlay tozalaysizmi?')){state=blankState();save();render();return;}
    });
    document.addEventListener('change', e=>{
      const app=e.target.closest('.j100-app'); if(!app) return;
      if(e.target.matches('[data-j100-check]')){const n=Number(e.target.dataset.day),d=dayState(n),id=e.target.dataset.j100Check;d.tasks[id]={...(d.tasks[id]||{}),done:e.target.checked,updatedAt:Date.now()};d.savedAt=new Date().toISOString();save();render();return;}
      if(e.target.id==='j100DayInput'){state.selectedDay=Math.min(100,Math.max(1,Number(e.target.value)||1));save();render();}
    });
    let timer=null;
    document.addEventListener('input', e=>{
      if(!e.target.closest('.j100-app')) return;
      if(e.target.id==='j100Note'){const d=dayState(state.selectedDay);d.note=e.target.value.slice(0,4000);d.savedAt=new Date().toISOString();clearTimeout(timer);timer=setTimeout(()=>{save();const x=document.getElementById('j100Saved');if(x)x.textContent='Saqlandi ✓';},450);}
    });
  }

  window.VividJourney100={
    render,
    getState:()=>clone(state),
    setState:v=>{state=normalize(v);try{localStorage.setItem(KEY,JSON.stringify(state));}catch{} if(host&&document.body.contains(host))render();}
  };
})();
