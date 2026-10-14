/* Unique practice for Writing Upgrade collocations, VIVID 2026-10-14 */
(function(){
'use strict';
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;',"'":'&#39;','"':'&quot;'}[c]));
const tidy=s=>String(s||'').replace(/\s+/g,' ').trim();
const norm=s=>tidy(s).toLowerCase().replace(/[’‘]/g,"'").replace(/[.,!?;:]+$/,'');
const hash=s=>{let a=2166136261;for(const ch of String(s)){a^=ch.charCodeAt(0);a=Math.imul(a,16777619)}return a>>>0};
const mix=(list,seed)=>list.map((v,i)=>({v,n:hash(seed+':'+i+':'+String(v))})).sort((a,b)=>a.n-b.n).map(x=>x.v);
const escapeRx=s=>String(s).replace(/[.*+?^$()|[\]{}\\]/g,'\\$&');
const domains=[
 [/educat|school|universit|learn|teach|student/i,'education researchers','equal access to learning'],
 [/health|diet|medical|hospital/i,'public-health specialists','preventive healthcare'],
 [/environment|climat|waste|pollut|energy/i,'environmental scientists','sustainable development'],
 [/technolog|digital|online|internet|robot/i,'technology regulators','digital access'],
 [/transport|road|traffic|travel/i,'transport planners','urban mobility'],
 [/work|job|business|econom|finance|money/i,'economic analysts','employment policy'],
 [/crime|law|safety|justice/i,'community researchers','public safety'],
 [/culture|heritage|art|language/i,'cultural organisations','local heritage'],
 [/housing|urban|population/i,'housing specialists','urban development']
];
function domain(topic,term){return domains.find(x=>x[0].test(topic+' '+term))?.slice(1)||['policy analysts','public investment']}
function kind(term){
 const t=term.toLowerCase();
 if(/ly$/.test(t)&&!t.includes(' '))return 'adverb';
 if(/^(on a |on an |in the long run|in the short term|at the same time|for this reason|as a result|by contrast|in contrast|on the other hand|over time|to a large extent)/.test(t))return 'adverbial';
 if(/^to\s+[a-z]+/.test(t))return 'infinitive';
 if(/^(improving|reducing|promoting|addressing|protecting|providing|supporting|encouraging|investing|developing|using|building|making|creating|learning|raising)\b/.test(t))return 'gerund';
 if(/^(to )?(reduce|improve|address|promote|make|take|play|have|give|create|provide|tackle|raise|build|support|encourage|protect|adopt|achieve|establish|maintain|increase|decrease|develop|enhance|invest|ensure|foster|set|strike|meet|solve|implement|introduce|generate|gain|keep|bring|carry|offer|allow|help|consider|focus|deal|boost|stimulate|facilitate|mitigate|alleviate|strengthen|prioritise|prioritize|contribute|combat|overcome|prevent|expand|respond|recognise|recognize|transform|enable|preserve|strike|reach|achieve|bring|lead)\b/.test(t))return 'verb';
 if(/^(increasingly|widely|highly|broadly|particularly|deeply|fully|extremely|significantly|generally|largely|closely|strongly|relatively|quite)\s+/.test(t)||(!t.includes(' ')&&/(ous|ive|ful|less|able|ible|al|ic|ary|ent|ant|ed)$/.test(t)))return 'adjective';
 return 'noun';
}
const frame={
 infinitive:[
 (t,a,p)=>'The council hopes '+t+' before the next consultation.',
 (t,a,p)=>'The main objective of the new strategy is '+t+' over the next decade.',
 (t,a,p)=>'The initiative was introduced '+t+' in disadvantaged communities.',
 (t,a,p)=>'Public institutions are working '+t+' without increasing unnecessary costs.',
 (t,a,p)=>'Regional authorities have promised '+t+' through targeted public investment.',
 (t,a,p)=>'The proposed reforms were designed '+t+' while protecting essential services.',
 (t,a,p)=>'The committee recommended several measures '+t+' with community support.',
 (t,a,p)=>'Decision-makers need '+t+' if they hope to improve long-term outcomes.'
 ],
 noun:[
 (t,a,p)=>'During a review of '+p+', '+a+' examined '+t+' in greater detail.',
 (t,a,p)=>'The consultation raised questions about '+t+' and the likely consequences for local families.',
 (t,a,p)=>'In their final report, '+a+' considered '+t+' before recommending further action.',
 (t,a,p)=>'Decision-makers should account for '+t+' rather than focus solely on short-term costs.',
 (t,a,p)=>'Recent evidence has drawn public attention to '+t+' and its wider implications.',
 (t,a,p)=>'The proposed strategy places greater emphasis on '+t+' as a long-term concern.',
 (t,a,p)=>'The committee explored how '+t+' might influence the next round of policy decisions.',
 (t,a,p)=>'A detailed investigation identified '+t+' as a subject worthy of further discussion.'
 ],
 verb:[
 (t,a,p)=>'Local authorities should '+t+' before setting the priorities for next year.',
 (t,a,p)=>'The revised proposal aims to '+t+' while keeping essential services affordable.',
 (t,a,p)=>'A carefully designed pilot project could help communities '+t+' in the long term.',
 (t,a,p)=>'As part of the review, '+a+' intend to '+t+' through practical reforms.',
 (t,a,p)=>'Decision-makers will need to '+t+' if the programme is to gain public support.',
 (t,a,p)=>'The new initiative seeks to '+t+' without increasing unnecessary bureaucracy.',
 (t,a,p)=>'The committee urged public institutions to '+t+' before the next consultation.',
 (t,a,p)=>'Additional funding may allow local organisations to '+t+' more consistently.'
 ],
 gerund:[
 (t,a,p)=>'The report highlighted the importance of '+t+' during the next policy review.',
 (t,a,p)=>'Local institutions made progress by '+t+' rather than relying on temporary measures.',
 (t,a,p)=>'The council proposed '+t+' as one part of a longer-term strategy.',
 (t,a,p)=>'Several specialists argued that '+t+' would make future decisions more effective.',
 (t,a,p)=>'The practical challenges of '+t+' were discussed during the public consultation.',
 (t,a,p)=>'The committee regarded '+t+' as a useful starting point for reform.',
 (t,a,p)=>'The final proposal prioritised '+t+' over short-term publicity.',
 (t,a,p)=>'Public confidence could depend on '+t+' consistently over the coming years.'
 ],
 adjective:[
 (t,a,p)=>'The committee described the approach as '+t+' after examining its likely impact.',
 (t,a,p)=>'Researchers considered the early findings '+t+', although further evidence was needed.',
 (t,a,p)=>'The proposed solution appeared '+t+' to those attending the public meeting.',
 (t,a,p)=>'The final recommendation was regarded as '+t+' by independent specialists.',
 (t,a,p)=>'For local households, the consequences could be '+t+' over the next decade.',
 (t,a,p)=>'The policy response was considered '+t+' in the circumstances.',
 (t,a,p)=>'The evidence seemed '+t+' when viewed alongside previous reports.',
 (t,a,p)=>'Several observers described the outcome as '+t+' after the consultation.'
 ],
 adverbial:[
 (t,a,p)=>'The committee reviews its findings '+t+' to ensure that its recommendations remain relevant.',
 (t,a,p)=>'Local authorities assess the impact of their decisions '+t+' before revising the budget.',
 (t,a,p)=>'The researchers compare results '+t+' instead of relying on a single observation.',
 (t,a,p)=>'The council updates residents on its progress '+t+' through public reports.',
 (t,a,p)=>'The strategy is reassessed '+t+' as new information becomes available.',
 (t,a,p)=>'Independent specialists monitor these indicators '+t+' to identify emerging risks.',
 (t,a,p)=>'Schools evaluate student progress '+t+' so that support can be adjusted promptly.',
 (t,a,p)=>'The department consults local communities '+t+' before adopting new measures.'
 ],
 adverb:[
 (t,a,p)=>'The figures changed '+t+' after the funding system was revised.',
 (t,a,p)=>'Demand increased '+t+' during the final phase of the programme.',
 (t,a,p)=>'The research team responded '+t+' when new evidence emerged.',
 (t,a,p)=>'The results were interpreted '+t+' during an independent evaluation.',
 (t,a,p)=>'The situation developed '+t+' as the reforms began to take effect.',
 (t,a,p)=>'Public spending rose '+t+' throughout the second reporting period.',
 (t,a,p)=>'The committee assessed the findings '+t+' before publishing its decision.',
 (t,a,p)=>'The programme expanded '+t+' following the introduction of new grants.'
 ]
};
function specificSentence(term,key,actor,area){
 const t=term.toLowerCase();let options=[];
 if(t==='increasingly difficult')options=[
 'Providing affordable housing is becoming '+term+' as demand continues to rise.',
 'It has become '+term+' to recruit qualified teachers in remote areas.',
 'Maintaining reliable public transport is '+term+' during budget cuts.',
 'The council found it '+term+' to meet the needs of growing communities.',
 'It is '+term+' for small businesses to compete with larger firms.',
 'Finding long-term solutions is '+term+' without reliable funding.',
 'Governments may find it '+term+' to balance costs and public expectations.'];
 else if(t==='widely recognised'||t==='widely recognized')options=[
 'The value of preventive healthcare is '+term+' by public-health specialists.',
 'The importance of early education is '+term+' across the research community.',
 'This approach is '+term+' as an effective method of reducing waste.',
 'The connection between clean air and public health is '+term+'.',
 'The need for reliable evidence is '+term+' among policymakers.',
 'The benefits of safe public transport are '+term+' in major cities.',
 'The risks associated with poor planning are now '+term+'.'];
 else if(t==='highly effective')options=[
 'Targeted support for struggling students has proved '+term+'.',
 'The public awareness campaign was '+term+' in reaching young adults.',
 'Researchers considered the new teaching method '+term+'.',
 'The initiative could be '+term+' if schools receive proper resources.',
 'The response was '+term+' because it addressed the problem directly.',
 'Community-led recycling programmes have been '+term+' in several cities.',
 'The proposed solution appears '+term+' when implemented consistently.'];
 else if(/^(make a positive contribution|make a significant contribution|make an important contribution)$/.test(t))options=[
 'Community groups can '+term+' to neighbourhood development.',
 'Universities often '+term+' to the growth of regional economies.',
 'Volunteers may '+term+' to the wellbeing of vulnerable families.',
 'Local businesses can '+term+' to the creation of stable jobs.',
 'Public libraries continue to '+term+' to learning opportunities.',
 'Teachers can '+term+' to students’ long-term development.',
 'Independent organisations hope to '+term+' to social inclusion.'];
 else if(/^(?:an? |the )?(?:significant|profound|positive|negative|considerable|lasting|major|substantial|far-reaching) impact$/.test(t))options=[
 'The changes had '+term+' on the cost of public transport.',
 'The new programme could have '+term+' on students from disadvantaged backgrounds.',
 'The revised guidelines are expected to have '+term+' on local businesses.',
 'Investment in preventive care can have '+term+' on community health.',
 'The funding reduction may have '+term+' on educational opportunities.',
 'Affordable housing policies could have '+term+' on family wellbeing.',
 'The decision has had '+term+' on the long-term prospects of rural towns.'];
 else if(/^(?:an? |the )?(?:sharp|dramatic|significant|steady|rapid|substantial) (?:increase|decrease|rise|decline)$/.test(t))options=[
 'The latest survey recorded '+term+' in demand for affordable housing.',
 'Researchers observed '+term+' in the use of public transport.',
 'The annual report showed '+term+' in the proportion of online learners.',
 'The study identified '+term+' in household energy costs.',
 'The figures indicate '+term+' in the number of people using the service.',
 'Regional authorities reported '+term+' in investment during the year.',
 'The chart illustrates '+term+' in employment over the reporting period.'];
 else if(/^(far-reaching consequences|long-term consequences|serious consequences)$/.test(t))options=[
 'Poorly planned reforms can have '+term+' for families on low incomes.',
 'An abrupt rise in tuition fees could have '+term+' for disadvantaged students.',
 'Ignoring water shortages may have '+term+' for rural communities.',
 'A lack of effective regulation can have '+term+' for consumer confidence.',
 'Cuts to essential services could have '+term+' for public health.',
 'Decisions made today may have '+term+' for future generations.',
 'The failure to invest in training could have '+term+' for regional employment.'];
 else if(/^(in terms of|with regard to|in relation to|with respect to)$/.test(t))options=[
 'Researchers evaluated the proposal '+term+' its long-term environmental impact.',
 'The scheme should be judged '+term+' affordability and public access.',
 'The final report compared several approaches '+term+' their likely costs.',
 'Local officials discussed the programme '+term+' the needs of families.',
 'The review assessed each option '+term+' its effect on employment.',
 'Public investment was considered '+term+' its impact on education.',
 'The survey examined progress '+term+' fairness and regional differences.'];
 else if(/^(because of|due to|owing to|as a result of)$/.test(t))options=[
 'The council revised its plans '+term+' growing pressure on local services.',
 'Several schools changed their timetables '+term+' a shortage of teachers.',
 'The project was delayed '+term+' unexpected increases in construction costs.',
 'Public demand rose '+term+' improvements in the transport network.',
 'Researchers adjusted the survey '+term+' concerns about data quality.',
 'Some households moved further from the city '+term+' rising rents.',
 'The funding was increased '+term+' evidence of unmet community needs.'];
 else if(/^(despite|in spite of)$/.test(t))options=[
 'The council approved the project '+term+' concerns about its cost.',
 'Many residents continued using buses '+term+' occasional delays.',
 'Schools maintained the programme '+term+' limited funding.',
 'The results remained encouraging '+term+' several practical obstacles.',
 'Researchers completed the study '+term+' difficulties collecting data.',
 'The policy gained support '+term+' criticism from some local groups.',
 'Public services improved '+term+' pressure on municipal budgets.'];
 else if(/^(in addition to|along with|as well as)$/.test(t))options=[
 'The plan includes new cycle lanes '+term+' improvements to bus services.',
 'The council funded extra teachers '+term+' updated classroom equipment.',
 'The research considered household income '+term+' access to transport.',
 'The policy aims to improve healthcare '+term+' educational opportunities.',
 'Public consultations involved local residents '+term+' independent specialists.',
 'The report examined environmental outcomes '+term+' economic costs.',
 'The new scheme provides practical training '+term+' financial support.'];
 else if(/^(a range of|a wide range of|a variety of)$/.test(t))options=[
 'The council introduced '+term+' measures to improve local transport.',
 'The programme offers '+term+' support services for working families.',
 'Schools now provide '+term+' learning opportunities outside the classroom.',
 'Researchers examined '+term+' explanations for the change in behaviour.',
 'The report proposed '+term+' practical solutions to rising energy costs.',
 'Community centres organise '+term+' activities for older residents.',
 'Local authorities considered '+term+' options before approving the budget.'];
 else if(/^(a growing number of|an increasing number of|a large number of|a significant proportion of)$/.test(t))options=[
 term.charAt(0).toUpperCase()+term.slice(1)+' households now rely on digital public services.',
 term.charAt(0).toUpperCase()+term.slice(1)+' students choose flexible learning arrangements.',
 term.charAt(0).toUpperCase()+term.slice(1)+' commuters use public transport during the week.',
 term.charAt(0).toUpperCase()+term.slice(1)+' young adults receive training in digital skills.',
 term.charAt(0).toUpperCase()+term.slice(1)+' businesses are investing in cleaner technologies.',
 term.charAt(0).toUpperCase()+term.slice(1)+' families are concerned about housing costs.',
 term.charAt(0).toUpperCase()+term.slice(1)+' schools offer additional support to learners.'];
 else if(/^(a lack of|lack of|a shortage of)$/.test(t))options=[
 term.charAt(0).toUpperCase()+term.slice(1)+' reliable transport can limit access to employment.',
 term.charAt(0).toUpperCase()+term.slice(1)+' affordable housing can force families to relocate.',
 term.charAt(0).toUpperCase()+term.slice(1)+' qualified teachers may affect educational outcomes.',
 term.charAt(0).toUpperCase()+term.slice(1)+' clear information often undermines public confidence.',
 term.charAt(0).toUpperCase()+term.slice(1)+' long-term planning can make reforms less effective.',
 term.charAt(0).toUpperCase()+term.slice(1)+' funding has delayed improvements to public services.',
 term.charAt(0).toUpperCase()+term.slice(1)+' practical support may prevent vulnerable people from benefiting.'];
 else if(/^(a key factor in|a major factor in|an important factor in)$/.test(t))options=[
 'Reliable funding is '+term+' improving healthcare access.',
 'Public transport is '+term+' creating more inclusive cities.',
 'Teacher training is '+term+' raising educational standards.',
 'Household income is '+term+' determining access to housing.',
 'Clear information is '+term+' maintaining public trust.',
 'Digital infrastructure is '+term+' expanding economic opportunities.',
 'Stable employment is '+term+' improving family wellbeing.'];
 else if(/^take into account$|^take account of$/.test(t))options=[
 'The council should '+term+' household income when reviewing transport fees.',
 'A credible policy must '+term+' the different needs of rural communities.',
 'Researchers need to '+term+' regional differences before drawing conclusions.',
 'An effective budget should '+term+' the cost of essential public services.',
 'The committee must '+term+' the views of parents and teachers.',
 'Local planners ought to '+term+' future population growth.',
 'A fair assessment will '+term+' the pressures facing low-income households.'];
 else if(/^play (?:an? )?(?:important|crucial|major|vital|central|key|significant|essential) role/.test(t))options=[
 'Teachers can '+term+' in helping young people develop critical thinking.',
 'Access to reliable information may '+term+' in shaping public attitudes.',
 'Public transport is expected to '+term+' in reducing urban pollution.',
 'Families often '+term+' in supporting children through school.',
 'Independent research can '+term+' in the development of effective policy.',
 'Local businesses may '+term+' in creating employment opportunities.',
 'Universities continue to '+term+' in training skilled professionals.'];
 else if(/^(raise awareness of|draw attention to|pay attention to|contribute to|lead to|result in|depend on|focus on|have access to|provide access to|take responsibility for|take action on|deal with)$/.test(t))options=[
 'Local institutions need to '+term+' the needs of vulnerable residents.',
 'The policy review could '+term+' long-term improvements in public services.',
 'The committee should '+term+' environmental risks rather than short-term publicity.',
 'Public investment can help communities '+term+' reliable healthcare.',
 'The new strategy aims to '+term+' differences in educational outcomes.',
 'The research group will '+term+' the wider effects of the policy.',
 'Decision-makers should '+term+' evidence before setting priorities.'];
 else if(/^(as a result|for this reason|on the other hand|in contrast|by contrast|in the long run|in the short term|at the same time)$/.test(t))options=[
 term.charAt(0).toUpperCase()+term.slice(1)+', sustained investment could improve access to essential services.',
 term.charAt(0).toUpperCase()+term.slice(1)+', the committee recommended reviewing the current approach.',
 term.charAt(0).toUpperCase()+term.slice(1)+', small businesses may struggle to absorb the additional costs.',
 term.charAt(0).toUpperCase()+term.slice(1)+', the benefits of the policy may become clearer over time.',
 term.charAt(0).toUpperCase()+term.slice(1)+', local communities need reliable information before deciding.',
 term.charAt(0).toUpperCase()+term.slice(1)+', the research highlights the importance of long-term planning.',
 term.charAt(0).toUpperCase()+term.slice(1)+', a balanced response would address both costs and benefits.'];
 return options.length?options[Math.abs(Number(key)||0)%options.length]:null;
}
const cached=new Map(),globalUsed=new Set();
function sentence(card,mode){
 const k=card.id+'|'+card.topic+'|'+mode;if(cached.has(k))return cached.get(k);
 const term=card.term,d=domain(card.topic,term),type=kind(term),bank=frame[type];
 const offsets={'flashcard':0,'multiple-choice':1,'fill-gap':2,'word-rush':3,'typing':4,'sentence-builder':5,'study-0':6,'study-1':7};
 const offset=offsets[mode]===undefined?hash(mode)%8:offsets[mode];
 const base=hash(card.id+'@'+card.topic)%8;
 let output='';
 for(let i=0;i<bank.length;i++){
   output=specificSentence(term,base+offset+i,d[0],d[1])||bank[(base+offset+i)%bank.length](term,d[0],d[1]);
   if(!globalUsed.has(norm(output)))break;
 }
 if(globalUsed.has(norm(output)))output=output+' The recommendation will be reviewed again next year.';
 cached.set(k,output);globalUsed.add(norm(output));return output;
}
function cardsOf(items,topic){
 const seen=new Set();
 return (Array.isArray(items)?items:[]).filter(o=>o&&typeof o==='object').map((o,i)=>({id:'writing:'+String(topic||o.topic||'IELTS Writing')+':'+String(o.id||i),term:tidy(o.term||o.w||o.phrase||o.collocation),uz:tidy(o.uz||o.u||o.translation||o.meaning||o.d||o.definition||''),topic:String(topic||o.topic||'IELTS Writing')})).filter(x=>{if(!x.term||seen.has(norm(x.term)))return false;seen.add(norm(x.term));return true});
}
function blank(card,mode){
 const text=sentence(card,mode),rx=new RegExp(escapeRx(card.term),'i');
 return text.replace(rx,'________');
}
const modes=['Flashcards','Multiple Choice','Matching Pairs','Fill the Gap','Word Rush','Typing Race','Sentence Builder'];
let overlay=null,game=null,clock=null;
function stop(){if(clock){clearInterval(clock);clock=null}}
function close(){stop();overlay?.remove();overlay=null;game=null;document.body.classList.remove('wgc-lock')}
function open(rawCards,topic){
 const cards=cardsOf(rawCards,topic);if(!cards.length)return;
 close();game={cards,topic:topic||'IELTS Writing',mode:0,index:0,score:0,checked:false,answer:'',flip:false,built:[],bank:[],left:null,right:null,matched:new Set(),seconds:15};
 overlay=document.createElement('div');overlay.className='wgc-layer';overlay.setAttribute('role','dialog');overlay.setAttribute('aria-modal','true');overlay.setAttribute('aria-label','Writing collocation practice');
 overlay.addEventListener('click',e=>{if(e.target===overlay)close();else click(e)});
 overlay.addEventListener('input',e=>{if(e.target.matches('[data-wgc-input]'))game.answer=e.target.value});
 document.body.appendChild(overlay);document.body.classList.add('wgc-lock');render();
}
function card(){return game.cards[Math.min(game.index,game.cards.length-1)]}
function wrap(html){
 overlay.innerHTML='<section class="wgc-modal"><header class="wgc-head"><div><small>VIVID IELTS · WRITING</small><h2>'+E(game.topic)+'</h2><p>'+game.cards.length+' collocations · 7 different games</p></div><button data-wgc="close" aria-label="Close">✕</button></header><nav class="wgc-tabs">'+modes.map((m,i)=>'<button class="'+(game.mode===i?'active':'')+'" data-wgc-tab="'+i+'">'+(i+1)+'. '+m+'</button>').join('')+'</nav><div class="wgc-meta"><b>'+E(modes[game.mode])+'</b><span>'+Math.min(game.index+1,game.cards.length)+' / '+game.cards.length+'</span><span>Score: '+game.score+'</span></div><div class="wgc-progress"><i style="width:'+(100*game.index/game.cards.length)+'%"></i></div><main class="wgc-main">'+html+'</main></section>';
}
function controls(check=true){return '<div class="wgc-actions">'+(check?'<button class="wgc-primary" data-wgc="check">Tekshirish</button>':'')+'<button data-wgc="next">Keyingi →</button></div>'}
function feedback(ok,detail){
 let el=overlay.querySelector('.wgc-feedback');
 if(!el){el=document.createElement('div');el.className='wgc-feedback';overlay.querySelector('.wgc-main').appendChild(el)}
 el.className='wgc-feedback '+(ok?'correct':'incorrect');el.innerHTML='<strong>'+(ok?'✓ To‘g‘ri':'↻ Xatoni tekshiring')+'</strong><p>'+E(detail)+'</p>';
}
function mark(ok,detail){if(game.checked)return;game.checked=true;if(ok)game.score++;stop();feedback(ok,detail)}
function options(c){const others=[...new Set(game.cards.filter(x=>norm(x.term)!==norm(c.term)).map(x=>x.term))];return mix([c.term,...mix(others,c.id+'alts').slice(0,3)],c.id+'options'+game.mode)}
function render(){
 if(!game)return;stop();const c=card(),mode=game.mode;
 if(mode===2){renderPairs();return}
 let h='';
 if(mode===0)h='<div class="wgc-card"><small>Card '+(game.index+1)+'</small><h3>'+E(c.term)+'</h3>'+(game.flip?'<p class="wgc-meaning">'+E(c.uz)+'</p><p>'+E(sentence(c,'flashcard'))+'</p>':'<p>Meaning va alohida tuzilgan misolni oching.</p>')+'</div><div class="wgc-actions"><button class="wgc-primary" data-wgc="flip">Kartani aylantirish</button><button data-wgc="next">Keyingi →</button></div>';
 else if(mode===1||mode===4)h='<h3>'+(mode===1?'Multiple Choice':'Word Rush')+'</h3><p>Akademik gapga mos collocationni tanlang.</p><blockquote>'+E(blank(c,mode===1?'multiple-choice':'word-rush'))+'</blockquote>'+(mode===4?'<p class="wgc-timer">⏱ <span id="wgc-time">15</span> sec</p>':'')+'<div class="wgc-options">'+options(c).map(o=>'<button data-wgc-choice="'+E(o)+'">'+E(o)+'</button>').join('')+'</div>'+controls(false);
 else if(mode===3)h='<h3>Fill the Gap</h3><p>Bu gap boshqa o‘yinlarda ishlatilmaydi. Missing collocationni yozing.</p><blockquote>'+E(blank(c,'fill-gap'))+'</blockquote><input data-wgc-input placeholder="Type the collocation..." autocomplete="off">'+controls();
 else if(mode===5)h='<h3>Typing Race</h3><p>O‘zbekcha ma’noga mos inglizcha collocationni xatosiz yozing.</p><div class="wgc-meaning">'+E(c.uz)+'</div><p>Number of words: '+c.term.split(/\s+/).length+'</p><input data-wgc-input placeholder="English expression..." autocomplete="off">'+controls();
 else if(mode===6){const s=sentence(c,'sentence-builder'),terms=s.match(/\S+/g)||[];game.bank=mix(terms.map((x,i)=>({word:x,id:i})),c.id+'-builder');if(game.bank.every((x,i)=>x.id===i))game.bank.reverse();h='<h3>Sentence Builder</h3><p>So‘zlarni bosib yangi gapni to‘g‘ri tartibda tuzing.</p><div class="wgc-meaning">'+E(c.uz)+'</div><div class="wgc-built"></div><div class="wgc-tokens"></div><div class="wgc-actions"><button data-wgc="undo">↶ Orqaga</button><button data-wgc="check" class="wgc-primary">Tekshirish</button><button data-wgc="next">Keyingi →</button></div>'}
 wrap(h);if(mode===6)paintBuilder();
 if(mode===4){game.seconds=15;clock=setInterval(()=>{if(!game||game.mode!==4){stop();return}game.seconds--;const slot=overlay?.querySelector('#wgc-time');if(slot)slot.textContent=game.seconds;if(game.seconds<=0)mark(false,'To‘g‘ri javob: '+card().term)},1000)}
}
function paintBuilder(){
 const built=overlay.querySelector('.wgc-built'),tokens=overlay.querySelector('.wgc-tokens');if(!built||!tokens)return;
 built.innerHTML=game.built.length?game.built.map(x=>'<span>'+E(x.word)+'</span>').join(''):'<em>So‘zlar shu yerga yig‘iladi.</em>';
 tokens.innerHTML=game.bank.filter(x=>!game.built.some(y=>x.id===y.id)).map(x=>'<button data-wgc-token="'+x.id+'">'+E(x.word)+'</button>').join('');
}
function renderPairs(){
 const start=Math.floor(game.index/4)*4,section=game.cards.slice(start,start+4);
 const left=mix(section,'left'+start),right=mix(section,'right'+start);
 wrap('<h3>Matching Pairs</h3><p>Har bir collocationni uning tarjimasi bilan moslang.</p><div class="wgc-pairs"><div>'+left.map(x=>'<button data-wgc-left="'+E(x.id)+'" class="'+(game.matched.has(x.id)?'matched':'')+'">'+E(x.term)+'</button>').join('')+'</div><div>'+right.map(x=>'<button data-wgc-right="'+E(x.id)+'" class="'+(game.matched.has(x.id)?'matched':'')+'">'+E(x.uz)+'</button>').join('')+'</div></div><div class="wgc-actions"><button data-wgc="next-pairs" class="wgc-primary">Keyingi to‘plam →</button></div>');
}
function setMode(m){stop();game.mode=m;game.index=0;game.score=0;game.checked=false;game.answer='';game.flip=false;game.built=[];game.matched=new Set();game.left=null;game.right=null;render()}
function finish(){
 try{const key='vivid-writing-game-sessions-v2',old=JSON.parse(localStorage.getItem(key)||'{}');old[game.topic]=[...(old[game.topic]||[]).slice(-19),{mode:game.mode,score:game.score,total:game.cards.length,date:new Date().toISOString()}];localStorage.setItem(key,JSON.stringify(old))}catch{}
 window.dispatchEvent(new CustomEvent('vivid:study-complete',{detail:{type:'writing',title:'Writing '+modes[game.mode],words:game.cards.length}}));
 wrap('<div class="wgc-finish"><h2>O‘yin tugadi</h2><p>'+game.score+' / '+game.cards.length+' correct</p><button data-wgc="restart" class="wgc-primary">Qayta boshlash</button></div>');
}
function next(){if(game.index+1===game.cards.length){finish();return}game.index++;game.checked=false;game.answer='';game.flip=false;game.built=[];render()}
function click(ev){
 const button=ev.target.closest('button');if(!button||!overlay?.contains(button))return;
 if(button.hasAttribute('data-wgc-tab')){setMode(Number(button.dataset.wgcTab));return}
 if(button.hasAttribute('data-wgc-token')){const x=game.bank.find(t=>t.id===Number(button.dataset.wgcToken));if(x&&!game.built.some(y=>y.id===x.id)){game.built.push(x);paintBuilder()}return}
 if(button.hasAttribute('data-wgc-choice')){if(game.checked)return;overlay.querySelectorAll('[data-wgc-choice]').forEach(x=>x.classList.toggle('chosen',x===button));mark(norm(button.dataset.wgcChoice)===norm(card().term),'Model: '+card().term+'. '+sentence(card(),game.mode===1?'multiple-choice':'word-rush'));return}
 if(button.hasAttribute('data-wgc-left')||button.hasAttribute('data-wgc-right')){
   if(button.classList.contains('matched'))return;
   if(button.hasAttribute('data-wgc-left'))game.left=button.dataset.wgcLeft;else game.right=button.dataset.wgcRight;
   overlay.querySelectorAll('[data-wgc-left],[data-wgc-right]').forEach(x=>x.classList.toggle('chosen',(x.hasAttribute('data-wgc-left')&&game.left===x.dataset.wgcLeft)||(x.hasAttribute('data-wgc-right')&&game.right===x.dataset.wgcRight)));
   if(game.left&&game.right){
     if(game.left===game.right){game.matched.add(game.left);game.score++;overlay.querySelectorAll('[data-wgc-left],[data-wgc-right]').forEach(x=>{if(x.dataset.wgcLeft===game.left||x.dataset.wgcRight===game.right){x.classList.remove('chosen');x.classList.add('matched')}})}
     else feedback(false,'Juftlik mos kelmadi. Boshqa ma’noni tanlang.');
     game.left=null;game.right=null;
   }return;
 }
 const act=button.dataset.wgc;
 if(act==='close')close();
 else if(act==='flip'){if(!game.checked){game.score++;game.checked=true}game.flip=!game.flip;render()}
 else if(act==='undo'){game.built.pop();paintBuilder()}
 else if(act==='check'){
   if(game.checked)return;
   if(game.mode===6){const model=sentence(card(),'sentence-builder');mark(norm(game.built.map(x=>x.word).join(' '))===norm(model),'Model: '+model)}
   else mark(norm(game.answer)===norm(card().term),'Model: '+card().term+' — '+sentence(card(),game.mode===3?'fill-gap':'typing'));
 }else if(act==='next')next();
 else if(act==='next-pairs'){const need=Math.min(4,game.cards.length-Math.floor(game.index/4)*4);if([...game.matched].filter(id=>game.cards.slice(Math.floor(game.index/4)*4,Math.floor(game.index/4)*4+4).some(x=>x.id===id)).length<need){feedback(false,'Avval barcha juftliklarni to‘g‘ri ulang.');return}game.index+=need;if(game.index===game.cards.length)finish();else renderPairs()}
 else if(act==='restart')setMode(game.mode);
}
document.addEventListener('keydown',e=>{if(e.key==='Escape'&&overlay)close();if(e.key==='Enter'&&overlay&&e.target?.matches('[data-wgc-input]')){e.preventDefault();overlay.querySelector('[data-wgc="check"]')?.click()}});
window.VividWritingCollocations={open,close,cardsOf,sentence,example:function(item,topic,variant){return sentence({id:String(item.id||item.term)+'@'+topic,term:tidy(item.term||item.w),topic:String(topic)},'study-'+variant)}};
})();