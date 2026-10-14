/* VIVID IELTS: revised Writing Grammar Book exercises, 2026-10-14 */
(function(){
'use strict';
const tidy=s=>String(s||'').replace(/\s+/g,' ').trim();
const lower=s=>tidy(s).toLowerCase().replace(/[’‘]/g,"'");
function hash(s){let n=2166136261;for(const c of String(s)){n^=c.charCodeAt(0);n=Math.imul(n,16777619)}return n>>>0}
function mix(arr,seed){return arr.map((v,i)=>({v,n:hash(seed+':'+i+':'+v)})).sort((a,b)=>a.n-b.n).map(x=>x.v)}
function distinct(a){return [...new Set(a.filter(Boolean).map(tidy))]}
function selections(answer,choices,seed){return mix([answer,...mix(distinct(choices).filter(x=>lower(x)!==lower(answer)),seed).slice(0,3)],seed+'-last')}
function refresh(db){
 if(!db||db.__writingGrammarRevision==='2026-10-14')return db;
 const banks=[db.bookGrammarTopics,db.task1Structures,db.task2Structures].filter(Array.isArray);
 for(const bank of banks)for(let ti=0;ti<bank.length;ti++){
   const topic=bank[ti],name=tidy(topic.pattern||topic.title||'Advanced grammar');
   const samples=(topic.examples||[]).map(e=>({en:tidy(e.en||e),uz:tidy(e.uz)})).filter(x=>x.en.length>=10);
   if(!samples.length)continue;
   const models=j=>samples[j%samples.length];
   const others=bank.filter((x,i)=>i!==ti);
   const patterns=distinct(others.map(x=>x.pattern||x.title));
   const meanings=distinct(others.map(x=>x.meaning||x.uzMeaning));
   const otherExamples=distinct(others.flatMap(x=>(x.examples||[]).map(z=>z.en||z)));
   const ownMeaning=tidy(topic.meaning||topic.uzMeaning||name);
   const out=[];
   function add(type,skill,prompt,answer,options=[],review=false,model){
     out.push({n:out.length+1,type,skill,prompt,answer,model:model||answer,options,review,level:'B2–C1',anchor:''});
   }
   add('mcq','RULE / USE','Which grammar pattern is being taught in this chapter?',name,selections(name,patterns,name+':1'));
   add('mcq','RULE / USE','Which explanation best describes the purpose of "'+name+'"?',ownMeaning,selections(ownMeaning,meanings,name+':2'));
   add('mcq','RULE / USE','Which advanced construction should be used in this chapter?',name,selections(name,patterns,name+':3'));
   for(let j=0;j<3;j++){
     const en=models(j).en;
     add('mcq','IDENTIFY','Select the sentence that demonstrates "'+name+'". Example set '+(j+1)+'.',en,selections(en,otherExamples,name+':id:'+j));
   }
   const triggers=['not only','but also','rather than','even though','provided that','in spite of','as long as','in order to','so that','whereas','although','having','unless','despite','whether','while','should','could','would','what','which','that','were','had','if','as'];
   for(let j=0;j<3;j++){
     const en=models(j).en, words=(name.toLowerCase().match(/[a-z]+/g)||[]);
     const candidates=[...triggers.filter(x=>words.includes(x.split(' ')[0])),...triggers];
     const token=candidates.find(x=>en.toLowerCase().includes(x))||(en.match(/[A-Za-z']+/g)||[])[0];
     if(!token)continue;
     const at=en.toLowerCase().indexOf(token.toLowerCase());
     const blank=en.slice(0,at)+'________'+en.slice(at+token.length);
     add('gap','GAP FILL','Supply the missing word or phrase in this authentic model:\n'+blank,token,[],false,en);
   }
   for(let j=0;j<3;j++){
     const en=models(j).en,parts=en.match(/[A-Za-z]+(?:['’][A-Za-z]+)?|[0-9]+|[,.!?;:]/g)||[];
     let scrambled=mix(parts,name+':order:'+j);
     if(scrambled.join(' ')===parts.join(' '))scrambled=[...scrambled].reverse();
     add('reorder','WORD ORDER','Rebuild this sentence in the correct grammatical order:\n'+scrambled.join(' / '),en,[],false,en);
   }
   for(let j=0;j<3;j++){
     const trueStatement=(j!==1),statement=trueStatement?ownMeaning:meanings[(hash(name+':false')+j)%Math.max(1,meanings.length)]||'This is a different structure.';
     add('mcq','TRUE / FALSE','Does the following explanation describe "'+name+'"?\n'+statement,trueStatement?'True':'False',['True','False']);
   }
   for(let j=0;j<3;j++){
     const e=models(j);
     add('translate','TRANSLATION',e.uz?'Translate the following Uzbek sentence into natural academic English using "'+name+'":\n'+e.uz:'Write a natural English sentence that illustrates "'+name+'" in a new context.',e.en,[],true,e.en);
   }
   for(let j=0;j<3;j++){
     const e=models(j);
     add('rewrite','REWRITE','Paraphrase the following argument in your own words while retaining "'+name+'":\n'+e.en,e.en,[],true,e.en);
   }
   for(let j=0;j<3;j++){
     const e=models(j),parts=e.en.split(/[,;:]\s+/).filter(Boolean);
     const p=parts.length>1?'Join these related clauses fluently using "'+name+'":\nA. '+parts[0]+'\nB. '+parts.slice(1).join('; '):'Write one coherent academic sentence connecting an argument and its implication with "'+name+'". Develop the idea below:\n'+e.en;
     add('combine','COMBINE',p,e.en,[],true,e.en);
   }
   for(let j=0;j<3;j++){
     const e=models(j);
     add('improve','ACADEMIC UPGRADE','Make the following claim more precise and formal without losing the structure "'+name+'":\n'+e.en,e.en,[],true,e.en);
   }
   const contexts=['school funding and unequal opportunities','the effectiveness of preventive healthcare','the environmental costs of private transport','the regulation of artificial intelligence','the effects of flexible working hours','public investment in renewable energy','the accessibility of university education','the changing role of social media','housing affordability in growing cities','long-term protection of cultural heritage','how to make local communities safer','whether economic growth improves quality of life'];
   for(let j=0;j<3;j++){
     const c=contexts[(ti*3+j)%contexts.length];
     add('own','INDEPENDENT SENTENCE','Write a new IELTS argument about '+c+' using "'+name+'". Develop one clear reason or consequence. Do not copy a sample.',models(j).en,[],true,models(j).en);
   }
   if(out.length===30)topic.exercises=out;
 }
 Object.defineProperty(db,'__writingGrammarRevision',{value:'2026-10-14',configurable:true});
 return db;
}
window.VividWritingGrammar2026={refresh};
})();