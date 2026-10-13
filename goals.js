(() => {
  'use strict';

  // The server-verified Supabase user is checked again before every cloud read/write.
  // A public client-side menu is not an authorization boundary: user_state must have
  // user_id = auth.uid() RLS policies in Supabase.
  const OWNER = 'fenric18@gmail.com';
  const STATE_KEY = 'vivid_goals_tracker_v1';
  const NAV_ID = 'vividGoalsNav';
  const GROUPS = [
    { id:'reading', label:'Reading', icon:'📖', tasks:[
      {id:'read_article', name:'Read 1 article'},
      {id:'read_passage', name:'Solve 1 passage'},
      {id:'els_book', name:'ELS book'},
      {id:'reading_words', name:'Learn 25+ words', target:25, unit:'words'}
    ]},
    { id:'listening', label:'Listening', icon:'🎧', tasks:[
      {id:'podcasts', name:'Listen to 2 podcasts', target:2, unit:'podcasts'},
      {id:'listening_parts', name:'Solve 2 parts and analyse', target:2, unit:'parts'},
      {id:'keywords_table', name:'Keywords table'},
      {id:'siroj_method', name:'Siroj method'},
      {id:'ganisher_method', name:'G‘anisher method'}
    ]},
    { id:'speaking', label:'Speaking', icon:'🗣️', tasks:[
      {id:'speaking_collocations', name:'Learn 20+ collocations', target:20, unit:'collocations'},
      {id:'speak_english', name:'Speak only English'},
      {id:'speaking_mock', name:'Full speaking mock'},
      {id:'speaking_structures', name:'Learn 2 structures', target:2, unit:'structures'},
      {id:'conversation_maya', name:'Conversation with Maya'}
    ]},
    { id:'writing', label:'Writing', icon:'✍️', tasks:[
      {id:'essay', name:'Write 1 essay'},
      {id:'writing_analysis', name:'Essay analysis'},
      {id:'writing_structures', name:'Learn 2 structures', target:2, unit:'structures'},
      {id:'writing_words', name:'Learn 20+ words', target:20, unit:'words'},
      {id:'idea_generate', name:'Generate ideas'}
    ]},
    { id:'general', label:'General English', icon:'🌱', tasks:[
      {id:'general_theme', name:'Learn 1 new theme every day'}
    ]},
    { id:'sat', label:'SAT & English Math', icon:'🧮', tasks:[
      {id:'sat_math', name:'Study grade 8–9 Maths until 1 November'},
      {id:'english_math_words', name:'Learn 30 English Math words in 2 days', target:30, unit:'words / 2 days', rolling:true}
    ]}
  ];
  const MILESTONES = [
    {id:'ielts_exam', icon:'🎓', group:'IELTS', title:'IELTS exam', date:'7 December'},
    {id:'sat_exam', icon:'🧠', group:'SAT', title:'SAT exam', date:'6 March'},
    {id:'turkish', icon:'🇹🇷', group:'Language', title:'Learn Turkish', date:'1 May'},
    {id:'sat_math_nov', icon:'📐', group:'SAT', title:'Finish grade 8–9 Maths', date:'Before 1 November'},
    {id:'sat_lessons', icon:'📚', group:'SAT', title:'Start SAT Maths lessons', date:'1 November'},
    {id:'english_math', icon:'🔤', group:'SAT', title:'Start English Maths lessons', date:'1 November'}
  ];
  const TASKS = GROUPS.flatMap(g=>g.tasks);
  const totalTasks = TASKS.length;
  const blank = () => ({version:2,days:{},milestones:{},milestonesUpdatedAt:'',extras:{},extrasUpdatedAt:'',updatedAt:''});
  const safe = s => String(s ?? '').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
  const getDay = () => { const d=new Date(); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  const prevDay = day => { const d=new Date(day+'T12:00:00'); d.setDate(d.getDate()-1); return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-'); };
  const nval = v => Math.min(99999,Math.max(0,Number(v)||0));
  const normalize = raw => {
    const x=raw && typeof raw==='object' ? raw : {};
    return {version:2, days:x.days && typeof x.days==='object' ? x.days:{},
      milestones:x.milestones && typeof x.milestones==='object'?x.milestones:{},
      milestonesUpdatedAt:x.milestonesUpdatedAt||'',extras:x.extras && typeof x.extras==='object' ? x.extras:{},
      extrasUpdatedAt:x.extrasUpdatedAt||'',updatedAt:x.updatedAt||''};
  };
  const done = (s,day,task) => {
    const d=s.days[day]||{};
    const required = task.target ? (nval(s.extras?.targets?.[task.id]) || task.target) : 0;
    if(required){
      let count=nval(d.counts?.[task.id]);
      if(task.rolling) count+=nval(s.days[prevDay(day)]?.counts?.[task.id]);
      return count>=required;
    }
    return !!d.checks?.[task.id];
  };
  const percent = (a,b) => b ? Math.round(a/b*100):0;
  const dayCompleted = (s,day) => TASKS.filter(t=>done(s,day,t)).length;
  const localKey = id => 'vivid:goals:'+id+':v1';

  let state=blank(), selected=getDay(), userId='', client=null;
  let loading=false, visible=false, dirty=false, writing=false, saveTimer=null, pulseTimer=null;
  let message='';

  function isOwnerSession(){
    const c=window.VocabCloud;
    return !!(c?.enabled && c?.userId && String(c.email||'').trim().toLowerCase()===OWNER);
  }
  function updateMenu(){
    const nav=document.getElementById(NAV_ID);
    if(!nav) return;
    const ok=isOwnerSession();
    nav.hidden=!ok;
    nav.setAttribute('aria-hidden',String(!ok));
    if(!ok && visible){
      visible=false;
      nav.classList.remove('active');
      document.querySelector('[data-view="all"]')?.click();
    }
  }
  async function checkIdentity(){
    if(!isOwnerSession()) return false;
    if(!(window.supabase && window.VOCAB_SUPABASE?.url)) return false;
    if(!client){
      client=window.supabase.createClient(window.VOCAB_SUPABASE.url,window.VOCAB_SUPABASE.key,{
        auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}
      });
    }
    const {data,error}=await client.auth.getUser();
    const u=data?.user;
    if(error || !u || u.id!==window.VocabCloud.userId || String(u.email||'').trim().toLowerCase()!==OWNER) return false;
    userId=u.id;
    return true;
  }
  function cache(){
    if(!userId) return;
    try {localStorage.setItem(localKey(userId),JSON.stringify(state));}catch{}
  }
  function cacheRead(id){
    try {return normalize(JSON.parse(localStorage.getItem(localKey(id))||'null'));}catch{return blank();}
  }
  function reconcile(local,remote){
    const l=normalize(local),r=normalize(remote),out=normalize(remote);
    const keys=new Set([...Object.keys(l.days),...Object.keys(r.days)]);
    for(const d of keys){
      if(!r.days[d] || (l.days[d] && String(l.days[d].updatedAt||'')>String(r.days[d].updatedAt||''))) out.days[d]=l.days[d];
    }
    if(l.milestonesUpdatedAt>r.milestonesUpdatedAt){
      out.milestones=l.milestones;
      out.milestonesUpdatedAt=l.milestonesUpdatedAt;
    }
    if(l.extrasUpdatedAt>r.extrasUpdatedAt){out.extras=l.extras;out.extrasUpdatedAt=l.extrasUpdatedAt;}
    if(l.updatedAt>r.updatedAt) out.updatedAt=l.updatedAt;
    return out;
  }
  async function open(){
    if(loading || visible) return;
    loading=true;
    const nav=document.getElementById(NAV_ID);
    if(nav) nav.disabled=true;
    try{
      if(!await checkIdentity()){
        updateMenu();
        throw Error('Bu bo‘lim faqat ruxsat berilgan hisobga ochiladi.');
      }
      state=cacheRead(userId);
      message='Cloud bilan sinxronlash tekshirilmoqda…';
      const {data,error}=await client.from('user_state').select('value')
        .eq('user_id',userId).eq('key',STATE_KEY).maybeSingle();
      if(error) {message='Cloud o‘qilmadi. Mahalliy nusxa ko‘rsatilyapti.';}
      else{
        const remote=normalize(data?.value);
        const joined=reconcile(state,remote);
        dirty=JSON.stringify(joined)!==JSON.stringify(remote);
        state=joined;cache();
        message=dirty?'Mahalliy o‘zgarishlar sinxronlanmoqda…':'Cloud bilan sinxronlandi ✓';
      }
      visible=true;selected=getDay();
      document.querySelectorAll('#primaryNav .nav-item.active').forEach(el=>el.classList.remove('active'));
      nav?.classList.add('active');
      render();
      if(dirty) queueWrite(false);
    }catch(err){window.alert(err.message||'Goals ochilmadi.');}
    finally{loading=false;if(nav)nav.disabled=false;}
  }
  function dayState(day){
    if(!state.days[day]) state.days[day]={checks:{},counts:{},hours:'',note:'',updatedAt:''};
    return state.days[day];
  }
  function changed(day){
    const now=new Date().toISOString();
    if(day) dayState(day).updatedAt=now;
    state.updatedAt=now;
    cache();queueWrite();
  }
  function queueWrite(debounce=true){
    dirty=true; clearTimeout(saveTimer);
    message='Saqlanmoqda…';
    setStatus();
    if(debounce) saveTimer=setTimeout(flush,850);
    else flush();
  }
  async function flush(){
    if(writing || !dirty || !userId) return;
    writing=true;
    while(dirty){
      dirty=false;
      try{
        if(!await checkIdentity()) throw Error('Hisobni qayta tekshirib bo‘lmadi.');
        const value=JSON.parse(JSON.stringify(state));
        const {error}=await client.from('user_state').upsert({
          user_id:userId,key:STATE_KEY,value,updated_at:new Date().toISOString()
        },{onConflict:'user_id,key'});
        if(error) throw error;
        message='Cloudga saqlandi ✓';
      }catch(err){
        dirty=true;message='Cloudga saqlanmadi. Mahalliy nusxa saqlandi; internetni tekshiring.';
        console.warn('[Goals] Save:',err?.message||err);
        break;
      }
      setStatus();
    }
    writing=false;setStatus();
  }
  function setStatus(){
    const el=document.getElementById('goalsSaveStatus');
    if(el)el.textContent=message;
  }
  function mark(day,taskId,checked){
    dayState(day).checks[taskId]=checked;
    changed(day);render();
  }
  function render(){
    if(!visible || !isOwnerSession()) return;
    const host=document.getElementById('mainContent');
    if(!host) return;
    const current=state.days[selected]||{};
    const complete=dayCompleted(state,selected);
    const lastDays=Array.from({length:7},(_,i)=>{
      const d=new Date(getDay()+'T12:00:00');d.setDate(d.getDate()-(6-i));
      return [d.getFullYear(),String(d.getMonth()+1).padStart(2,'0'),String(d.getDate()).padStart(2,'0')].join('-');
    });
    const total7=lastDays.reduce((s,d)=>s+dayCompleted(state,d),0);
    const milestoneCount=MILESTONES.filter(m=>state.milestones[m.id]).length;
    const panels=GROUPS.map(g=>{
      const completeGroup=g.tasks.filter(t=>done(state,selected,t)).length;
      return `<section class="goals-panel"><div class="goals-panel-head">
        <h2><span>${g.icon}</span> ${g.label}</h2><small>${completeGroup}/${g.tasks.length}</small>
      </div><div class="goals-tasks">${g.tasks.map(t=>{
        const checked=done(state,selected,t);
        const effectiveTarget=t.target?(nval(state.extras?.targets?.[t.id])||t.target):0;
        const effectiveName=String(state.extras?.names?.[t.id]||t.name);
        const count=nval(current.counts?.[t.id]);
        const rolling=t.rolling?nval(state.days[prevDay(selected)]?.counts?.[t.id]):0;
        return `<div class="goals-task ${checked?'is-done':''}">
          <div class="goals-task-main">${effectiveTarget?
          `<span class="goals-dot ${checked?'on':''}">${checked?'✓':''}</span>`:
          `<input type="checkbox" data-goal-check="${t.id}" ${checked?'checked':''} aria-label="${safe(effectiveName)}">`}
          <span class="goals-task-name">${safe(effectiveName)}</span></div>
          ${effectiveTarget?`<div class="goals-number"><input type="number" min="0" max="99999" step="1" inputmode="numeric" data-goal-count="${t.id}" value="${count}" aria-label="${safe(effectiveName)}: miqdor"><span>${t.rolling?`${count}+ ${rolling} (oldingi kun) / ${effectiveTarget}`:`/ ${effectiveTarget}`}</span></div>`:''}
        </div>`;
      }).join('')}</div></section>`;
    }).join('');
    host.innerHTML=`<div class="goals-app" id="vividGoalsPage">
      <section class="goals-hero"><div><span class="goals-kicker">2027 NEW LIFE · PERSONAL TRACKER</span>
        <h1>Goals <span>✦</span></h1><p>IELTS, SAT va Turkish uchun shaxsiy maqsadlaringiz. Har bir kunning natijasi hisobingizda saqlanadi.</p>
      </div><div class="goals-hero-meter"><strong>${percent(complete,totalTasks)}%</strong><span>Tanlangan kun</span></div></section>
      <div class="goals-summary">
        <article><span>Kunlik vazifalar</span><strong>${complete}<small> / ${totalTasks}</small></strong></article>
        <article><span>Oxirgi 7 kun</span><strong>${total7}<small> / ${totalTasks*7}</small></strong></article>
        <article><span>Asosiy bosqichlar</span><strong>${milestoneCount}<small> / ${MILESTONES.length}</small></strong></article>
      </div>
      <section class="goals-milestones"><div class="goals-section-title"><div><span>YOUR BIG GOALS</span><h2>Maqsadlar va muddatlar</h2></div><small>PDFda yil belgilanmagan; sanalar aynan kiritilgan.</small></div>
        <div class="goals-milestone-grid">${MILESTONES.map(m=>`<label class="goals-milestone ${state.milestones[m.id]?'is-done':''}">
          <span class="goals-milestone-icon">${m.icon}</span><span><small>${m.group}</small><b>${safe(m.title)}</b><em>${safe(m.date)}</em></span>
          <input type="checkbox" data-goal-milestone="${m.id}" ${state.milestones[m.id]?'checked':''} aria-label="${safe(m.title)}"></label>`).join('')}</div>
      </section>
      <section class="goals-workspace"><div class="goals-section-title"><div><span>DAILY HABITS</span><h2>Kunlik tracker</h2></div>
        <label class="goals-date-picker">Sana <input id="goalsSelectedDate" type="date" value="${selected}"></label></div>
        <div class="goals-progress"><span style="width:${percent(complete,totalTasks)}%"></span></div>
        <p class="goals-progress-label">${complete} / ${totalTasks} vazifa bajarildi</p>
        <div class="goals-panels">${panels}</div>
      </section>
      <section class="goals-lower"><div class="goals-panel"><div class="goals-panel-head"><h2>⏱ O‘qish soatlari</h2></div>
        <label class="goals-hour-label">Tanlangan kuni haqiqiy o‘qilgan soat
        <input id="goalsHours" type="number" min="0" max="24" step="0.25" value="${safe(current.hours??'')}" placeholder="Masalan: 4.5"></label>
        <p class="goals-source-note"><b>PDFdagi reja:</b> 1-noyabrgacha 8 soat IELTS va alohida qatorda 4 soat IELTS deb yozilgan. 8-dekabrdan 10+ soat. 8 va 4 soat qaysi biri ekanini aniqlashtirish kerak.</p>
      </div><div class="goals-panel"><div class="goals-panel-head"><h2>📝 Kunlik qayd</h2></div>
        <label class="goals-note-label">Nima bajardingiz va nimani yaxshilaysiz?
        <textarea id="goalsNote" rows="5" maxlength="2000" placeholder="Bugungi natijalar, xatolar va ertangi reja…">${safe(current.note||'')}</textarea></label>
      </div></section>
      <footer class="goals-footer"><span id="goalsSaveStatus" role="status">${safe(message)}</span><span>🔒 Faqat tasdiqlangan shaxsiy hisob uchun</span></footer>
    </div>`;
    document.dispatchEvent(new CustomEvent('vivid-goals:rendered',{detail:{day:selected}}));
  }

  function init(){
    updateMenu();
    pulseTimer=setInterval(updateMenu,1200);
    document.addEventListener('click',e=>{
      if(e.target.closest('#'+NAV_ID)){e.preventDefault();open();return;}
      if(e.target.closest('#primaryNav [data-view]')){visible=false;document.getElementById(NAV_ID)?.classList.remove('active');}
    },true);
    document.addEventListener('change',e=>{
      if(!visible || !e.target.closest('#vividGoalsPage') || !isOwnerSession()) return;
      const t=e.target;
      if(t.id==='goalsSelectedDate'){
        const next=String(t.value||'');
        if(/^\d{4}-\d{2}-\d{2}$/.test(next)){selected=next;render();}
      } else if(t.hasAttribute('data-goal-check')) mark(selected,t.dataset.goalCheck,t.checked);
      else if(t.hasAttribute('data-goal-milestone')){
        state.milestones[t.dataset.goalMilestone]=t.checked;
        state.milestonesUpdatedAt=new Date().toISOString();changed();render();
      }else if(t.hasAttribute('data-goal-count')){
        dayState(selected).counts[t.dataset.goalCount]=Math.floor(nval(t.value));
        changed(selected);render();
      }else if(t.id==='goalsHours'){
        dayState(selected).hours=t.value===''?'':Math.min(24,Math.max(0,Number(t.value)||0));
        changed(selected);
      }
    });
    let noteTimer=null;
    document.addEventListener('input',e=>{
      if(!visible || e.target.id!=='goalsNote' || !e.target.closest('#vividGoalsPage') || !isOwnerSession()) return;
      const value=e.target.value.slice(0,2000),day=selected;
      dayState(day).note=value;
      clearTimeout(noteTimer);
      noteTimer=setTimeout(()=>changed(day),450);
    });
    window.addEventListener('online',()=>{if(dirty)flush();});
    window.addEventListener('pagehide',()=>{if(dirty)cache();});
  }

  window.VividGoals = {
    get:()=>visible&&isOwnerSession()?JSON.parse(JSON.stringify(state)):null,
    getDay:()=>selected,
    getTasks:()=>TASKS.map(t=>({...t})),
    getGroups:()=>GROUPS.map(g=>({...g,tasks:g.tasks.map(t=>({...t}))})),
    isOpen:()=>visible&&isOwnerSession(),
    saveExtras:fn=>{
      if(!visible||!isOwnerSession()||typeof fn!=='function')return false;
      if(!state.extras||typeof state.extras!=='object')state.extras={};
      fn(state.extras,state);
      state.extrasUpdatedAt=new Date().toISOString();changed();render();return true;
    },
    saveDay:(day,fn)=>{
      if(!visible||!isOwnerSession()||typeof fn!=='function'||!/^\d{4}-\d{2}-\d{2}$/.test(day))return false;
      fn(dayState(day),state);changed(day);render();return true;
    },
    refresh:()=>{if(visible)render();}
  };
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',init,{once:true});
  else init();
})();