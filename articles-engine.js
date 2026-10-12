/* VIVID Articles — isolated five-step guided reading workflow */
(() => {
'use strict';
const qs=(s,root=document)=>root.querySelector(s), qsa=(s,root=document)=>[...root.querySelectorAll(s)];
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replace(/[’‘]/g,"'").trim();
const STORE='vivid_articles_progress_v2', DICT='vivid_articles_translations_v2', CACHE='vivid_articles_import_v1';
const levels=['B1','B2','C1','C2'];const stageNames=['Read','Highlight','Translate','Review','Speed reading'];
const gameTitles=['Flashcards','Match','Translation typing','Gap fill','Listen & choose','Multiple choice','Speed rush'];
let db=[],glossary={},translations={},active=null,stage=1,block=0,kind='all',level='all',query='',tip=null,mouse={x:0,y:0},stopwatch=0,running=false,ticker=null,activeGame=null,gateIndex=-1,gateScores=[],chosenAnswers={};
let progress={};
try{progress=JSON.parse(localStorage.getItem(STORE)||'{}')}catch{}
try{translations=JSON.parse(localStorage.getItem(DICT)||'{}')}catch{}
const save=()=>{try{localStorage.setItem(STORE,JSON.stringify(progress))}catch{}};
function rec(){if(!active)return {};return progress[active.id]||(progress[active.id]={stage:1,cart:[],highlights:[],summary:'',complete:false});}
const persist=()=>{save();};
const host=()=>qs('#mainContent');
function notify(message){let a=qs('#toast');if(a){a.textContent=message;a.classList.add('show');setTimeout(()=>a.classList.remove('show'),2600)}}
function formatLevel(v){return '<span class="ar-level ar-'+E(v||'B2')+'">'+E(v||'B2')+'</span>'}
function wordsOf(s){return String(s||'').match(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g)||[]}
function sanitizeTitle(t){return E(String(t||'').replace(/@\w+(?:[-_]\w+)*/g,'').replace(/\s+/g,' ').trim())}
function localText(text){let w=norm(text).replace(/^[^a-z]+|[^a-z]+$/g,'');if(!w)return '';if(translations[w])return translations[w];if(glossary[w])return glossary[w];let bases=[w.replace(/ies$/,'y'),w.replace(/ing$/,''),w.replace(/ing$/,'e'),w.replace(/ed$/,''),w.replace(/ed$/,'e'),w.replace(/es$/,''),w.replace(/s$/,'')];for(const b of bases)if(b&&b.length>2&&(glossary[b]||translations[b]))return translations[b]||glossary[b];return ''}
async function translate(w){let k=norm(w);let t=localText(k);if(t)return t;try{const r=await fetch('/api/article-translate?word='+encodeURIComponent(w.slice(0,120)));if(!r.ok)throw Error('translation unavailable');let j=await r.json();const value=String(j.translations?.[w]||'').trim();if(!value||norm(value)===norm(w))throw Error('untranslated');translations[k]=value;try{localStorage.setItem(DICT,JSON.stringify(translations))}catch{}return value}catch{return ''}}
function cleanContent(rows){return Array.isArray(rows)?rows.filter(x=>x&&typeof x==='object'&&Array.isArray(x.body)).map(x=>({...x,title:String(x.title||'Untitled'),kind:x.kind==='magazine'?'magazine':'article',level:levels.includes(x.level)?x.level:'B2'})):[]}
async function initData(){
 try{const r=await fetch('articles-glossary.json?v=1');if(r.ok)glossary=(await r.json()).translations||{}}catch{}
 try{const r=await fetch('articles-data.json?v=1');if(r.ok){db=cleanContent((await r.json()).articles);if(db.length)return}}catch{}
 // User can locally import the prepared article data while the GitHub upload is pending.
 try{const raw=localStorage.getItem(CACHE);if(raw)db=cleanContent(JSON.parse(raw).articles)}catch{}
}
function buildIndex(){
 const magazine=db.filter(a=>a.kind==='magazine'),articles=db.filter(a=>a.kind==='article');
 const cards=arr=>arr.map(a=>{const p=progress[a.id]||{};return '<button class="ar-article" data-open="'+E(a.id)+'"><span class="ar-card-row">'+formatLevel(a.level)+'<small>'+E(a.words||0)+' words · '+E(a.pages||1)+' pages</small></span><strong>'+sanitizeTitle(a.title)+'</strong><span class="ar-article-footer">'+(p.complete?'✓ Completed':p.stage?'Continue step '+p.stage:'Start reading')+' <span aria-hidden="true">→</span></span></button>'}).join('');
 const filtered=articles.filter(a=>(level==='all'||a.level===level)&&(!query||norm(a.title).includes(norm(query))));
 const mags=magazine.filter(a=>(level==='all'||a.level===level)&&(!query||norm(a.title).includes(norm(query))));
 return '<section class="ar-shell"><div class="ar-header"><div><p class="ar-overline">SPEAKING & VOCAB · READING LIBRARY</p><h1>Articles</h1><p>Read, highlight, learn vocabulary and practise speaking & writing expressions through five stages.</p></div><div class="ar-counter"><b>'+articles.length+'</b><span>Articles</span><b>'+magazine.length+'</b><span>New Scientist issues</span></div></div>'+
 '<div class="ar-filterbar"><label>CEFR <select id="ar-level"><option value="all">All levels</option>'+levels.map(l=>'<option value="'+l+'"'+(level===l?' selected':'')+'>'+l+'</option>').join('')+'</select></label><label>Find an article <input id="ar-search" type="search" value="'+E(query)+'" placeholder="Search titles..."></label><label class="ar-import">Import article library<input id="ar-import" type="file" accept=".json,application/json"></label></div>'+
 (db.length?'':'<div class="ar-empty"><h2>Article data is not published yet</h2><p>Upload <code>articles-data.json</code> to the GitHub repository root, or import that JSON file here to read in this browser. A catalog without the original texts would be misleading.</p></div>')+
 '<h2 class="ar-section-title">New Scientist · 10 separate issues <small>'+mags.length+'</small></h2><p class="ar-subnote">These PDFs are complete magazine issues rather than individual articles. Their reading level is estimated, not an official CEFR rating.</p><div class="ar-grid">'+cards(mags)+'</div>'+
 '<h2 class="ar-section-title">100 articles · sorted by level <small>'+filtered.length+'</small></h2><div class="ar-grid">'+cards([...filtered].sort((a,b)=>levels.indexOf(a.level)-levels.indexOf(b.level)))+'</div></section>';
}
function ensureHost(){if(!host())return;host().innerHTML=active?renderArticle():buildIndex();wire();}
function tokenMarkup(par,pi){
 const clickable=stage===2||stage===3;
 if(!clickable)return E(par);
 const rx=/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g;let out='',pos=0,m,j=0;
 while((m=rx.exec(par))){out+=E(par.slice(pos,m.index));const tag=stage===3?'button':'span',attrs=stage===3?'type="button" tabindex="0" data-word="'+E(m[0])+'"':'';
 out+='<'+tag+' '+attrs+' class="ar-word'+(stage===2&&rec().highlights.includes(pi+':'+j)?' ar-highlighted':'')+'" data-hkey="'+pi+':'+j+'">'+E(m[0])+'</'+tag+'>';pos=rx.lastIndex;j++}
 return out+E(par.slice(pos));
}
function listChunks(){const all=active?.body||[];const size=active.kind==='magazine'?14:40;const max=Math.max(0,Math.ceil(all.length/size)-1);block=Math.min(block,max);return {start:block*size,end:Math.min(all.length,(block+1)*size),pages:max+1}}
function readingMarkup(){
 const c=listChunks(),body=(active.body||[]).slice(c.start,c.end);
 return '<div class="ar-page-meter"><span>Reading section '+(block+1)+' / '+c.pages+'</span><span>'+E(active.words||0)+' original words</span></div>'+
 '<article id="ar-original" class="ar-reading'+(stage===5?' ar-speed':'')+'">'+body.map((p,i)=>'<p class="ar-paragraph" data-par="'+(c.start+i)+'">'+tokenMarkup(String(p),c.start+i)+'</p>').join('')+'</article>'+
 (c.pages>1?'<div class="ar-pager"><button data-page="-1" '+(!block?'disabled':'')+'>← Previous pages</button><span>'+(block+1)+' / '+c.pages+'</span><button data-page="1" '+(block>=c.pages-1?'disabled':'')+'>Next pages →</button></div>':'');
}
function cartMarkup(){let c=rec().cart||[];return '<section class="ar-cart"><h3>🧺 Word basket · '+c.length+'</h3><p>Selected vocabulary from this article</p>'+(c.length?'<div class="ar-carts">'+c.map((x,i)=>'<div class="ar-basket-word"><b>'+E(x.w)+'</b><span>'+E(x.u||'Translation pending')+'</span><button data-remove="'+i+'" aria-label="Remove '+E(x.w)+'">×</button></div>').join('')+'</div>':'<p>No selected words yet. Choose words at Stage 3.</p>')+'</section>'}
function stageText(){
 return ['Just read the article without hints or translation.','Drag over words: the highlighter follows your pointer. Highlighting works only in Step 2.','Click any English word to see its Uzbek meaning, then add it to your basket.','Read the article again and review your word basket below.','Use the speed reader, write a summary, and finish the quizzes.'][stage-1]
}
function stepper(){return '<div class="ar-steps">'+stageNames.map((n,i)=>'<button class="'+(stage===i+1?'current ':'')+(i+1<=(rec().stage||1)?'unlocked':'')+'" data-stage="'+(i+1)+'"><b>'+(i+1)+'</b><span>'+n+'</span></button>').join('')+'</div>'}
function gateMarkup(){
 const basket=rec().cart||[];
 if(!basket.length)return '<p class="ar-warning">Select at least one word in Step 3 before the four practice games.</p>';
 const list=['Match English to Uzbek','Choose the right translation','Type the English phrase','Complete a sample sentence','Final word-basket quiz'];
 return '<section class="ar-gate"><h3>Four practice games + vocabulary quiz before Step 4</h3><p>Finish four different games and a final vocabulary quiz using the words in your own basket.</p><div class="ar-gate-list">'+list.map((s,i)=>'<button data-gate="'+i+'" '+(i>gateScores.length?'disabled':'')+'>'+(i<gateScores.length?'✓ ':'')+(i+1)+'. '+s+'</button>').join('')+'</div><div id="ar-gate-play"></div>'+(gateScores.length===5||rec().gateDone?'<button class="ar-primary" id="ar-unlock">Continue to Step 4 →</button>':'')+'</section>';
}
function collocMarkup(){
 let words=active.collocations||[];
 return '<section class="ar-collocations"><h2>Speaking & Writing · '+words.length+' expressions</h2><p>Expressions extracted from the actual article text. Click one to check its meaning or add it to your study basket.</p><div class="ar-colloc-grid">'+words.map((c,i)=>'<button data-colloc="'+i+'"><b>'+E(c.w)+'</b><span class="ar-colloc-meaning" data-colloc-meaning="'+i+'">'+E(c.u||localText(c.w)||'Tarjima yuklanmoqda…')+'</span><small>Example from article: '+E((c.e||'').slice(0,145))+'</small></button>').join('')+'</div><button data-game="5" class="ar-outline">Practise collocation quiz →</button></section>';
}
function gamesMarkup(){
 const n=(rec().cart?.length||0)+(active.collocations?.length||0);
 return '<section class="ar-games"><h2>7 learning games · '+n+' expressions</h2><p>The same word basket and article collocations are used across all seven games.</p><div class="ar-game-grid">'+gameTitles.map((t,i)=>'<button data-game="'+i+'"><span>0'+(i+1)+'</span><strong>'+t+'</strong></button>').join('')+'</div><div id="ar-game-play"></div></section>';
}
function speedMarkup(){return '<section class="ar-speedbox"><h2>⏱ Speed reading</h2><p>Start the clock and read the section at a steady pace. The result is approximate words per minute.</p><div class="ar-speed-controls"><button id="ar-timer">'+(running?'Pause':'Start')+'</button><button id="ar-reset">Reset</button><strong id="ar-time">'+Math.floor(stopwatch/60)+':'+String(stopwatch%60).padStart(2,'0')+'</strong><strong id="ar-wpm">'+(stopwatch?Math.round((active.words||0)/(stopwatch/60)):0)+' WPM*</strong></div><small>*WPM estimates are meaningful only after you have read the whole article.</small></section>'}
function questionMarkup(){
 let q=active.questions||{tf:[],mcq:[]}, tf=q.tf||[],mc=q.mcq||[];
 return '<section class="ar-questions"><h2>10 reading comprehension questions</h2><p>5 True/False statements and 5 multiple-choice checks. These questions were automatically generated from the source text; check the displayed evidence.</p>'+
 '<div class="ar-question-group"><h3>True / False</h3>'+tf.map((x,i)=>'<div class="ar-question"><p><b>'+(i+1)+'.</b> '+E(x.text)+'</p><label><input type="radio" name="tf-'+i+'" value="true" '+(chosenAnswers['tf'+i]==='true'?'checked':'')+'> True</label><label><input type="radio" name="tf-'+i+'" value="false" '+(chosenAnswers['tf'+i]==='false'?'checked':'')+'> False</label></div>').join('')+'</div>'+
 '<div class="ar-question-group"><h3>Multiple choice</h3>'+mc.map((x,i)=>'<div class="ar-question"><p><b>'+(i+6)+'.</b> '+E(x.text)+'</p>'+(x.options||[]).map((o,j)=>'<label><input type="radio" name="mc-'+i+'" value="'+j+'" '+(chosenAnswers['mc'+i]===String(j)?'checked':'')+'> '+E(o)+'</label>').join('')+'</div>').join('')+'</div><button id="ar-grade" class="ar-primary">Check answers</button><div id="ar-score"></div></section>';
}
function renderArticle(){
 let r=rec();return '<section class="ar-shell ar-study"><button id="ar-back" class="ar-back">← All articles</button><div class="ar-studytitle">'+formatLevel(active.level)+' <small>'+(active.kind==='magazine'?'NEW SCIENTIST MAGAZINE':'ARTICLE')+' · '+E(active.pages||1)+' pages</small><h1>'+sanitizeTitle(active.title)+'</h1></div>'+stepper()+
 '<div class="ar-stage-info"><h2>Step '+stage+' / 5 · '+stageNames[stage-1]+'</h2><p>'+stageText()+'</p></div>'+
 (stage===5?speedMarkup():'')+readingMarkup()+
 (stage===3?gateMarkup():'')+(stage===2?'<div id="ar-marker" hidden aria-hidden="true">🖍️</div>':'')+(stage>=4?cartMarkup():'')+
 (stage===5?'<section class="ar-summary"><h2>Write your own summary</h2><p>Explain the main idea, evidence and conclusion in English.</p><textarea id="ar-summary" rows="7" placeholder="The article explores...">'+E(r.summary||'')+'</textarea><span id="ar-summary-count">'+wordsOf(r.summary||'').length+' words</span></section>'+collocMarkup()+gamesMarkup()+questionMarkup():'')+
 '<div class="ar-stage-controls"><button id="ar-previous" '+(stage===1?'disabled':'')+'>← Previous stage</button><button id="ar-next" class="ar-primary" '+(stage===3&&!rec().gateDone?'disabled':'')+(stage===5?' hidden':'')+'>Next stage →</button></div></section>';
}
function closeTip(){if(tip){tip.remove();tip=null}}
function showTip(el,w,translationValue,collocation=false){
 closeTip();tip=document.createElement('aside');tip.className='ar-tooltip';tip.innerHTML='<strong>'+E(w)+'</strong><p>'+E(translationValue||'Translation not available yet')+'</p><button class="ar-primary" id="ar-add-word">🧺 Add to basket</button>'+(!translationValue?'<input id="ar-own-translation" placeholder="Enter Uzbek translation">':'');
 document.body.appendChild(tip);positionTip(el);
 qs('#ar-add-word',tip)?.addEventListener('click',()=>{
 const provided=qs('#ar-own-translation',tip)?.value.trim();
 const value=translationValue||provided;
 if(!value){notify('Please enter a translation or try again later.');return}
 const bag=rec().cart||(rec().cart=[]);if(!bag.some(c=>norm(c.w)===norm(w))){bag.push({w,u:value,e:collocation?el.dataset.example||'':el.closest('.ar-paragraph')?.textContent?.slice(0,270)||''});persist();notify(w+' added to your basket')}else notify('Already in the basket');
 if(stage>=4)ensureHost();else if(stage===3){const g=qs('.ar-gate');if(g)g.outerHTML=gateMarkup();wireGate()}
 closeTip();
 });
}
function positionTip(el){if(!tip)return;let x=mouse.x||el?.getBoundingClientRect().left||0,y=mouse.y||el?.getBoundingClientRect().bottom||0;x=Math.max(10,Math.min(window.innerWidth-295,x+10));y=Math.max(10,Math.min(window.innerHeight-175,y+14));tip.style.left=x+'px';tip.style.top=y+'px'}
async function clickWord(button,w,isColloc){mouse.x=button.getBoundingClientRect().left;mouse.y=button.getBoundingClientRect().bottom;showTip(button,w,localText(w),isColloc);let translated=await translate(w);if(!tip)return;showTip(button,w,translated,isColloc)}
async function hydrateCollocations(){
 if(!active||stage!==5)return;
 const entries=active.collocations||[];
 const wanted=entries.filter(c=>!c.u&&!localText(c.w)).slice(0,15);
 for(const e of entries)if(!e.u&&localText(e.w))e.u=localText(e.w);
 if(wanted.length) {
  try{
   const r=await fetch('/api/article-translate?words='+encodeURIComponent(wanted.map(c=>c.w).join('|')));
   if(r.ok){const data=await r.json();for(const e of wanted){const val=String(data.translations?.[e.w]||'').trim();if(val){e.u=val;translations[norm(e.w)]=val}}}
   try{localStorage.setItem(DICT,JSON.stringify(translations))}catch{}
  }catch{}
 }
 for(let i=0;i<entries.length;i++){
  const n=qs('[data-colloc-meaning="'+i+'"]');
  if(n)n.textContent=entries[i].u||localText(entries[i].w)||'Tarjimani ko‘rish uchun bosing';
 }
}
function setStage(next){
 if(next<1||next>5)return;
 if(next>Math.max(stage,rec().stage||1))return;
 if(stage===3&&next===4&&!rec().gateDone){notify('Finish the four basket games and vocabulary quiz first.');return}
 closeTip();stage=next;block=0;running=false;clearInterval(ticker);stopwatch=0;rec().stage=Math.max(rec().stage||1,next);persist();ensureHost();host()?.scrollIntoView({behavior:'smooth',block:'start'});
}
function startArticle(id){
 active=db.find(a=>a.id===id)||null;if(!active)return;stage=rec().stage||1;block=0;chosenAnswers={};gateScores=[...(rec().gateScores||[])];gateIndex=-1;stopwatch=0;running=false;clearInterval(ticker);history.replaceState(null,'','#articles/'+encodeURIComponent(id));ensureHost();host()?.scrollIntoView({block:'start'});
}
function gameWords(){let c=[...(rec().cart||[]),...(active?.collocations||[])];return c.filter(x=>x.w).map(x=>({w:x.w,u:x.u||localText(x.w)||'',e:x.e||''}))}
function gateRound(i){
 const bag=rec().cart||[];if(!bag.length)return;
 if(i===4){return finalBasketQuiz(bag)}
 gateIndex=i;let word=bag[i%bag.length],other=bag.filter(x=>x.w!==word.w);
 let box=qs('#ar-gate-play');if(!box)return;
 const opts=[word,...other.slice(0,3)];if(opts.length===1)opts.push({w:'not this word',u:'boshqa so‘z'});opts.sort((a,b)=>a.w.localeCompare(b.w));
 if(i===0||i===1)box.innerHTML='<div class="ar-round"><h4>'+(i===0?'Match the correct Uzbek meaning':'Choose the English collocation')+'</h4><p><strong>'+E(i===0?word.w:word.u)+'</strong></p>'+opts.map((o,j)=>'<button data-choice="'+j+'">'+E(i===0?o.u:o.w)+'</button>').join('')+'<div class="ar-round-status"></div></div>';
 else box.innerHTML='<div class="ar-round"><h4>'+(i===2?'Type the original English term':'Fill the collocation')+'</h4><p>'+E(i===2?word.u:(word.e||('This article contains '+word.w)).replace(word.w,'_____'))+'</p><input id="ar-round-input" placeholder="Type the English term"><button id="ar-round-check">Check</button><div class="ar-round-status"></div></div>';
 const finish=()=>{if(!gateScores.includes(i)){gateScores.push(i);rec().gateScores=[...gateScores];persist()}let done=qs('.ar-round-status',box);if(done)done.textContent='✓ Correct. Open the next game.';qsa('[data-gate]').forEach((b,k)=>{b.disabled=k>gateScores.length;if(k<gateScores.length)b.textContent='✓ '+b.textContent.replace(/^✓ /,'')});if(gateScores.length===5){rec().gateDone=true;persist();const section=qs('.ar-gate');section.outerHTML=gateMarkup();wireGate()}};
 qsa('[data-choice]',box).forEach(b=>b.onclick=()=>{let selected=opts[Number(b.dataset.choice)];if(selected?.w===word.w)finish();else qs('.ar-round-status',box).textContent='Try again'});
 qs('#ar-round-check',box)?.addEventListener('click',()=>{let answer=norm(qs('#ar-round-input',box)?.value);if(answer===norm(word.w))finish();else qs('.ar-round-status',box).textContent='Try again · Hint: '+word.w.slice(0,1)+'…'});
}

function finalBasketQuiz(bag){
 const box=qs('#ar-gate-play');if(!box)return;
 const pool=bag.filter(x=>x.w&&x.u);if(!pool.length)return;
 const count=Math.min(10,pool.length);let idx=0,score=0;const rows=pool.slice(0,count);
 function next(){
  if(idx===count){
   const pass=score/count>=0.6;
   box.innerHTML='<div class="ar-round"><h4>Word basket quiz</h4><p>'+score+' / '+count+' correct</p><p>'+(pass?'✓ Passed. Step 4 is unlocked.':'Score at least 60% to continue.')+'</p><button id="ar-requiz">Try quiz again</button></div>';
   qs('#ar-requiz',box).onclick=()=>finalBasketQuiz(bag);
   if(pass&&!gateScores.includes(4)){gateScores.push(4);rec().gateScores=[...gateScores];rec().gateDone=true;persist();let section=qs('.ar-gate');let html=box.innerHTML;section.outerHTML=gateMarkup();wireGate();qs('#ar-gate-play').innerHTML=html}
   return;
  }
  const row=rows[idx], reverse=idx%2===1,options=[row,...pool.filter(x=>x.w!==row.w).slice(0,3)];
  if(options.length===1)options.push({w:'Other word',u:'Boshqa tarjima'});
  options.sort((a,b)=>String(a.w).localeCompare(String(b.w)));
  box.innerHTML='<div class="ar-round"><h4>Quiz '+(idx+1)+' / '+count+'</h4><p>'+E(reverse?row.u:row.w)+'</p>'+options.map((x,j)=>'<button data-quiz-option="'+j+'">'+E(reverse?x.w:x.u)+'</button>').join('')+'<div class="ar-round-status"></div><button id="ar-quiz-next" hidden>Next →</button></div>';
  qsa('[data-quiz-option]',box).forEach(btn=>btn.onclick=()=>{
   const yes=options[Number(btn.dataset.quizOption)]?.w===row.w;if(yes)score++;
   qs('.ar-round-status',box).textContent=yes?'✓ Correct':'Correct: '+row.w+' — '+row.u;
   qsa('[data-quiz-option]',box).forEach(x=>x.disabled=true);qs('#ar-quiz-next',box).hidden=false
  });
  qs('#ar-quiz-next',box).onclick=()=>{idx++;next()};
 }
 next();
}
function wireGate(){qsa('[data-gate]').forEach(b=>b.onclick=()=>gateRound(Number(b.dataset.gate)));qs('#ar-unlock')?.addEventListener('click',()=>setStage(4))}
function openGame(mode){
 let pool=gameWords().filter(w=>w.u);
 let dest=qs('#ar-game-play');if(!dest)return;if(!pool.length){dest.innerHTML='<p>Get a translation for at least one word before playing.</p>';return}
 let index=0,score=0;const max=Math.min(10,pool.length);let order=[...pool].sort((a,b)=>norm(a.w).localeCompare(norm(b.w))).slice(0,max);
 function turn(){
  if(index>=max){dest.innerHTML='<div class="ar-round"><h3>Game completed</h3><p>Score: '+score+' / '+max+'</p><button id="ar-replay">Play again</button></div>';qs('#ar-replay',dest).onclick=()=>openGame(mode);return}
  let w=order[index],options=[w,...pool.filter(x=>norm(x.w)!==norm(w.w)).slice(0,3)].sort((a,b)=>a.w.localeCompare(b.w));
  let typing=mode===2||mode===3,reverse=mode===1||mode===6;
  const sentence=w.e||('Practice expression: '+w.w+'.');
  const prompt=mode===0?'Flashcard: reveal and say the meaning':mode===3?'Fill the missing expression in its source context':mode===4?'Listen and choose the Uzbek meaning':reverse?'Pick the correct English expression':'Choose the correct Uzbek translation';
  dest.innerHTML='<div class="ar-round"><h3>'+E(gameTitles[mode])+'</h3><p>'+(index+1)+' / '+max+' · '+E(prompt)+'</p><div class="ar-game-term">'+E(mode===0?w.w:mode===3?sentence.replace(w.w,'_____'):reverse?w.u:mode===2?w.u:w.w)+'</div>'+
  (typing?'<input id="ar-answer" placeholder="Type your answer"><button id="ar-submit">Check</button>':mode===0?'<button id="ar-reveal">Reveal translation</button>':'<div class="ar-options">'+options.map((o,j)=>'<button data-game-option="'+j+'">'+E(reverse?o.w:o.u)+'</button>').join('')+'</div>')+
  (mode===4?'<button id="ar-say">🔊 Listen</button>':'')+'<div class="ar-round-status"></div><button id="ar-next-game" hidden>Next →</button></div>';
  const finish=correct=>{score+=correct?1:0;qs('.ar-round-status',dest).textContent=(correct?'✓ Correct':'Answer: '+(reverse?w.w:w.u));qs('#ar-next-game',dest).hidden=false};
  qsa('[data-game-option]',dest).forEach(b=>b.onclick=()=>{let result=options[Number(b.dataset.gameOption)]?.w===w.w;finish(result);qsa('[data-game-option]',dest).forEach(x=>x.disabled=true)});
  qs('#ar-submit',dest)?.addEventListener('click',()=>finish(norm(qs('#ar-answer',dest)?.value)===norm(w.w)));
  qs('#ar-reveal',dest)?.addEventListener('click',()=>finish(true));
  qs('#ar-say',dest)?.addEventListener('click',()=>{if('speechSynthesis'in window){speechSynthesis.cancel();let u=new SpeechSynthesisUtterance(w.w);u.lang='en-US';speechSynthesis.speak(u)}});
  qs('#ar-next-game',dest)?.addEventListener('click',()=>{index++;turn()});
 }
 turn();dest.scrollIntoView({behavior:'smooth',block:'nearest'});
}
function wireArticle(){
 qs('#ar-back')?.addEventListener('click',()=>{active=null;closeTip();running=false;clearInterval(ticker);history.replaceState(null,'','#articles');ensureHost()});
 qsa('[data-stage]').forEach(b=>b.onclick=()=>setStage(Number(b.dataset.stage)));
 qs('#ar-previous')?.addEventListener('click',()=>setStage(stage-1));
 qs('#ar-next')?.addEventListener('click',()=>{if(stage!==3||rec().gateDone)setStage(stage+1)});
 qsa('[data-page]').forEach(b=>b.onclick=()=>{block+=Number(b.dataset.page);ensureHost()});
 if(stage===2){
  const area=qs('#ar-original');area?.addEventListener('mousemove',event=>{mouse={x:event.clientX,y:event.clientY};const marker=qs('#ar-marker');if(marker){marker.style.left=(event.clientX+13)+'px';marker.style.top=(event.clientY+13)+'px';marker.hidden=false}if(tip)positionTip(event.target)});
  area?.addEventListener('mouseleave',()=>{const marker=qs('#ar-marker');if(marker)marker.hidden=true});
  area?.addEventListener('mouseup',event=>{mouse={x:event.clientX,y:event.clientY};const sel=window.getSelection();if(!sel||sel.isCollapsed)return;let matches=qsa('.ar-word',area).filter(el=>sel.containsNode(el,true));if(!matches.length)return;const list=rec().highlights||[];for(let el of matches){let key=el.dataset.hkey;if(!list.includes(key))list.push(key);el.classList.add('ar-highlighted')}rec().highlights=list;persist();sel.removeAllRanges();notify(matches.length+' words highlighted')});
 }
 if(stage===3)qsa('[data-word]').forEach(b=>b.addEventListener('click',()=>clickWord(b,b.dataset.word,false)));
 if(stage>=4)qsa('[data-remove]').forEach(b=>b.addEventListener('click',()=>{rec().cart.splice(Number(b.dataset.remove),1);persist();ensureHost()}));
 if(stage===3)wireGate();
 if(stage===5){
  hydrateCollocations();
  qs('#ar-summary')?.addEventListener('input',e=>{rec().summary=e.target.value;persist();qs('#ar-summary-count').textContent=wordsOf(e.target.value).length+' words'});
  const updateTimer=()=>{let display=qs('#ar-time');if(display)display.textContent=Math.floor(stopwatch/60)+':'+String(stopwatch%60).padStart(2,'0');let out=qs('#ar-wpm');if(out)out.textContent=(stopwatch?Math.round((active.words||0)/(stopwatch/60)):0)+' WPM*'};
  qs('#ar-timer')?.addEventListener('click',()=>{running=!running;qs('#ar-timer').textContent=running?'Pause':'Start';clearInterval(ticker);if(running)ticker=setInterval(()=>{stopwatch++;updateTimer()},1000)});
  qs('#ar-reset')?.addEventListener('click',()=>{running=false;clearInterval(ticker);stopwatch=0;qs('#ar-timer').textContent='Start';updateTimer()});
  qsa('[data-colloc]').forEach(b=>b.onclick=()=>{let w=active.collocations[Number(b.dataset.colloc)];if(w){b.dataset.example=w.e||'';clickWord(b,w.w,true)}});
  qsa('[data-game]').forEach(b=>b.onclick=()=>openGame(Number(b.dataset.game)));
  qsa('.ar-questions input[type=radio]').forEach(inp=>inp.addEventListener('change',()=>{chosenAnswers[inp.name.replace('-','')]=inp.value}));
  qs('#ar-grade')?.addEventListener('click',()=>{
   const q=active.questions||{}, tf=q.tf||[],mc=q.mcq||[];let total=tf.length+mc.length,correct=0,lines=[];
   tf.forEach((x,i)=>{const v=chosenAnswers['tf'+i];const ok=v!==undefined&&String(x.answer)===v;if(ok)correct++;lines.push((ok?'✓ ':'✗ ')+(i+1)+': '+(x.answer?'True':'False')+' · Evidence: '+E(x.evidence||''))});
   mc.forEach((x,i)=>{const v=chosenAnswers['mc'+i];const ok=v!==undefined&&String(x.answer)===v;if(ok)correct++;lines.push((ok?'✓ ':'✗ ')+(i+6)+': '+E(x.options?.[x.answer]||'')+' · Evidence: '+E(x.evidence||''))});
   if(total){rec().complete=true;rec().score=correct;persist()}
   qs('#ar-score').innerHTML='<h3>'+correct+' / '+total+' correct</h3><details><summary>Review answers and source evidence</summary>'+lines.map(l=>'<p>'+l+'</p>').join('')+'</details>';
  });
 }
}
function wire(){
 if(active){wireArticle();return}
 qs('#ar-level')?.addEventListener('change',e=>{level=e.target.value;ensureHost()});
 qs('#ar-search')?.addEventListener('input',e=>{query=e.target.value;ensureHost();let i=qs('#ar-search');if(i){i.focus();i.setSelectionRange(query.length,query.length)}});
 qsa('[data-open]').forEach(b=>b.addEventListener('click',()=>startArticle(b.dataset.open)));
 qs('#ar-import')?.addEventListener('change',async event=>{let file=event.target.files?.[0];if(!file)return;try{const parsed=JSON.parse(await file.text());let list=cleanContent(parsed.articles);if(!list.length)throw Error('No articles array');db=list;try{localStorage.setItem(CACHE,JSON.stringify({articles:list}))}catch{notify('File imported, but local browser storage is full. Publish JSON on GitHub for permanence.')}ensureHost()}catch(e){notify('Not a valid articles-data.json file')}})
}
function activate(){
 if(!host())return;let path=decodeURIComponent(location.hash.replace(/^#/,''));let item=path.match(/^articles\/(.+)$/);
 if(item&&db.some(a=>a.id===item[1]))startArticle(item[1]);else{active=null;ensureHost()}
 qsa('#primaryNav [data-view]').forEach(b=>b.classList.toggle('active',b.dataset.view==='articles'));
}
document.addEventListener('mousemove',e=>{mouse={x:e.clientX,y:e.clientY}}, {passive:true});
document.addEventListener('click',e=>{const nav=e.target.closest('#primaryNav [data-view="articles"]');if(!nav)return;e.preventDefault();e.stopPropagation();e.stopImmediatePropagation();history.pushState(null,'','#articles');activate()},true);
document.addEventListener('click',e=>{if(tip&&!e.target.closest('.ar-tooltip')&&!e.target.closest('[data-word]')&&!e.target.closest('[data-colloc]'))closeTip()},true);
window.addEventListener('popstate',()=>{if(location.hash.startsWith('#articles'))activate()});
document.addEventListener('DOMContentLoaded',async()=>{await initData();if(location.hash.startsWith('#articles'))setTimeout(activate,400)});
window.VividArticles={open:activate,importData:arr=>{db=cleanContent(arr);activate()},getLibrary:()=>db};
})();
