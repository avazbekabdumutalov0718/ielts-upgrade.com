/* VIVID Articles — isolated five-step guided reading workflow */
(() => {
'use strict';
const qs=(s,root=document)=>root.querySelector(s), qsa=(s,root=document)=>[...root.querySelectorAll(s)];
const E=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const norm=v=>String(v||'').toLowerCase().replace(/[’‘]/g,"'").trim();
const STORE='vivid_articles_progress_v2', DICT='vivid_articles_translations_v2', CACHE='vivid_articles_import_v1';
const levels=['B1','B2','C1','C2'];const stageNames=['Read','Highlight','Words','Review','Speed reading'];
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
const ARTICLE_CORE_TRANSLATIONS={"the":"aniq artikl","a":"bir; noaniq artikl","an":"bir; noaniq artikl","and":"va","or":"yoki","but":"ammo","if":"agar","in":"ichida; -da","on":"ustida; -da","at":"-da","by":"tomonidan; orqali","with":"bilan","for":"uchun","from":"-dan","of":"-ning; ga oid","to":"-ga; ...moq uchun","into":"ichiga","out":"tashqariga","over":"ustidan; davomida","under":"ostida","through":"orqali","after":"keyin","before":"oldin","during":"davomida","since":"-dan beri","until":"-gacha","as":"sifatida; kabi","than":"-dan ko‘ra","because":"chunki","although":"garchi","while":"paytida; holbuki","despite":"...ga qaramay","between":"orasida","among":"orasida","above":"yuqorida","below":"pastda","up":"yuqoriga","down":"pastga","around":"atrofida","across":"bo‘ylab","within":"ichida","without":"-siz","this":"bu","that":"u; o‘sha","these":"bular","those":"o‘shalar","it":"u","its":"uning","i":"men","me":"meni; menga","my":"mening","you":"siz; sen","your":"sizning","he":"u (erkak)","him":"unga; uni","his":"uning","she":"u (ayol)","her":"uning; uni","we":"biz","us":"bizni; bizga","our":"bizning","they":"ular","them":"ularni; ularga","their":"ularning","who":"kim","what":"nima","when":"qachon","where":"qayerda; qayerga","why":"nega","how":"qanday","which":"qaysi","whose":"kimning","there":"u yerda; mavjud","here":"shu yerda","yes":"ha","no":"yo‘q","not":"emas; yo‘q","never":"hech qachon","ever":"biror marta","always":"har doim","often":"tez-tez","sometimes":"ba’zan","usually":"odatda","rarely":"kamdan-kam","also":"ham; shuningdek","only":"faqat","even":"hatto","still":"hali ham","already":"allaqachon","yet":"hali; ammo","just":"shunchaki; endigina","very":"juda","more":"ko‘proq","most":"eng ko‘p","much":"ko‘p","many":"ko‘plab","few":"ozgina","little":"ozgina","all":"barcha","any":"har qanday","some":"ba’zi","each":"har bir","every":"har bir","both":"ikkalasi","either":"ikkisidan biri","neither":"hech biri","another":"yana biri","other":"boshqa","same":"bir xil","different":"turli","first":"birinchi","second":"ikkinchi","third":"uchinchi","one":"bir","two":"ikki","three":"uch","four":"to‘rt","five":"besh","six":"olti","seven":"yetti","eight":"sakkiz","nine":"to‘qqiz","ten":"o‘n","hundred":"yuz","thousand":"ming","million":"million","billion":"milliard","is":"-dir; hisoblanadi","are":"-dir; hisoblanadi","was":"edi","were":"edilar","be":"bo‘lmoq","been":"bo‘lgan","being":"bo‘lish","am":"-man","have":"ega bo‘lmoq; bor","has":"ega; bor","had":"ega edi","do":"qilmoq","does":"qiladi","did":"qildi","done":"bajarilgan","can":"qila olmoq","could":"qila olardi","will":"bo‘ladi","would":"bo‘lardi","should":"kerak","must":"shart","may":"mumkin","might":"ehtimol","shall":"-amiz","let":"ruxsat bermoq","says":"aytadi","said":"dedi","say":"aytmoq","get":"olmoq","got":"oldi","make":"qilmoq; yasamoq","made":"qilingan; yasagan","find":"topmoq","found":"topdi","know":"bilmoq","known":"ma’lum","think":"o‘ylamoq","thought":"fikr; o‘yladi","see":"ko‘rmoq","seen":"ko‘rilgan","look":"qaramoq","take":"olmoq","took":"oldi","give":"bermoq","gave":"berdi","go":"bormoq","went":"bordi","come":"kelmoq","came":"keldi","want":"xohlamoq","need":"kerak bo‘lmoq","use":"foydalanmoq","used":"ishlatilgan","using":"foydalanib","new":"yangi","old":"eski","good":"yaxshi","bad":"yomon","big":"katta","small":"kichik","high":"yuqori","low":"past","great":"buyuk; katta","long":"uzun; uzoq","short":"qisqa","year":"yil","years":"yillar","day":"kun","days":"kunlar","today":"bugun","tomorrow":"ertaga","yesterday":"kecha","time":"vaqt","world":"dunyo","life":"hayot","people":"odamlar","person":"inson","human":"inson","humans":"insonlar","research":"tadqiqot","study":"o‘rganish; tadqiqot","studies":"tadqiqotlar","science":"fan; ilm","scientist":"olim","scientists":"olimlar","article":"maqola","articles":"maqolalar","question":"savol","questions":"savollar","answer":"javob","answers":"javoblar","word":"so‘z","words":"so‘zlar","text":"matn","story":"hikoya","book":"kitob","books":"kitoblar","example":"misol","examples":"misollar","health":"salomatlik","brain":"miya","body":"tana","water":"suv","air":"havo","earth":"Yer","planet":"sayyora","space":"fazo","energy":"energiya","technology":"texnologiya","data":"ma’lumotlar","information":"axborot","school":"maktab","students":"o‘quvchilar","student":"o‘quvchi","teacher":"o‘qituvchi","teachers":"o‘qituvchilar","learn":"o‘rganmoq","learning":"o‘rganish","education":"ta’lim","language":"til","english":"ingliz tili","uzbek":"o‘zbek tili","system":"tizim","systems":"tizimlar","important":"muhim","significant":"sezilarli; muhim","possible":"mumkin","impossible":"imkonsiz","public":"ommaviy; jamoat","private":"shaxsiy","children":"bolalar","child":"bola","family":"oila","families":"oilalar","friend":"do‘st","friends":"do‘stlar","city":"shahar","country":"mamlakat","countries":"mamlakatlar","percent":"foiz","per":"har; -ga","cent":"yuzdan bir","current":"hozirgi","future":"kelajak","past":"o‘tmish","present":"hozirgi","real":"haqiqiy","really":"haqiqatan","however":"biroq","therefore":"shuning uchun","moreover":"bundan tashqari","furthermore":"shuningdek","nevertheless":"shunga qaramay","otherwise":"aks holda","instead":"o‘rniga","especially":"ayniqsa","particularly":"xususan","generally":"odatda","probably":"ehtimol","perhaps":"balki","likely":"ehtimoli yuqori","unlikely":"ehtimoli past","almost":"deyarli","approximately":"taxminan","exactly":"aynan","according":"ko‘ra","including":"jumladan","include":"o‘z ichiga olmoq","includes":"o‘z ichiga oladi","such":"shunday","whether":"...mi yoki yo‘qmi","far":"uzoq","near":"yaqin","right":"to‘g‘ri; o‘ng","left":"chap; qoldirdi","way":"yo‘l; usul","ways":"usullar","well":"yaxshi","better":"yaxshiroq","best":"eng yaxshi","worse":"yomonroq","worst":"eng yomon"};
async function translate(w){return localText(w)||ARTICLE_CORE_TRANSLATIONS[norm(w)]||''}
function cleanContent(rows){return Array.isArray(rows)?rows.filter(x=>x&&typeof x==='object'&&Array.isArray(x.body)).map(x=>({...x,title:String(x.title||'Untitled'),kind:x.kind==='magazine'?'magazine':'article',level:levels.includes(x.level)?x.level:'B2'})):[]}
async function initData(){
 try{const r=await fetch('articles-glossary.json?v=20261012-v5');if(r.ok)glossary=(await r.json()).translations||{}}catch{}
 try{const r=await fetch('articles-data.json?v=20261012-v5');if(r.ok){db=cleanContent((await r.json()).articles);if(db.length)return}}catch{}
 // User can locally import the prepared article data while the GitHub upload is pending.
 try{const raw=localStorage.getItem(CACHE);if(raw)db=cleanContent(JSON.parse(raw).articles)}catch{}
}

const AR_PHOTO_CACHE_KEY='vivid_articles_wikimedia_images_v1';
let arPhotoQueries={},arPinnedPhotos={},arPhotoCache={},arPhotoObserver=null,arPhotoQueue=[],arPhotoActive=0;
try{arPhotoCache=JSON.parse(localStorage.getItem(AR_PHOTO_CACHE_KEY)||'{}')}catch{arPhotoCache={}}
const AR_FALLBACK_PHOTOS={
 science:'https://images.unsplash.com/photo-1532094349884-543bc11b234d?auto=format&fit=crop&w=900&q=78',
 nature:'https://images.unsplash.com/photo-1441974231531-c6227db76b6e?auto=format&fit=crop&w=900&q=78',
 space:'https://upload.wikimedia.org/wikipedia/commons/9/97/The_Earth_seen_from_Apollo_17.jpg',
 health:'https://images.unsplash.com/photo-1505751172876-fa1923c5c528?auto=format&fit=crop&w=900&q=78',
 books:'https://images.unsplash.com/photo-1497633762265-9d179a990aa6?auto=format&fit=crop&w=900&q=78',
 technology:'https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=900&q=78'
};
function arTopicImageType(q){
 if(/space|planet|moon|galaxy|star|cosmos|astronaut|telescope|asteroid|supernova|satellite|rocket/i.test(q))return 'space';
 if(/forest|plant|climate|animal|wildlife|ocean|seaweed|orchid|bird|heatwave|antarct|pollution|agriculture|glacier|tree|elephant|octopus/i.test(q))return 'nature';
 if(/health|sleep|medical|brain|ADHD|fitness|diabetes|alzheim|dementia|hospital|mindfulness|meditation|food|coffe|neurolog|psycholog|pregnan|embryo/i.test(q))return 'health';
 if(/computer|artificial intelligence|AI|robot|digital|chip|hacker|internet|online|cyber/i.test(q))return 'technology';
 if(/books|Roman|Greece|Auschwitz|history|culture|museum|Alexander|language|education|university|samurai/i.test(q))return 'books';
 return 'science';
}
async function arLoadPhotoQueries(){
 try{
  const r=await fetch('articles-images.json?v=20261013-all-110-photos',{cache:'force-cache'});
  if(r.ok){const j=await r.json();arPhotoQueries=j.articles||{}}
 }catch(err){console.warn('Could not load image search topics',err)}
}

async function arLoadEditorialTitles(){
 try{
  const r=await fetch('articles-titles.json?v=20261013-v18-title-fixes');
  if(!r.ok)return;
  const j=await r.json();
  for(const a of db){const t=j.titles?.[a.id];if(t){a.originalTitle=a.originalTitle||a.title;a.title=t}}
 }catch(e){console.warn('Title improvements unavailable',e)}
}
function arLengthLabel(a){
 const w=Number(a.words)||wordsOf((a.body||[]).join(' ')).length;
 if(a.kind==='magazine')return 'Full issue';
 return w<=700?'Short':w<=1600?'Medium':'Long';
}
function arReadingMinutes(a){
 const w=Number(a.words)||wordsOf((a.body||[]).join(' ')).length;
 return Math.max(1,Math.ceil(w/225));
}
function arSizeMeta(a){
 return '<span class="ar-reading-size">'+E(arLengthLabel(a))+' · ~'+arReadingMinutes(a)+' min read</span>';
}
async function arLoadPinnedPhotos(){
 try{
 const r=await fetch('articles-pinned-images.json?v=20261013-v20');
 if(!r.ok)return; const j=await r.json();
 arPinnedPhotos=j.photos||{};
 }catch(e){console.warn('Curated article photos unavailable',e)}
}
function articleVisual(a){
 const spec=arPhotoQueries[a.id]||{query:String(a.title||'').replace(/[^a-zA-Z ]/g,' ').slice(0,72),fallback:'scientific research'};
 return '<span class="ar-cover ar-photo-loading" data-photo-id="'+E(a.id)+'" role="img" aria-label="'+E('Photo: '+spec.query)+'">'+
 '<span class="ar-cover-shine" aria-hidden="true"></span>'+
 '<span class="ar-photo-loading-label">Photo · Wikimedia Commons</span></span>';
}
function arPersistPhotoCache(){
 try{
  const entries=Object.entries(arPhotoCache);
  if(entries.length>110)entries.splice(0,entries.length-110);
  localStorage.setItem(AR_PHOTO_CACHE_KEY,JSON.stringify(Object.fromEntries(entries)));
 }catch{}
}
function arCleanCredit(str){
 if(!str)return '';
 const tmp=document.createElement('div');tmp.textContent=String(str).replace(/<[^>]*>/g,' ').replace(/&nbsp;/g,' ');
 return tmp.textContent.replace(/\s+/g,' ').trim().slice(0,100);
}
function arImageExists(url){
 return /^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(String(url||''));
}

function arPhotoIsUsed(url,id){
 return Object.entries(arPhotoCache).some(([other,entry])=>other!==id&&entry?.url===url);
}
function arSanitizeImageCache(){
 const seen=new Set(),clean={};
 for(const [id,data] of Object.entries(arPhotoCache)){
  if(!data||!data.url||data.fallback||!/^https:\/\/(?:upload|thumb)\.wikimedia\.org\//.test(data.url))continue;
  if(seen.has(data.url))continue;
  seen.add(data.url);clean[id]=data;
 }
 arPhotoCache=clean;arPersistPhotoCache();
}

async function arSearchCommons(searchTerm,id){
 const params=new URLSearchParams({
  action:'query',generator:'search',gsrsearch:searchTerm+' filetype:bitmap',
  gsrnamespace:'6',gsrlimit:'35',prop:'imageinfo',
  iiprop:'url|size|mime|extmetadata',iiurlwidth:'900',
  iiextmetadatafilter:'LicenseShortName|Artist',format:'json',origin:'*'
 });
 const controller=new AbortController();
 const timeout=setTimeout(()=>controller.abort(),14000);
 try{
  const response=await fetch('https://commons.wikimedia.org/w/api.php?'+params,{signal:controller.signal,mode:'cors',credentials:'omit'});
  if(!response.ok)throw Error('Commons '+response.status);
  const json=await response.json();
  const terms=searchTerm.toLowerCase().split(/\s+/).filter(w=>w.length>3&&!['science','research','photo','human','medical'].includes(w));
  const photos=Object.values(json.query?.pages||{}).map(p=>{
   const ii=p.imageinfo?.[0],lic=String(ii?.extmetadata?.LicenseShortName?.value||'');
   const url=ii?.thumburl||ii?.url||'';
   const width=Number(ii?.width||0),height=Number(ii?.height||0),ratio=height?width/height:0;
   const title=String(p.title||'').toLowerCase();
   const relevance=terms.filter(t=>title.includes(t)).length;
   return {url,license:lic,width,height,ratio,relevance,filename:p.title,
    mime:ii?.mime||'',artist:arCleanCredit(ii?.extmetadata?.Artist?.value),
    source:ii?.descriptionurl||'https://commons.wikimedia.org/wiki/'+encodeURIComponent(p.title||'')};
  }).filter(x=>arImageExists(x.url)&&x.mime.startsWith('image/')&&
    x.width>=600&&x.height>=350&&x.ratio>=1.15&&x.ratio<=4&&
    /^(?:CC ?0|CC BY(?:-SA)?|public domain|PD-)/i.test(x.license)&&
    x.relevance>0&&!arPhotoIsUsed(x.url,id));
  photos.sort((a,b)=>b.relevance-a.relevance||Math.abs(a.ratio-1.8)-Math.abs(b.ratio-1.8));
  return photos[0]||null;
 }finally{clearTimeout(timeout)}
}
async function arResolvePhoto(id){
 const spec=arPhotoQueries[id]||{query:db.find(x=>x.id===id)?.title||'science',fallback:'research'};
 const queries=[spec.query,spec.fallback]
   .filter(Boolean).map(q=>q.split(/\s+/).slice(0,4).join(' '));
 for(const term of [...new Set(queries)]){
  try{const img=await arSearchCommons(term,id);if(img)return img}
  catch(e){console.warn('Commons search:',id,e.message)}
 }
 return null;
}
function arSetMissingPhoto(id){
 const cover=host()?.querySelector('.ar-cover[data-photo-id="'+CSS.escape(id)+'"]');
 if(!cover)return;
 cover.classList.remove('ar-photo-loading');
 cover.classList.add('ar-photo-unavailable');
 cover.innerHTML='<span class="ar-no-photo-title">'+E(db.find(a=>a.id===id)?.title||'Article')+'</span><span class="ar-no-photo-subtitle">Photograph unavailable · Commons</span>';
}
function arApplyPhoto(id,data){
 const cover=host()?.querySelector('.ar-cover[data-photo-id="'+CSS.escape(id)+'"]');
 if(!cover)return;
 if(!data?.url)return;
 cover.classList.remove('ar-photo-loading');
 cover.innerHTML='';
 const img=document.createElement('img');
 img.src=data.url;img.alt='Photo matching '+(arPhotoQueries[id]?.query||'article topic');
 img.loading='lazy';img.decoding='async';img.referrerPolicy='no-referrer';
 img.onerror=()=>{
  delete arPhotoCache[id];arPersistPhotoCache();
  arSetMissingPhoto(id);
  const credit=host()?.querySelector('[data-photo-credit="'+CSS.escape(id)+'"]');if(credit)credit.hidden=true;
 };
 cover.appendChild(img);
 arApplyPhotoCredit(id,data);
}
function arApplyPhotoCredit(id,data){
 const credit=host()?.querySelector('[data-photo-credit="'+CSS.escape(id)+'"]');
 if(!credit||!data)return;
 credit.href=data.source;
 credit.textContent=(data.artist?(data.artist.slice(0,36)+' · '):'')+data.license+' ↗';
 credit.title='Original image, photographer and license';
 credit.hidden=false;
}
function arQueuePhoto(id){
 if(arPinnedPhotos[id]?.url){arApplyPhoto(id,arPinnedPhotos[id]);return}
 if(arPhotoCache[id]?.url&&!arPhotoIsUsed(arPhotoCache[id].url,id)){arApplyPhoto(id,arPhotoCache[id]);return}
 delete arPhotoCache[id];
 if(arPhotoQueue.includes(id))return;
 arPhotoQueue.push(id);arPumpPhotos();
}
function arPumpPhotos(){
 while(arPhotoActive<3&&arPhotoQueue.length){
  const id=arPhotoQueue.shift();
  if(!host()?.querySelector('[data-photo-id="'+CSS.escape(id)+'"]'))continue;
  arPhotoActive++;
  arResolvePhoto(id).then(photo=>{
   if(!photo){arSetMissingPhoto(id);return}
   if(arPhotoIsUsed(photo.url,id)){arSetMissingPhoto(id);return}
   arPhotoCache[id]=photo;arPersistPhotoCache();
   arApplyPhoto(id,photo);
  }).catch(e=>console.warn('Image load failed:',id,e)).finally(()=>{arPhotoActive--;arPumpPhotos()});
 }
}
function arWirePhotos(){
 if(arPhotoObserver){arPhotoObserver.disconnect();arPhotoObserver=null}
 const covers=qsa('.ar-cover[data-photo-id]');
 if(!('IntersectionObserver' in window)){
  covers.forEach(node=>arQueuePhoto(node.dataset.photoId));return;
 }
 arPhotoObserver=new IntersectionObserver(entries=>{
  for(const entry of entries){
   if(!entry.isIntersecting)continue;
   arPhotoObserver?.unobserve(entry.target);
   arQueuePhoto(entry.target.dataset.photoId);
  }
 },{rootMargin:'550px 0px',threshold:0.01});
 covers.forEach(cover=>arPhotoObserver.observe(cover));
}
async function applyReviewedMCQ(){
 try{
  const response=await fetch('articles-mcq-reviewed.json?v=20261013-full-review-v3');
  if(!response.ok)return;
  const json=await response.json();
  for(const article of db){
   const verified=json?.articles?.[article.id];
   if(!Array.isArray(verified)||verified.length!==5)continue;
   if(!verified.every(q=>typeof q.text==='string'&&q.options?.length===4&&Number.isInteger(q.answer)&&q.answer>=0&&q.answer<4&&q.evidence))continue;
   article.questions=article.questions||{tf:[],mcq:[]};
   article.questions.mcq=verified;
   article.mcqReviewed=true;
   article.mcqOcrLimited=verified.some(q=>q.reviewStatus==='source-ocr-limited');
   if(!article.mcqOcrLimited)article.quizQuality=true;
  }
 }catch(e){console.warn('Articles reviewed questions could not load',e)}
}
function buildIndex(){
 const magazine=db.filter(a=>a.kind==='magazine'),articles=db.filter(a=>a.kind==='article');
 const cards=arr=>arr.map(a=>{const p=progress[a.id]||{};return '<article class="ar-article"><button type="button" class="ar-card-open" data-open="'+E(a.id)+'">'+articleVisual(a)+'<span class="ar-card-row">'+formatLevel(a.level)+'<small>'+E(a.words||0)+' words · '+E(a.pages||1)+' pages</small></span><strong>'+sanitizeTitle(a.title)+'</strong>'+arSizeMeta(a)+'<span class="ar-article-footer">'+(p.complete?'✓ Completed':p.stage?'Continue step '+p.stage:'Start reading')+' <span aria-hidden="true">→</span></span></button><a class="ar-photo-credit" data-photo-credit="'+E(a.id)+'" target="_blank" rel="noopener noreferrer" hidden></a></article>'}).join('');
 const filtered=articles.filter(a=>(level==='all'||a.level===level)&&(!query||norm(a.title).includes(norm(query))));
 const mags=magazine.filter(a=>(level==='all'||a.level===level)&&(!query||norm(a.title).includes(norm(query))));
 return '<section class="ar-shell"><div class="ar-header"><div><p class="ar-overline">SPEAKING & VOCAB · READING LIBRARY</p><h1>Articles</h1><p>Read, highlight, learn vocabulary and practise speaking & writing expressions through five stages.</p></div><div class="ar-counter"><b>'+articles.length+'</b><span>Articles</span><b>'+magazine.length+'</b><span>New Scientist issues</span></div></div>'+
 '<div class="ar-filterbar"><label>CEFR <select id="ar-level"><option value="all">All levels</option>'+levels.map(l=>'<option value="'+l+'"'+(level===l?' selected':'')+'>'+l+'</option>').join('')+'</select></label><label>Find an article <input id="ar-search" type="search" value="'+E(query)+'" placeholder="Search titles..."></label><label class="ar-import">Import article library<input id="ar-import" type="file" accept=".json,application/json"></label></div>'+
 (db.length?'':'<div class="ar-empty"><h2>Article data is not published yet</h2><p>Upload <code>articles-data.json</code> to the GitHub repository root, or import that JSON file here to read in this browser. A catalog without the original texts would be misleading.</p></div>')+
 '<h2 class="ar-section-title">New Scientist · 10 separate issues <small>'+mags.length+'</small></h2><p class="ar-subnote">These PDFs are complete magazine issues rather than individual articles. Their reading level is estimated, not an official CEFR rating.</p><div class="ar-grid">'+cards(mags)+'</div>'+
 '<h2 class="ar-section-title">100 articles · sorted by level <small>'+filtered.length+'</small></h2><div class="ar-grid">'+cards([...filtered].sort((a,b)=>levels.indexOf(a.level)-levels.indexOf(b.level)))+'</div></section>';
}
function ensureHost(){if(!host())return;host().innerHTML=active?renderArticle():buildIndex();wire();}
function cleanOCRDisplay(value){
 // Conservative display-only fixes. Original source remains intact.
 return String(value||'')
  .replace(/([A-Z])\s{2,}(?=[A-Z]\b)/g,'$1 ')
  .replace(/\b([A-Z](?:\s+[A-Z]){3,})\b/g,match=>{
   const letters=match.split(/\s+/);
   // Only join strongly recognisable OCR-split long words; don't guess word boundaries.
   const joined=letters.join('');
   const known=/^(WELLNESS|NUTRITION|EXPERTS|PROVIDES|ESSENTIAL|BALANCED|HEALTHY|SCIENCE|CLIMATE|RESEARCH|SCIENC[E]?|ENERGY|MEDICINE|TECHNOLOGY)$/;
   return known.test(joined)?joined:match;
  });
}

let arLastPhraseSavedAt=0;
function arPhraseRecords(){
 const r=rec();
 if(!Array.isArray(r.phrases))r.phrases=[];
 // Convert previously saved per-word keys into the new stable text-offset format.
 if(Array.isArray(r.highlights)&&r.highlights.length&&!r.phrasesMigrated){
  const groups=new Map();
  for(const key of r.highlights){
   const match=/^(\d+):(\d+)$/.exec(String(key));
   if(!match)continue;
   const pi=Number(match[1]),wi=Number(match[2]);
   const raw=cleanOCRDisplay(active?.body?.[pi]||'');
   const matches=[...raw.matchAll(/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g)];
   const m=matches[wi];if(!m)continue;
   const start=m.index,end=start+m[0].length;
   const id=pi+':'+start+':'+end;
   if(!groups.has(id))groups.set(id,{id,pi,start,end,text:m[0]});
  }
  const existing=new Set(r.phrases.map(x=>x.id));
  for(const p of groups.values())if(!existing.has(p.id))r.phrases.push(p);
  r.phrasesMigrated=true;persist();
 }
 return r.phrases;
}
function arPhraseMarkup(text,pi){
 const selection=arPhraseRecords().filter(x=>x.pi===pi&&x.start>=0&&x.end<=text.length&&x.end>x.start)
  .sort((a,b)=>a.start-b.start||a.end-b.end);
 let out='',at=0;
 for(const p of selection){
  if(p.start<at)continue;
  out+=E(text.slice(at,p.start))+'<mark class="ar-phrase-highlight" data-phrase-id="'+E(p.id)+'" title="Click to remove highlight">'+E(text.slice(p.start,p.end))+'</mark>';
  at=p.end;
 }
 return out+E(text.slice(at));
}
function tokenMarkup(par,pi){
 par=cleanOCRDisplay(par);
 if(stage===2||stage===4||stage===5)return arPhraseMarkup(par,pi);
 if(stage!==3)return E(par);
 const rx=/[A-Za-z]+(?:[’'-][A-Za-z]+)*/g;
 let out='',pos=0,m,j=0;
 while((m=rx.exec(par))){
  out+=E(par.slice(pos,m.index));
  out+='<button type="button" tabindex="0" data-word="'+E(m[0])+'" class="ar-word" data-hkey="'+pi+':'+j+'">'+E(m[0])+'</button>';
  pos=rx.lastIndex;j++;
 }
 return out+E(par.slice(pos));
}
function arRemovePhrase(id){
 const records=arPhraseRecords(),i=records.findIndex(x=>x.id===id);
 if(i<0)return;
 const item=records.splice(i,1)[0];persist();arRefreshParagraph(item.pi);notify('Highlight removed');
}
function arRefreshParagraph(pi){
 const node=qs('#ar-original .ar-paragraph[data-par="'+pi+'"]');
 if(node&&active?.body?.[pi])node.innerHTML=tokenMarkup(String(active.body[pi]),pi);
}
function arSaveSelection(area){
 if(stage!==2)return;
 const sel=window.getSelection();
 if(!sel||sel.isCollapsed||!sel.rangeCount)return;
 const range=sel.getRangeAt(0);
 if(!area.contains(range.startContainer)||!area.contains(range.endContainer))return;
 const paragraphs=[...area.querySelectorAll('.ar-paragraph')].filter(p=>range.intersectsNode(p));
 if(!paragraphs.length)return;
 const items=[];
 for(const p of paragraphs){
  const pi=Number(p.dataset.par);
  const section=range.cloneRange();
  if(!p.contains(section.startContainer))section.setStart(p,0);
  if(!p.contains(section.endContainer))section.setEnd(p,p.childNodes.length);
  const before=document.createRange();before.selectNodeContents(p);before.setEnd(section.startContainer,section.startOffset);
  const start=before.toString().length;
  const phrase=section.toString();
  const lead=phrase.length-phrase.trimStart().length;
  const text=phrase.trim();if(!text||text.length>500)continue;
  const clean=cleanOCRDisplay(active?.body?.[pi]||'');
  const from=start+lead,to=from+text.length;
  if(clean.slice(from,to)!==text)continue;
  items.push({id:pi+':'+from+':'+to,pi,start:from,end:to,text});
 }
 if(!items.length)return;
 const old=arPhraseRecords();
 for(const item of items){
  for(let i=old.length-1;i>=0;i--){
   const h=old[i];if(h.pi===item.pi&&h.start<item.end&&h.end>item.start)old.splice(i,1);
  }
  old.push(item);
 }
 arLastPhraseSavedAt=Date.now();sel.removeAllRanges();persist();
 for(const item of items)arRefreshParagraph(item.pi);
 notify(items.map(x=>x.text.split(/\s+/).length).reduce((a,b)=>a+b,0)+' words highlighted');
}
function listChunks(){const all=active?.body||[];const size=active.kind==='magazine'?14:40;const max=Math.max(0,Math.ceil(all.length/size)-1);block=Math.min(block,max);return {start:block*size,end:Math.min(all.length,(block+1)*size),pages:max+1}}
function readingMarkup(){
 const c=listChunks(),body=(active.body||[]).slice(c.start,c.end);
 return '<div class="ar-page-meter"><span>Reading section '+(block+1)+' / '+c.pages+'</span><span>'+E(active.words||0)+' words · '+E(active.pages||1)+' pages · '+E(arLengthLabel(active))+' · ~'+arReadingMinutes(active)+' min</span></div>'+
 '<article id="ar-original" class="ar-reading'+(stage===5?' ar-speed':'')+'">'+body.map((p,i)=>'<p class="ar-paragraph" data-par="'+(c.start+i)+'">'+tokenMarkup(String(p),c.start+i)+'</p>').join('')+'</article>'+
 (c.pages>1?'<div class="ar-pager"><button data-page="-1" '+(!block?'disabled':'')+'>← Previous pages</button><span>'+(block+1)+' / '+c.pages+'</span><button data-page="1" '+(block>=c.pages-1?'disabled':'')+'>Next pages →</button></div>':'');
}
function cartMarkup(){let c=rec().cart||[];return '<section class="ar-cart"><h3>🧺 Word basket · '+c.length+'</h3><p>Selected vocabulary from this article</p>'+(c.length?'<div class="ar-carts">'+c.map((x,i)=>'<div class="ar-basket-word"><b>'+E(x.w)+'</b><span>'+E(x.u||'Tekshirilgan tarjima kiritilmagan')+'</span><button data-remove="'+i+'" aria-label="Remove '+E(x.w)+'">×</button></div>').join('')+'</div>':'<p>No selected words yet. Choose words at Stage 3.</p>')+'</section>'}
function stageText(){
 return ['Just read the article without hints or translation.','Select any phrase with the mouse (1–10+ words) to highlight it. Click a highlighted phrase to remove it. Your highlights are saved.','Click an English word and select Add to Words. Translation is optional.','Read the article again and review your word basket below.','Use the speed reader, write a summary, and finish the quizzes.'][stage-1]
}
function stepper(){return '<div class="ar-steps">'+stageNames.map((n,i)=>'<button class="'+(stage===i+1?'current ':'')+(i+1<=(rec().stage||1)?'unlocked':'')+'" data-stage="'+(i+1)+'"><b>'+(i+1)+'</b><span>'+n+'</span></button>').join('')+'</div>'}
function gateMarkup(){
 const basket=rec().cart||[];
 if(!basket.length)return '<section class="ar-gate"><h3>Vocabulary practice</h3><p>Select English words from the passage to practise, or continue to Step 4.</p></section>';
 const list=['Match English to Uzbek','Choose the right translation','Type the English phrase','Complete a sample sentence','Final word-basket quiz'];
 return '<section class="ar-gate"><h3>Four practice games + vocabulary quiz before Step 4</h3><p>Finish four different games and a final vocabulary quiz using the words in your own basket.</p><div class="ar-gate-list">'+list.map((s,i)=>'<button data-gate="'+i+'" '+(i>gateScores.length?'disabled':'')+'>'+(i<gateScores.length?'✓ ':'')+(i+1)+'. '+s+'</button>').join('')+'</div><div id="ar-gate-play"></div>'+(gateScores.length===5||rec().gateDone?'<button class="ar-primary" id="ar-unlock">Continue to Step 4 →</button>':'')+'</section>';
}
function collocMarkup(){
 let words=active.collocations||[];
 return '<section class="ar-collocations"><h2>Speaking & Writing · '+words.length+' expressions</h2><p>Expressions extracted from the actual article text. Click one to check its meaning or add it to your study basket.</p><div class="ar-colloc-grid">'+words.map((c,i)=>'<button data-colloc="'+i+'"><b>'+E(c.w)+'</b><span class="ar-colloc-meaning" data-colloc-meaning="'+i+'">'+E(c.u||localText(c.w)||'Tekshirilgan tarjima mavjud emas')+'</span><small>Example from article: '+E((c.e||'').slice(0,145))+'</small></button>').join('')+'</div><button data-game="5" class="ar-outline">Practise collocation quiz →</button></section>';
}
function gamesMarkup(){
 const n=(rec().cart?.length||0)+(active.collocations?.length||0);
 return '<section class="ar-games"><h2>7 learning games · '+n+' expressions</h2><p>The same word basket and article collocations are used across all seven games.</p><div class="ar-game-grid">'+gameTitles.map((t,i)=>'<button data-game="'+i+'"><span>0'+(i+1)+'</span><strong>'+t+'</strong></button>').join('')+'</div><div id="ar-game-play"></div></section>';
}
function speedMarkup(){return '<section class="ar-speedbox"><h2>⏱ Speed reading</h2><p>Start the clock and read the section at a steady pace. The result is approximate words per minute.</p><div class="ar-speed-controls"><button id="ar-timer">'+(running?'Pause':'Start')+'</button><button id="ar-reset">Reset</button><strong id="ar-time">'+Math.floor(stopwatch/60)+':'+String(stopwatch%60).padStart(2,'0')+'</strong><strong id="ar-wpm">'+(stopwatch?Math.round((active.words||0)/(stopwatch/60)):0)+' WPM*</strong></div><small>*WPM estimates are meaningful only after you have read the whole article.</small></section>'}
function isUnderstandingMCQ(q){
 if(!q||!Array.isArray(q.options)||q.options.length!==4)return false;
 const prompt=String(q.text||'').trim();
 if(!prompt||/complete the exact statement|fill (?:in )?the blank|missing word|_____+|\bwhich word\b|exact phrase from the article/i.test(prompt))return false;
 return /\b(why|how|what|which|when|where|who|according to|main (?:idea|purpose|reason)|suggest|imply|infer|author|writer|conclusion|best describes|most likely|primary|view|attitude|argument|evidence)\b/i.test(prompt);
}
function understandingQuizNotice(){
 return '<section class="ar-questions"><h2>IELTS Reading · Understanding questions</h2><p>These questions should test main ideas, arguments, inference, author purpose and supporting evidence—not missing words.</p><p class="ar-warning">This article\'s existing multiple-choice questions are word-completion exercises, not verified IELTS comprehension questions. They have been hidden rather than presented as valid understanding tests. Editorial replacement is still required.</p></section>';
}
function questionMarkup(){
 let q=active.questions||{tf:[],mcq:[]}, tf=q.tf||[],mc=q.mcq||[];
 if(mc.length!==5||!mc.every(isUnderstandingMCQ))return understandingQuizNotice();
 return '<section class="ar-questions"><h2>10 reading comprehension questions</h2><p>5 True/False statements and 5 multiple-choice checks. Questions test understanding, author\'s view, evidence and inference. Review the source evidence after submitting.</p>'+
 '<div class="ar-question-group"><h3>True / False</h3>'+tf.map((x,i)=>'<div class="ar-question"><p><b>'+(i+1)+'.</b> '+E(x.text)+'</p><label><input type="radio" name="tf-'+i+'" value="true" '+(chosenAnswers['tf'+i]==='true'?'checked':'')+'> True</label><label><input type="radio" name="tf-'+i+'" value="false" '+(chosenAnswers['tf'+i]==='false'?'checked':'')+'> False</label></div>').join('')+'</div>'+
 '<div class="ar-question-group"><h3>Multiple choice</h3>'+mc.map((x,i)=>'<div class="ar-question"><p><b>'+(i+6)+'.</b> '+E(x.text)+'</p>'+(x.options||[]).map((o,j)=>'<label><input type="radio" name="mc-'+i+'" value="'+j+'" '+(chosenAnswers['mc'+i]===String(j)?'checked':'')+'> '+E(o)+'</label>').join('')+'</div>').join('')+'</div><button id="ar-grade" class="ar-primary">Check answers</button><div id="ar-score"></div></section>';
}
function renderArticle(){
 let r=rec();return '<section class="ar-shell ar-study"><button id="ar-back" class="ar-back">← All articles</button><div class="ar-studytitle">'+formatLevel(active.level)+' <small>'+(active.kind==='magazine'?'NEW SCIENTIST MAGAZINE':'ARTICLE')+' · '+E(active.pages||1)+' pages · '+E(active.words||0)+' words · ~'+arReadingMinutes(active)+' min</small><h1>'+sanitizeTitle(active.title)+'</h1></div>'+stepper()+
 '<div class="ar-stage-info"><h2>Step '+stage+' / 5 · '+stageNames[stage-1]+'</h2><p>'+stageText()+'</p>'+(stage>=3?'<button type="button" id="ar-export-pdf" class="ar-primary">⬇ Download saved words PDF (English only)</button><span class="ar-export-count"> · '+(rec().cart||[]).length+' saved</span>':'')+'</div>'+
 (active.sourceQuality?'<p class="ar-warning">Eslatma: ushbu manbaning ayrim sahifalari skanerlangan yoki PDF ustunlari aralash ajratilgan. Matn va testlar asl PDF bilan qo‘shimcha tekshirilmoqda.</p>':'')+
 (stage===5&&!active.quizQuality?'<p class="ar-warning">Manbaning ayrim joylari OCR orqali noto‘g‘ri ajratilgan bo‘lishi mumkin. Savol dalillarini asl PDF bilan tekshiring.</p>':'')+
 (stage===5&&(active.collocations||[]).some(c=>!c.u&&!localText(c.w))?'<p class="ar-warning">Ayrim collocationlarning tarjimasi hali tayyor emas. O‘yinlarga faqat tasdiqlangan tarjimali iboralar kiritiladi.</p>':'')+
 (stage===5?speedMarkup():'')+readingMarkup()+
 (stage===3?gateMarkup():'')+(stage===2?'<div id="ar-marker" hidden aria-hidden="true">🖍️</div>':'')+(stage>=4?cartMarkup():'')+
 (stage===5?'<section class="ar-summary"><h2>Write your own summary</h2><p>Explain the main idea, evidence and conclusion in English.</p><textarea id="ar-summary" rows="7" placeholder="The article explores...">'+E(r.summary||'')+'</textarea><span id="ar-summary-count">'+wordsOf(r.summary||'').length+' words</span></section>'+collocMarkup()+gamesMarkup()+questionMarkup():'')+
 '<div class="ar-stage-controls"><button id="ar-previous" '+(stage===1?'disabled':'')+'>← Previous stage</button><button id="ar-next" class="ar-primary" '+(stage===5?' hidden':'')+'>Next stage →</button></div></section>';
}
function closeTip(){if(tip){tip.remove();tip=null}}
function toggleHighlight(el){
 const key=el?.dataset?.hkey;
 if(!key)return;
 const list=rec().highlights||(rec().highlights=[]);
 const idx=list.indexOf(key);
 if(idx>=0){list.splice(idx,1);el.classList.remove('ar-highlighted');notify('Highlight removed')}
 else{list.push(key);el.classList.add('ar-highlighted');notify('Word highlighted')}
 persist();
}
function addEnglishWord(w,el,collocation=false){
 const term=String(w||'').trim();
 if(!term)return;
 const bag=rec().cart||(rec().cart=[]);
 if(bag.some(c=>norm(c.w)===norm(term))){notify('This word is already saved');return}
 const meaning=localText(term)||ARTICLE_CORE_TRANSLATIONS[norm(term)]||'';
 bag.push({w:term,u:meaning,e:collocation?el?.dataset?.example||'':el?.closest('.ar-paragraph')?.textContent?.slice(0,270)||''});
 if(stage===3){rec().gateDone=false;rec().gateScores=[];gateScores=[]}
 persist();notify(term+' saved to Words');
 if(stage>=4)ensureHost();
 else if(stage===3){const g=qs('.ar-gate');if(g){g.outerHTML=gateMarkup();wireGate()}}
}
function showTip(el,w,translationValue,collocation=false){
 closeTip();
 tip=document.createElement('aside');tip.className='ar-tooltip';
 tip.innerHTML='<strong>'+E(w)+'</strong><div class="ar-word-actions">'+
 '<button type="button" id="ar-highlight-word">🖍 Highlight / unhighlight</button>'+
 '<button type="button" class="ar-primary" id="ar-add-word">＋ Add to Words</button></div>';
 document.body.appendChild(tip);positionTip(el);
 const high=qs('#ar-highlight-word',tip);if(stage!==2||!el?.dataset?.hkey)high.hidden=true;
 const add=qs('#ar-add-word',tip);if(stage!==3)add.hidden=true;
 high?.addEventListener('click',()=>{toggleHighlight(el);closeTip()});
 qs('#ar-add-word',tip)?.addEventListener('click',()=>{addEnglishWord(w,el,collocation);closeTip()});
}
function exportEnglishPDF(){
 const list=[...new Map((rec().cart||[]).filter(x=>x&&x.w).map(x=>[norm(x.w),String(x.w).trim()])).values()];
 if(!list.length){notify('Add English words first');return}
 const title=String(active?.title||'Article').replace(/[^A-Za-z0-9 -]/g,'').trim();
 const filename='VIVID-IELTS-'+String(active?.id||'article').replace(/[^A-Za-z0-9_-]/g,'-')+'-words.pdf';
 const create=()=>{
  if(!window.jspdf?.jsPDF)return false;
  const pdf=new window.jspdf.jsPDF({unit:'mm',format:'a4'});
  pdf.setFont('helvetica','bold');pdf.setFontSize(17);pdf.text('VIVID IELTS - My English Words',15,18);
  pdf.setFont('helvetica','normal');pdf.setFontSize(10);
  const caption=pdf.splitTextToSize(title,180);pdf.text(caption,15,26);
  let y=30+caption.length*5;
  list.forEach((word,i)=>{const lines=pdf.splitTextToSize((i+1)+'. '+word,178);const h=lines.length*6;if(y+h>283){pdf.addPage();y=18}pdf.text(lines,16,y);y+=h+2});
  pdf.save(filename);notify('PDF downloaded');return true;
 };
 if(create())return;
 const js=document.createElement('script');
 js.src='https://cdnjs.cloudflare.com/ajax/libs/jspdf/2.5.2/jspdf.umd.min.js';
 js.onload=()=>{if(!create())printEnglishWords(list,title)};
 js.onerror=()=>printEnglishWords(list,title);
 document.head.appendChild(js);
}
function printEnglishWords(list,title){
 const w=window.open('','_blank');
 if(!w){notify('Enable pop-ups to save PDF');return}
 const rows=list.map((word,i)=>'<li>'+E(word)+'</li>').join('');
 w.document.write('<!doctype html><html><head><title>VIVID IELTS English Words</title><style>body{font:15px Arial;padding:28px;color:#222}h1{font-size:24px}li{padding:5px 0}@page{size:A4;margin:18mm}</style></head><body><h1>VIVID IELTS - My English Words</h1><p>'+E(title)+'</p><ol>'+rows+'</ol></body></html>');
 w.document.close();w.focus();w.print();
}
function positionTip(el){if(!tip)return;let x=mouse.x||el?.getBoundingClientRect().left||0,y=mouse.y||el?.getBoundingClientRect().bottom||0;x=Math.max(10,Math.min(window.innerWidth-295,x+10));y=Math.max(10,Math.min(window.innerHeight-175,y+14));tip.style.left=x+'px';tip.style.top=y+'px'}
async function clickWord(button,w,isColloc){mouse.x=button.getBoundingClientRect().left;mouse.y=button.getBoundingClientRect().bottom;showTip(button,w,localText(w),isColloc);let translated=await translate(w);if(!tip)return;showTip(button,w,translated,isColloc)}
async function hydrateCollocations(){
 if(!active||stage!==5)return;
 (active.collocations||[]).forEach((c,i)=>{
   if(!c.u)c.u=localText(c.w)||ARTICLE_CORE_TRANSLATIONS[norm(c.w)]||'';
   const element=qs('[data-colloc-meaning="'+i+'"]');
   if(element)element.textContent=c.u||'Tekshirilgan tarjima mavjud emas';
 });
}
function setStage(next){
 if(activeGame?.timer)clearInterval(activeGame.timer);
 qs('#ar-rush-time')?.remove();
 if(next<1||next>5)return;
 if(next>Math.max(stage+1,rec().stage||1))return;
 // Vocabulary games remain available, but never trap a reader in Step 3.
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
 if(!word.u){
  const letters=word.w.replace(/[^A-Za-z]/g,'');
  const hint=letters.slice(0,1)+'_'.repeat(Math.max(1,letters.length-1));
  box.innerHTML='<div class="ar-round"><h4>English vocabulary practice '+(i+1)+'</h4><p>Type the saved word: '+E(hint)+'</p><input id="ar-round-input" placeholder="English word"><button id="ar-round-check">Check</button><div class="ar-round-status"></div></div>';
 }else if(i===0||i===1)box.innerHTML='<div class="ar-round"><h4>'+(i===0?'Match the correct Uzbek meaning':'Choose the English collocation')+'</h4><p><strong>'+E(i===0?word.w:word.u)+'</strong></p>'+opts.map((o,j)=>'<button data-choice="'+j+'">'+E(i===0?o.u:o.w)+'</button>').join('')+'<div class="ar-round-status"></div></div>';
 else box.innerHTML='<div class="ar-round"><h4>'+(i===2?'Type the original English term':'Fill the collocation')+'</h4><p>'+E(i===2?(word.u||('English term beginning with '+word.w[0])):(word.e||('This article contains '+word.w)).replace(word.w,'_____'))+'</p><input id="ar-round-input" placeholder="Type the English term"><button id="ar-round-check">Check</button><div class="ar-round-status"></div></div>';
 const finish=()=>{if(!gateScores.includes(i)){gateScores.push(i);rec().gateScores=[...gateScores];persist()}let done=qs('.ar-round-status',box);if(done)done.textContent='✓ Correct. Open the next game.';qsa('[data-gate]').forEach((b,k)=>{b.disabled=k>gateScores.length;if(k<gateScores.length)b.textContent='✓ '+b.textContent.replace(/^✓ /,'')});if(gateScores.length===5){rec().gateDone=true;persist();const section=qs('.ar-gate');section.outerHTML=gateMarkup();wireGate()}};
 qsa('[data-choice]',box).forEach(b=>b.onclick=()=>{let selected=opts[Number(b.dataset.choice)];if(selected?.w===word.w)finish();else qs('.ar-round-status',box).textContent='Try again'});
 qs('#ar-round-check',box)?.addEventListener('click',()=>{let answer=norm(qs('#ar-round-input',box)?.value);if(answer===norm(word.w))finish();else qs('.ar-round-status',box).textContent='Try again · Hint: '+word.w.slice(0,1)+'…'});
}

function finalBasketQuiz(bag){
 const box=qs('#ar-gate-play');if(!box)return;
 const pool=bag.filter(x=>x.w);if(!pool.length)return;
 const count=Math.min(10,pool.length);let idx=0,score=0;const rows=pool.slice(0,count);
 function next(){
  if(idx===count){
   const pass=score/count>=0.6;
   box.innerHTML='<div class="ar-round"><h4>Word basket quiz</h4><p>'+score+' / '+count+' correct</p><p>'+(pass?'✓ Passed. Step 4 is unlocked.':'Score at least 60% to continue.')+'</p><button id="ar-requiz">Try quiz again</button></div>';
   qs('#ar-requiz',box).onclick=()=>finalBasketQuiz(bag);
   if(pass&&!gateScores.includes(4)){gateScores.push(4);rec().gateScores=[...gateScores];rec().gateDone=true;persist();let section=qs('.ar-gate');let html=box.innerHTML;section.outerHTML=gateMarkup();wireGate();qs('#ar-gate-play').innerHTML=html}
   return;
  }
  const row=rows[idx], reverse=idx%2===1&&Boolean(row.u),options=[row,...pool.filter(x=>x.w!==row.w).slice(0,3)];
  if(options.length===1)options.push({w:'Other word',u:'Boshqa tarjima'});
  options.sort((a,b)=>String(a.w).localeCompare(String(b.w)));
  box.innerHTML='<div class="ar-round"><h4>Quiz '+(idx+1)+' / '+count+'</h4><p>'+E(row.u?(reverse?row.u:row.w):('Choose the saved word: '+row.w.slice(0,1)+'…'))+'</p>'+options.map((x,j)=>'<button data-quiz-option="'+j+'">'+E(row.u?(reverse?x.w:x.u):x.w)+'</button>').join('')+'<div class="ar-round-status"></div><button id="ar-quiz-next" hidden>Next →</button></div>';
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
function englishOnlyGame(mode,dest){
 const entries=[...(rec().cart||[]),...(active?.collocations||[])].filter(x=>x.w);
 const pool=[...new Map(entries.map(x=>[norm(x.w),x.w])).values()];
 if(!pool.length){dest.innerHTML='<p>First add an English word in Step 3.</p>';return}
 let index=0,score=0;
 function round(){
  if(index>=pool.length){
   const g=rec().games||(rec().games={}),previous=g[mode]||{};
   g[mode]={attempts:(previous.attempts||0)+1,best:Math.max(previous.best||0,score),total:pool.length};
   persist();
   dest.innerHTML='<div class="ar-round"><h3>'+E(gameTitles[mode])+'</h3><p>'+score+' / '+pool.length+' correct</p><button class="ar-primary" id="ar-replay">Try again</button></div>';
   qs('#ar-replay',dest).onclick=()=>englishOnlyGame(mode,dest);return;
  }
  const answer=pool[index],hint=answer[0]+'_'.repeat(Math.max(1,answer.length-1));
  dest.innerHTML='<div class="ar-round"><h3>'+E(gameTitles[mode])+' · '+(index+1)+'/'+pool.length+'</h3><p>Recall the saved English word: '+E(hint)+'</p><input id="ar-english-guess" placeholder="Type English word"><button id="ar-english-check">Check</button><p class="ar-round-status"></p></div>';
  const check=()=>{const input=qs('#ar-english-guess',dest);if(!input||input.disabled)return;
   const yes=norm(input.value)===norm(answer);if(yes)score++;
   input.disabled=true;qs('#ar-english-check',dest).textContent='Next →';
   qs('.ar-round-status',dest).textContent=yes?'Correct!':'Answer: '+answer;
   qs('#ar-english-check',dest).onclick=()=>{index++;round()};
  };
  qs('#ar-english-check',dest).onclick=check;
  qs('#ar-english-guess',dest).onkeydown=e=>{if(e.key==='Enter'){e.preventDefault();qs('#ar-english-check',dest)?.click()}};
 }
 round();
}
function openGame(mode) {
  if (!Number.isInteger(mode) || mode < 0 || mode > 6) return;
  if (activeGame?.timer) clearInterval(activeGame.timer);
  const dest=qs('#ar-game-play');if(!dest)return;
  qs('#ar-rush-time')?.remove();
  const seen=new Set();
  const pool=gameWords().filter(w=>{const key=norm(w.w);if(!key||!w.u||seen.has(key))return false;seen.add(key);return true});
  if (!pool.length){return englishOnlyGame(mode,dest)}
  if ([1,4,5,6].includes(mode)&&pool.length<2){dest.innerHTML='<p>Bu o‘yin uchun kamida 2 ta turli tarjimali ibora kerak. 3-bosqichda yana so‘z qo‘shing.</p>';return}
  const shuffled = a=>a.map(x=>({x,r:Math.random()})).sort((x,y)=>x.r-y.r).map(o=>o.x);
  let order=shuffled(pool), index=0, score=0, locked=false, finished=false;
  activeGame={mode,timer:null};
  const renderResult=()=>{
    finished=true;if(activeGame?.timer)clearInterval(activeGame.timer);
    qs('#ar-rush-time')?.remove();
    const state=rec();state.games=state.games||{};const previous=state.games[mode]||{};
    state.games[mode]={attempts:(previous.attempts||0)+1,best:Math.max(previous.best||0,score),total:order.length};persist();
    dest.innerHTML='<div class="ar-round"><h3>'+E(gameTitles[mode])+' · Natija</h3><p>'+score+' / '+order.length+' to‘g‘ri javob</p><button id="ar-replay" class="ar-primary">↻ Qayta o‘ynash</button></div>';
    qs('#ar-replay',dest).onclick=()=>openGame(mode);
  };
  const next=()=>{if(finished)return;index++;if(index>=order.length){renderResult();return}turn()};
  const normalizeInput=v=>norm(v).replace(/[.!?;:,]+$/g,'').replace(/\s+/g,' ');
  const answer=(isCorrect,correctAnswer)=>{
    if(locked||finished)return;locked=true;if(isCorrect)score++;
    const label=qs('.ar-round-status',dest);if(label)label.textContent=isCorrect?'✓ To‘g‘ri':'✗ To‘g‘ri javob: '+correctAnswer;
    qsa('.ar-round [data-answer]',dest).forEach(btn=>btn.disabled=true);
    const input=qs('#ar-answer',dest);if(input)input.disabled=true;
    const submit=qs('#ar-submit',dest);if(submit)submit.disabled=true;
    const nxt=qs('#ar-game-next',dest);if(nxt)nxt.hidden=false;
  };
  const optionsFor=w=>{
    const distinct=shuffled(pool.filter(x=>norm(x.w)!==norm(w.w)&&norm(x.u)!==norm(w.u)));
    return shuffled([w,...distinct.slice(0,3)]);
  };
  const round=(body,showNext=true)=>{
    locked=false;dest.innerHTML='<div class="ar-round"><h3>'+E(gameTitles[mode])+'</h3><p>'+String(index+1)+' / '+order.length+'</p>'+body+'<p class="ar-round-status" aria-live="polite"></p>'+(showNext?'<button id="ar-game-next" hidden class="ar-primary">Keyingisi →</button>':'')+'</div>';
    qs('#ar-game-next',dest)?.addEventListener('click',next);
  };
  function turn(){
    if(index>=order.length){renderResult();return}
    const word=order[index];
    const options=optionsFor(word);
    if(mode===0){
      round('<p class="ar-game-term">'+E(word.w)+'</p><button id="ar-reveal">Tarjimasini ko‘rish</button><div id="ar-flash-back" hidden><p>'+E(word.u)+'</p><button id="ar-know">Bilaman ✓</button><button id="ar-retry">Yana takrorlayman</button></div>',false);
      qs('#ar-reveal',dest).onclick=()=>{qs('#ar-flash-back',dest).hidden=false;qs('#ar-reveal',dest).disabled=true};
      qs('#ar-know',dest).onclick=()=>{score++;next()};
      qs('#ar-retry',dest).onclick=next;return;
    }
    if(mode===1){
      const pack=order.slice(index,Math.min(index+4,order.length));
      const answers=shuffled(pack.map(x=>({...x})));
      round('<p>Chapdagi iborani o‘ngdagi tarjimaga moslang.</p><div class="ar-match-pairs"><div>'+pack.map((w,i)=>'<button data-pick-en="'+i+'">'+E(w.w)+'</button>').join('')+'</div><div>'+answers.map((w,i)=>'<button data-pick-uz="'+i+'">'+E(w.u)+'</button>').join('')+'</div></div><small class="ar-match-count">0 / '+pack.length+'</small>',false);
      let selected=-1,matched=0;
      qsa('[data-pick-en]',dest).forEach(b=>b.onclick=()=>{if(b.disabled)return;selected=Number(b.dataset.pickEn);qsa('[data-pick-en]',dest).forEach(x=>x.classList.remove('is-picking'));b.classList.add('is-picking')});
      qsa('[data-pick-uz]',dest).forEach(b=>b.onclick=()=>{
        if(b.disabled||selected<0)return;
        const original=pack[selected],chosen=answers[Number(b.dataset.pickUz)];
        if(norm(original.w)===norm(chosen.w)){
          b.disabled=true;qs('[data-pick-en="'+selected+'"]',dest).disabled=true;
          qs('[data-pick-en="'+selected+'"]',dest).classList.add('is-matched');b.classList.add('is-matched');
          matched++;score++;qs('.ar-match-count',dest).textContent=matched+' / '+pack.length;
          if(matched===pack.length){index+=pack.length;if(index>=order.length)renderResult();else turn()}
        }else{qs('.ar-round-status',dest).textContent='Qayta urinib ko‘ring'}
        selected=-1;qsa('[data-pick-en]',dest).forEach(x=>x.classList.remove('is-picking'));
      });return;
    }
    if(mode===2||mode===3){
      const evidence=String(word.e||'');
      const at=evidence.toLowerCase().indexOf(word.w.toLowerCase());
      const gap=mode===3&&at>=0?evidence.slice(0,at)+'_____'+evidence.slice(at+word.w.length):'Ma’nosi: '+word.u;
      const title=mode===3?'Asl matndagi bo‘shliqni to‘ldiring':'Tarjimasiga qarab inglizchasini yozing';
      round('<p>'+E(title)+'</p><p class="ar-game-term">'+E(mode===3?gap:word.u)+'</p><input id="ar-answer" autocomplete="off" spellcheck="false" placeholder="Inglizcha javobni yozing"><button id="ar-submit">Tekshirish</button>');
      const check=()=>answer(normalizeInput(qs('#ar-answer',dest)?.value)===normalizeInput(word.w),word.w);
      qs('#ar-submit',dest).onclick=check;
      qs('#ar-answer',dest).addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();if(!locked)check();else next()}});
      return;
    }
    const reverse=mode===6;
    const itemText=reverse?word.u:word.w;
    const choices=options.map((o,i)=>'<button data-answer="'+i+'">'+E(reverse?o.w:o.u)+'</button>').join('');
    const label=mode===4?'Talaffuzni tinglang va tarjimasini belgilang':mode===6?'Tez javob bering: inglizchasini tanlang':'To‘g‘ri o‘zbekcha tarjimani belgilang';
    round('<p>'+E(label)+'</p><p class="ar-game-term">'+E(itemText)+'</p>'+(mode===4?'<button id="ar-say">🔊 Eshitish</button>':'')+'<div class="ar-options">'+choices+'</div>');
    qs('#ar-say',dest)?.addEventListener('click',()=>{
      if('speechSynthesis' in window){window.speechSynthesis.cancel();const voice=new SpeechSynthesisUtterance(word.w);voice.lang='en-US';window.speechSynthesis.speak(voice)}
      else qs('.ar-round-status',dest).textContent='Bu qurilmada ovoz chiqarish qo‘llab-quvvatlanmaydi.';
    });
    qsa('[data-answer]',dest).forEach(b=>b.onclick=()=>{
      if(finished)return;const chosen=options[Number(b.dataset.answer)];
      answer(norm(chosen?.w)===norm(word.w),reverse?word.w:word.u);
    });
  }
  if(mode===6){
    const seconds=60;
    const badge=document.createElement('div');badge.id='ar-rush-time';badge.setAttribute('aria-live','polite');
    dest.before(badge);let remaining=seconds;
    const display=()=>{badge.textContent='⏳ '+remaining+' soniya'};
    display();const timer=setInterval(()=>{
      remaining--;display();if(remaining<=0){clearInterval(timer);if(!finished)renderResult();badge.remove()}
    },1000);activeGame.timer=timer;
  }
  turn();
  dest.scrollIntoView({behavior:'smooth',block:'nearest'});
}

function wireArticle(){
 qs('#ar-back')?.addEventListener('click',()=>{if(activeGame?.timer)clearInterval(activeGame.timer);qs('#ar-rush-time')?.remove();active=null;closeTip();running=false;clearInterval(ticker);history.replaceState(null,'','#articles');ensureHost()});
 qsa('[data-stage]').forEach(b=>b.onclick=()=>setStage(Number(b.dataset.stage)));
 qs('#ar-previous')?.addEventListener('click',()=>setStage(stage-1));
 qs('#ar-next')?.addEventListener('click',()=>setStage(stage+1));
 qsa('[data-page]').forEach(b=>b.onclick=()=>{block+=Number(b.dataset.page);ensureHost()});
 if(stage===2){
  const area=qs('#ar-original');
  area?.addEventListener('mouseup',()=>arSaveSelection(area));
  area?.addEventListener('keyup',event=>{if(event.shiftKey||['Shift','ArrowLeft','ArrowRight','ArrowUp','ArrowDown'].includes(event.key))arSaveSelection(area)});
 }
 if(stage===2||stage===4||stage===5){
  qs('#ar-original')?.addEventListener('click',event=>{
   const mark=event.target.closest('.ar-phrase-highlight');
   if(mark&&Date.now()-arLastPhraseSavedAt>450&&!window.getSelection()?.toString())arRemovePhrase(mark.dataset.phraseId);
  });
 }
 if(stage===2||stage===3)qsa('[data-word]').forEach(b=>b.addEventListener('click',()=>clickWord(b,b.dataset.word,false)));
 qs('#ar-export-pdf')?.addEventListener('click',exportEnglishPDF);
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
   const submitted=tf.filter((x,i)=>chosenAnswers['tf'+i]!==undefined).length+mc.filter((x,i)=>chosenAnswers['mc'+i]!==undefined).length;
   if(total===10&&submitted===10){rec().complete=true;rec().score=correct;persist()}
   else if(submitted<total){qs('#ar-score').textContent='Avval barcha '+total+' ta savolga javob bering. Hozir '+submitted+' tasi belgilangan.';return}
   qs('#ar-score').innerHTML='<h3>'+correct+' / '+total+' correct</h3><details><summary>Review answers and source evidence</summary>'+lines.map(l=>'<p>'+l+'</p>').join('')+'</details>';
  });
 }
}
function wire(){
 if(active){wireArticle();return}
 qs('#ar-level')?.addEventListener('change',e=>{level=e.target.value;ensureHost()});
 qs('#ar-search')?.addEventListener('input',e=>{query=e.target.value;ensureHost();let i=qs('#ar-search');if(i){i.focus();i.setSelectionRange(query.length,query.length)}});
 qsa('[data-open]').forEach(b=>b.addEventListener('click',()=>startArticle(b.dataset.open)));
 arWirePhotos();
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
document.addEventListener('DOMContentLoaded',async()=>{await initData();await Promise.all([applyReviewedMCQ(),arLoadPhotoQueries(),arLoadEditorialTitles(),arLoadPinnedPhotos()]);arSanitizeImageCache();if(location.hash.startsWith('#articles'))setTimeout(activate,400)});
window.VividArticles={open:activate,importData:arr=>{db=cleanContent(arr);activate()},getLibrary:()=>db};
})();
