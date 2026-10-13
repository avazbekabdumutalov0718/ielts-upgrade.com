/* VIVID IELTS — Articles collocation games with the same full-screen-style UX as O'yinlar. */
(function(){
'use strict';
const names=['Flashcards','Multiple choice','Matching pairs','Fill the gap','Word Rush','Typing race','Sentence builder'];
const escapeHtml=v=>String(v==null?'':v).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;','\'':'&#39;'}[c]));
const normalize=v=>String(v||'').toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?;:]+$/,'').replace(/\s+/g,' ').trim();
const shuffle=items=>items.map(v=>({v,r:Math.random()})).sort((a,b)=>a.r-b.r).map(x=>x.v);
const el=(root,selector)=>root.querySelector(selector);
const all=(root,selector)=>Array.from(root.querySelectorAll(selector));
let current=null;
function say(value){
 if(!('speechSynthesis' in window))return;
 window.speechSynthesis.cancel();
 const u=new SpeechSynthesisUtterance(String(value||''));
 u.lang='en-US';u.rate=.88;
 window.speechSynthesis.speak(u);
}
function blankExample(item){
 const source=String(item?.gap||item?.e||'').trim();
 const phrase=String(item?.w||'').trim();
 if(!source||!phrase)return '';
 const escaped=phrase.replace(/[.*+?^$(){}|[\]\\]/g,'\\$&');
 const rx=new RegExp(escaped,'gi');
 if(!rx.test(source))return source.includes('________')?source:'';
 return source.replace(rx,'________');
}
function buildArticleContexts(entries,paragraphs){
 const sentences=[];
 for(const par of Array.isArray(paragraphs)?paragraphs:[]){
  const text=String(par||'').replace(/\s+/g,' ').trim();
  for(const sentence of text.split(/(?<=[.!?])\s+/)){
   const clean=sentence.trim();
   if(clean.length>=26&&clean.length<=245&&/[a-z].*[a-z]/i.test(clean))sentences.push(clean);
  }
 }
 const used=new Set();
 for(const word of entries){
  const phrase=String(word.w||'').toLowerCase();
  const invalidPhrase=/[,;:!?]/.test(phrase)||!/[a-z]{2}/.test(phrase);
  const own=String(word.e||'').trim();
  const candidates=(invalidPhrase?[]:[...sentences,own])
     .filter(x=>x.length>=26&&x.length<=245&&x.toLowerCase().includes(phrase))
     .sort((a,b)=>a.length-b.length);
  let chosen='';
  for(const example of candidates){
   const key=example.toLowerCase().replace(/\s+/g,' ').trim();
   if(!used.has(key)){used.add(key);chosen=example;break;}
  }
  word.gap=chosen?chosen:'Harf mashqi: '+word.w.split(/\s+/).map(p=>p[0]+'________').join('  ');
 }
}
function hint(item){
 return item.u||blankExample(item)||('Inglizcha ibora: '+item.w.charAt(0)+'…');
}
function stopTimer(){
 if(current&&current.timer){clearInterval(current.timer);current.timer=null;}
}
function dispose(){
 stopTimer();
 if('speechSynthesis' in window)window.speechSynthesis.cancel();
 if(current){
  const a=current.section;
  if(a&&a.isConnected){
   a.classList.remove('ar-game-open');
   const heading=el(a,'.ar-games-heading'),grid=el(a,'.ar-game-grid'),screen=el(a,'#ar-game-play');
   if(heading)heading.hidden=false;
   if(grid)grid.hidden=false;
   if(screen){screen.hidden=true;screen.innerHTML='';}
  }
 }
 current=null;
}
function launch(options){
 dispose();
 const section=options.section;
 if(!section||!section.isConnected)return;
 const rows=(options.entries||[]).filter(x=>x&&String(x.w||'').trim());
 const seen=new Set();
 const entries=rows.filter(x=>{const key=normalize(x.w);if(seen.has(key))return false;seen.add(key);return true})
   .map((x,i)=>({id:i,w:String(x.w||'').trim(),u:String(x.u||'').trim(),e:String(x.e||'').trim()}));
 if(!entries.length){const slot=el(section,'#ar-game-play');if(slot){slot.hidden=false;slot.textContent='Bu maqolada hozircha collocation mavjud emas.';}return;}
 const mode=Number(options.mode);
 if(!Number.isInteger(mode)||mode<0||mode>6)return;
 buildArticleContexts(entries,options.paragraphs);
 const old=options.getState?.()||{};
 const validIds=entries.map(x=>x.id);
 const done=new Set(Array.isArray(old.done)?old.done.filter(x=>validIds.includes(x)):[]);
 const fresh=done.size>=entries.length;
 const s={
  section,mode,entries,done:fresh?new Set():done,correct:fresh?0:Math.min(Number(old.correct)||0,done.size),
  best:Math.max(0,Number(old.best)||0),attempts:Math.max(0,Number(old.attempts)||0),
  getState:options.getState,setState:options.setState,timer:null,time:60,finished:false,
  wrong:0,selected:null,pairPack:null,chosen:[],flipped:false,locked:false
 };
 current=s;
 const heading=el(section,'.ar-games-heading'),grid=el(section,'.ar-game-grid'),screen=el(section,'#ar-game-play');
 if(heading)heading.hidden=true;
 if(grid)grid.hidden=true;
 if(!screen)return;
 screen.hidden=false;section.classList.add('ar-game-open');
 section.scrollIntoView({behavior:'smooth',block:'start'});
 if(mode===4){
  s.timer=setInterval(()=>{
   if(current!==s||s.finished){stopTimer();return;}
   s.time=Math.max(0,s.time-1);
   const clock=el(screen,'#ar-play-timer');if(clock)clock.textContent='⏳ '+s.time+' s';
   if(s.time<=0)finish(s);
  },1000);
 }
 show(s);
}
function save(s){
 const obj={done:Array.from(s.done),correct:s.correct,best:s.best,attempts:s.attempts};
 s.setState?.(obj);
}
function record(s,item,ok){
 if(!item||s.done.has(item.id))return;
 s.done.add(item.id);
 if(ok)s.correct++;
 else s.wrong++;
 save(s);
}
function show(s){
 if(current!==s)return;
 if(s.done.size>=s.entries.length){finish(s);return;}
 const screen=el(s.section,'#ar-game-play');
 if(!screen)return;
 const count=s.done.size;
 const percent=(count/s.entries.length*100).toFixed(2);
 screen.innerHTML='<div class="ar-game-screen">'+
   '<div class="ar-play-header">'+
   '<div><div class="ar-play-eyebrow">VIVID IELTS / ARTICLES / O‘YIN</div><h2>'+names[s.mode]+'</h2></div>'+
   '<div class="ar-play-actions"><span class="ar-play-stats">'+s.correct+' to‘g‘ri · '+(count+1)+' / '+s.entries.length+'</span><button type="button" id="ar-play-back">← Orqaga</button><button type="button" class="ar-play-exit" id="ar-play-exit">✕ Chiqish</button></div>'+
   '</div><div class="ar-play-progress"><span style="width:'+percent+'%"></span></div>'+
   (s.mode===4?'<div class="ar-play-clock" id="ar-play-timer">⏳ '+s.time+' s</div>':'')+
   '<div id="ar-play-round"></div>'+
   '</div>';
 el(screen,'#ar-play-back').onclick=dispose;
 el(screen,'#ar-play-exit').onclick=dispose;
 if(s.mode===0)showFlash(s);
 else if(s.mode===1||s.mode===4)showChoice(s);
 else if(s.mode===2)showPairs(s);
 else if(s.mode===3||s.mode===5)showInput(s);
 else showBuilder(s);
}
function remaining(s){return s.entries.filter(item=>!s.done.has(item.id));}
function roundBox(s,markup){
 const slot=el(s.section,'#ar-play-round');
 if(slot)slot.innerHTML=markup;
 return slot;
}
function showFlash(s){
 const word=remaining(s)[0];
 s.flipped=false;
 const draw=()=>{
  const side=s.flipped;
  const content=side?(word.u||'Bu iboraning tasdiqlangan tarjimasi hali kiritilmagan') : word.w;
  const secondary=side?'Bu kartada faqat ma’no beriladi; gapli mashqlar boshqa o‘yinlarda alohida bo‘ladi.':'🔊 Talaffuz tugmasini bosing';
  const box=roundBox(s,
   '<div class="ar-flash-layout">'+
   '<button type="button" id="ar-flash-card" class="ar-flash-card'+(side?' is-flipped':'')+'" aria-label="Kartani aylantirish">'+
   '<span class="ar-flash-caption">'+(side?'O‘ZBEKCHA MA’NO / CONTEXT':'INGLIZCHA SO‘Z / IBORA')+'</span>'+
   '<strong>'+escapeHtml(content)+'</strong><span class="ar-flash-description">'+escapeHtml(secondary)+'</span>'+
   '<span class="ar-flash-rotate">Bosib '+(side?'oldini':'orqasini')+' ko‘ring ↗</span></button>'+
   '<div class="ar-flash-under"><button type="button" class="ar-speaker" id="ar-flash-say">🔊 Talaffuz</button><span>'+(s.done.size+1)+' / '+s.entries.length+'</span></div>'+
   '<div class="ar-flash-controls"><button type="button" class="ar-control-learn" id="ar-flash-learn">↺ Hali o‘rganaman</button><button type="button" class="ar-control-flip" id="ar-flash-rotate">Aylantirish</button><button type="button" class="ar-control-know" id="ar-flash-know">Bilaman ✓</button></div></div>');
  el(box,'#ar-flash-card').onclick=()=>{s.flipped=!s.flipped;draw()};
  el(box,'#ar-flash-rotate').onclick=()=>{s.flipped=!s.flipped;draw()};
  el(box,'#ar-flash-say').onclick=()=>say(word.w);
  el(box,'#ar-flash-know').onclick=()=>{record(s,word,true);show(s)};
  el(box,'#ar-flash-learn').onclick=()=>{record(s,word,false);show(s)};
 };
 draw();
}

function pickOptions(s,word,useUzbek){
 const others=s.entries.filter(x=>x.id!==word.id&&(!useUzbek||x.u)&&(!useUzbek||normalize(x.u)!==normalize(word.u)));
 return shuffle([word,...shuffle(others).slice(0,3)]);
}
function morphologyClue(word,mode){
 const parts=word.w.match(/[A-Za-z]+/g)||[];
 const size=parts.reduce((n,x)=>n+x.length,0);
 if(mode===1)return 'Ibora '+parts.length+' ta so‘z va jami '+size+' ta harfdan iborat. So‘zlarining bosh harflari: '+parts.map(x=>x[0].toUpperCase()).join(' – ')+'.';
 if(mode===4)return 'Tezlik sinovi: '+parts.length+' ta so‘zli ibora, so‘z uzunliklari '+parts.map(x=>x.length).join(' / ')+'. Mos variantni tanlang.';
 return parts.map(x=>x[0].toUpperCase()+' '+('_'.repeat(Math.max(1,x.length-1)))).join('   ');
}
function showChoice(s){
 const word=remaining(s)[0];
 const isRush=s.mode===4;
 const translations=s.entries.filter(x=>x.u);
 const distractorTranslations=new Set(translations.filter(x=>x.id!==word.id).map(x=>normalize(x.u)).filter(x=>x!==normalize(word.u)));
 const canMeanings=!isRush&&!!word.u&&distractorTranslations.size>=3;
 const hasReverseMeaning=isRush&&!!word.u;
 const options=pickOptions(s,word,canMeanings);
 if(options.length!==4){
  roundBox(s,'<div class="ar-question-card"><p class="ar-question-help">Ushbu mashq uchun to‘rtta turli collocation kerak.</p></div>');
  return;
 }
 const prompt=canMeanings?word.w:hasReverseMeaning?word.u:morphologyClue(word,s.mode);
 const label=canMeanings?'Ibora ma’nosini to‘rtta tarjimadan toping.':hasReverseMeaning?'O‘zbekcha ma’noga mos inglizcha iborani tez tanlang.':'To‘rtta variantdan berilgan imlo belgisiga mos iborani toping.';
 const answerText=canMeanings?word.u:word.w;
 const choices=options.map((o,i)=>'<button type="button" class="ar-choice-option" data-choice="'+i+'">'+escapeHtml(canMeanings?o.u:o.w)+'</button>').join('');
 const box=roundBox(s,'<div class="ar-question-card"><div class="ar-question-label">'+(isRush?'⚡ Word Rush':'☑ Multiple choice')+'</div><p class="ar-question-help">'+label+'</p><div class="ar-question-text">'+escapeHtml(prompt)+'</div><div class="ar-choice-grid">'+choices+'</div><div class="ar-feedback" id="ar-play-feedback" aria-live="polite"></div><button type="button" class="ar-next-question" id="ar-next-question" hidden>Keyingisi →</button></div>');
 s.locked=false;
 all(box,'[data-choice]').forEach(button=>button.onclick=()=>{
  if(s.locked)return;
  s.locked=true;
  const chosen=options[Number(button.dataset.choice)];
  const ok=chosen.id===word.id;
  record(s,word,ok);
  all(box,'[data-choice]').forEach(b=>{
   b.disabled=true;
   if(options[Number(b.dataset.choice)].id===word.id)b.classList.add('is-correct');
  });
  if(!ok)button.classList.add('is-wrong');
  el(box,'#ar-play-feedback').textContent=ok?'✓ To‘g‘ri!':'✗ To‘g‘ri javob: '+answerText;
  const next=el(box,'#ar-next-question');next.hidden=false;
  next.textContent=s.done.size>=s.entries.length?'Natijani ko‘rish →':'Keyingisi →';
  next.onclick=()=>show(s);
 });
}
function showPairs(s){
 const pack=remaining(s).slice(0,5);
 if(!pack.length){finish(s);return;}
 const rights=shuffle(pack);
 const left=pack.map(x=>'<button type="button" data-left="'+x.id+'">'+escapeHtml(x.w)+'</button>').join('');
 const right=rights.map(x=>'<button type="button" data-right="'+x.id+'">'+escapeHtml(x.u||('Imlo belgisi: '+morphologyClue(x,1)))+'</button>').join('');
 const box=roundBox(s,'<div class="ar-question-card"><div class="ar-question-label">⌘ Matching pairs</div><p class="ar-question-help">Chapdagi collocation’ni o‘ngdagi tarjima yoki so‘z tuzilishi haqidagi belgi bilan juftlang.</p><div class="ar-pair-labels"><span>English</span><span>Uzbek / Context</span></div><div class="ar-modern-pairs"><div>'+left+'</div><div>'+right+'</div></div><p class="ar-pair-counter" id="ar-pair-counter">0 / '+pack.length+' juftlik</p><div class="ar-feedback" id="ar-play-feedback" aria-live="polite"></div></div>');
 let selected=null,matched=0;
 all(box,'[data-left]').forEach(b=>b.onclick=()=>{
  if(b.disabled)return;
  selected=Number(b.dataset.left);
  all(box,'[data-left]').forEach(x=>x.classList.remove('is-selected'));
  b.classList.add('is-selected');
 });
 all(box,'[data-right]').forEach(b=>b.onclick=()=>{
  if(b.disabled||selected===null)return;
  const picked=Number(b.dataset.right);
  if(picked===selected){
   const item=pack.find(x=>x.id===picked);
   record(s,item,true);matched++;
   b.disabled=true;b.classList.add('is-matched');
   const original=el(box,'[data-left="'+selected+'"]');
   original.disabled=true;original.classList.add('is-matched');original.classList.remove('is-selected');
   el(box,'#ar-pair-counter').textContent=matched+' / '+pack.length+' juftlik';
   el(box,'#ar-play-feedback').textContent='✓ To‘g‘ri juftlik!';
   if(matched===pack.length){
    const next=document.createElement('button');
    next.className='ar-next-question';next.textContent=s.done.size>=s.entries.length?'Natijani ko‘rish →':'Keyingi juftliklar →';
    next.onclick=()=>show(s);box.appendChild(next);
   }
  }else{
   el(box,'#ar-play-feedback').textContent='Bu juftlik mos emas, qayta urinib ko‘ring.';
  }
  selected=null;all(box,'[data-left]').forEach(x=>x.classList.remove('is-selected'));
 });
}
function showInput(s){
 s.locked=false;
 const word=remaining(s)[0];
 const prompt=s.mode===3?(blankExample(word)||('Harf mashqi: '+morphologyClue(word,3))):(word.u?('Ma’nosi: '+word.u+' · Bosh harflar: '+morphologyClue(word,3)):morphologyClue(word,3));
 const caption=s.mode===3?'Maqoladagi gapni to‘ldiring':'Collocation’ni ingliz tilida yozing';
 const box=roundBox(s,'<div class="ar-question-card"><div class="ar-question-label">'+(s.mode===3?'✎ Fill the gap':'⌨ Typing race')+'</div><p class="ar-question-help">'+caption+'</p><div class="ar-question-text">'+escapeHtml(prompt)+'</div><form id="ar-game-form" class="ar-type-form"><input id="ar-game-input" required autocomplete="off" spellcheck="false" placeholder="Inglizcha iborani yozing" aria-label="Javob"><button type="submit">Tekshirish</button></form><div class="ar-feedback" id="ar-play-feedback" aria-live="polite"></div><button type="button" class="ar-next-question" id="ar-next-question" hidden>Keyingisi →</button></div>');
 el(box,'#ar-game-form').onsubmit=ev=>{
  ev.preventDefault();
  if(s.locked)return;
  const input=el(box,'#ar-game-input');
  if(!input.value.trim())return;
  s.locked=true;
  const ok=normalize(input.value)===normalize(word.w);
  record(s,word,ok);
  input.disabled=true;el(box,'#ar-game-form button').disabled=true;
  el(box,'#ar-play-feedback').textContent=ok?'✓ To‘g‘ri!':'✗ To‘g‘ri javob: '+word.w;
  const next=el(box,'#ar-next-question');next.hidden=false;next.onclick=()=>show(s);
 };
 el(box,'#ar-game-input').focus({preventScroll:true});
}
function showBuilder(s){
 s.locked=false;
 const word=remaining(s)[0];
 const phraseParts=word.w.split(/\s+/).filter(Boolean);
 const byLetters=phraseParts.length===1;
 const tokens=byLetters?Array.from(word.w):phraseParts;
 const scrambled=shuffle(tokens.map((t,i)=>({t,i})));
 const box=roundBox(s,'<div class="ar-question-card"><div class="ar-question-label">▤ Sentence builder</div><p class="ar-question-help">So‘zlarni to‘g‘ri tartibda joylashtirib, collocation hosil qiling.</p>'+
  '<div class="ar-question-text">'+escapeHtml(word.u||(byLetters?'Harflarni to‘g‘ri tartibga keltiring.':('Ibora '+tokens.length+' ta so‘zdan tuzilgan. So‘zlarni tartib bilan joylashtiring.')))+'</div><div class="ar-builder-answer" id="ar-builder-answer">So‘zlarni tanlang...</div>'+
  '<div class="ar-builder-bank">'+scrambled.map(x=>'<button type="button" data-token="'+x.i+'">'+escapeHtml(x.t)+'</button>').join('')+'</div>'+
  '<div class="ar-builder-controls"><button type="button" id="ar-builder-clear">↺ Boshidan</button><button type="button" id="ar-builder-check">Tekshirish</button></div><div class="ar-feedback" id="ar-play-feedback" aria-live="polite"></div><button type="button" class="ar-next-question" id="ar-next-question" hidden>Keyingisi →</button></div>');
 let selected=[];
 function update(){
  el(box,'#ar-builder-answer').textContent=selected.length?selected.map(i=>tokens[i]).join(byLetters?'':' '):(byLetters?'Harflarni tanlang...':'So‘zlarni tanlang...');
  all(box,'[data-token]').forEach(b=>b.disabled=selected.includes(Number(b.dataset.token))||s.locked);
 }
 all(box,'[data-token]').forEach(b=>b.onclick=()=>{selected.push(Number(b.dataset.token));update()});
 el(box,'#ar-builder-clear').onclick=()=>{selected=[];update()};
 el(box,'#ar-builder-check').onclick=()=>{
  if(s.locked||selected.length!==tokens.length){el(box,'#ar-play-feedback').textContent='Avval barcha so‘zlarni joylashtiring.';return}
  s.locked=true;
  const ok=selected.map(i=>tokens[i]).join(byLetters?'':' ')===tokens.join(byLetters?'':' ');
  record(s,word,ok);
  el(box,'#ar-play-feedback').textContent=ok?'✓ To‘g‘ri!':'✗ To‘g‘ri tartib: '+word.w;
  el(box,'#ar-builder-check').disabled=true;el(box,'#ar-builder-clear').disabled=true;
  const next=el(box,'#ar-next-question');next.hidden=false;next.onclick=()=>{s.locked=false;show(s)};
  update();
 };
}
function finish(s){
 if(current!==s||s.finished)return;
 s.finished=true;stopTimer();
 s.best=Math.max(s.best,s.correct);s.attempts++;save(s);
 const box=el(s.section,'#ar-game-play');
 if(!box)return;
 const total=s.entries.length;
 box.innerHTML='<div class="ar-game-screen ar-game-finish"><div class="ar-play-eyebrow">VIVID IELTS / ARTICLES / NATIJA</div><div class="ar-result-icon">🏆</div><h2>'+names[s.mode]+' — yakunlandi</h2><p>'+s.correct+' / '+total+' ta collocation to‘g‘ri</p><div class="ar-result-score">'+Math.round(s.correct/total*100)+'%</div><div class="ar-result-actions"><button type="button" id="ar-game-again">↺ Qayta o‘ynash</button><button type="button" id="ar-game-to-list">← O‘yinlarga qaytish</button></div></div>';
 el(box,'#ar-game-again').onclick=()=>{
  s.setState?.({done:[],correct:0,best:s.best,attempts:s.attempts});
  launch({section:s.section,mode:s.mode,entries:s.entries,getState:s.getState,setState:s.setState});
 };
 el(box,'#ar-game-to-list').onclick=dispose;
}
window.VividArticleGames={launch,dispose};
})();
