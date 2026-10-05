(() => {
  'use strict';
  const VERSION='v37-2026-10-05';

  function hash(input){let x=2166136261>>>0;for(const ch of String(input||'')){x^=ch.charCodeAt(0);x=Math.imul(x,16777619)>>>0}return x>>>0}
  const choose=(arr,seed,step=0)=>arr[((seed+(step*2654435761>>>0))>>>0)%arr.length];

  const scenes=[
    'during a Monday seminar','after a school debate','while planning a group project','during a library study session',
    'after reading a research article','in a conversation with a classmate','during a mock IELTS interview','while preparing a presentation',
    'at a community meeting','during a university workshop','after comparing two reports','while reviewing exam notes',
    'during an online class','after a teacher gave feedback','while discussing a local issue','during a study-group break',
    'after watching a documentary','while analysing a survey','during a career-planning session','after a classroom experiment',
    'while preparing for a speaking test','during a writing practice session','after reading the morning news','while working on a science project',
    'during a student council meeting','after a short podcast episode','while discussing a case study','during an evening revision session',
    'after checking several sources','while preparing a class poster','during a peer-feedback session','after a weekend field trip'
  ];

  const reasons=[
    'because the first explanation was too vague','so the main point became easier to understand','because the group needed a more precise example',
    'and the discussion immediately became more specific','so everyone could see the practical consequence','because the evidence pointed in that direction',
    'and it helped separate fact from opinion','so the speaker could avoid repeating basic words','because the contrast mattered in that example',
    'and it gave the answer a clearer focus','so the conclusion sounded more convincing','because the situation had changed unexpectedly',
    'and it connected the example to real life','so the listener could follow the argument more easily','because the detail was important for the final decision',
    'and it made the comparison more balanced','so the paragraph had a stronger central idea','because the class wanted a concrete illustration',
    'and it clarified what happened next','so the explanation did not sound memorised','because the topic required a careful distinction',
    'and it made the cause-and-effect relationship clearer','so the example supported the claim directly','because the group was comparing different viewpoints',
    'and it helped the speaker sound more natural','so the listener understood the intended meaning at once','because the point needed a realistic context',
    'and it strengthened the final response','so the idea fitted the topic instead of sounding generic','because the example needed a clear outcome',
    'and it made the explanation easier to remember','so the sentence carried one precise message'
  ];

  const nounFrames=[
    t=>'The discussion focused on '+t,
    t=>'The report highlighted '+t,
    t=>'The class examined '+t,
    t=>'The speaker raised the issue of '+t,
    t=>'The article drew attention to '+t,
    t=>'The group compared different views on '+t,
    t=>'The presentation included a clear example of '+t,
    t=>'The students questioned the role of '+t,
    t=>'The final paragraph returned to '+t,
    t=>'The survey revealed an important pattern involving '+t,
    t=>'The teacher asked the class to think about '+t,
    t=>'The case study showed why '+t+' matters',
    t=>'The debate became more interesting when '+t+' came up',
    t=>'The researcher linked the results to '+t,
    t=>'The team identified '+t+' as a key factor',
    t=>'The interview touched on '+t
  ];

  const verbSubjects=['Many students','Young professionals','Local residents','The research team','Several classmates','New employees','Language learners','Community volunteers','University students','Small businesses','Parents','Teachers','City planners','Online learners','Project teams','International students'];
  const verbTails=['when the deadline is close','when they need a practical result','before making a final decision','when the original plan stops working','to improve the outcome','to deal with an unexpected problem','when they want a more reliable result','before the next stage begins','when time is limited','to make steady progress','when the situation becomes more demanding','after receiving detailed feedback','when they need to adapt quickly','to avoid the same mistake again','before presenting their work','when the evidence changes'];
  const adjSubjects=['The proposal','The new policy','The final result','The change','The solution','The argument','The trend','The method','The response','The evidence','The design','The decision','The plan','The situation','The outcome','The approach'];
  const advSubjects=['The figures changed','The students responded','The situation developed','The project improved','The discussion shifted','The results differed','The costs increased','The team adapted','The pattern changed','The speaker reacted','The process moved','The demand grew','The performance improved','The conditions changed','The group responded','The outcome shifted'];

  const commonVerbs=new Set('achieve adapt address adopt affect allow analyse avoid balance become begin build change choose compare consider create cut deal decide develop encourage expand explain explore face find focus gain get give handle help improve increase keep learn make manage maintain meet overcome prevent protect provide raise reach reduce replace solve spend support take track understand use work'.split(' '));

  function typeOfTerm(term,def){
    const t=String(term||'').trim().toLowerCase();
    const first=t.split(/\s+/)[0].replace(/[^a-z'-]/g,'');
    const d=String(def||'').trim().toLowerCase();
    if(!t.includes(' ')&&/ly$/.test(t))return'adverb';
    if(d.startsWith('to ')||commonVerbs.has(first)||/^(be|have|do|make|take|give|keep|set|put|come|go|get|cut|bring|carry|look|work|play|learn|study|use|show|lead|find|build|develop|improve|reduce|increase|create|provide|support|protect|avoid|encourage|manage|maintain|expand|gain|achieve|overcome|deal|focus|raise|address|adopt|adapt)\b/.test(t))return'verb';
    if(!t.includes(' ')&&/(ous|ive|ful|less|able|ible|al|ic|ary|ory|ent|ant|ed|ing)$/.test(t))return'adj';
    return'noun';
  }

  function sentence(w,slot=0){
    const term=String(w?.w||w?.term||'').trim();
    if(!term)return'';
    const def=String(w?.d||w?.u||w?.uz||'').trim();
    const seed=hash(String(w?.id??term)+'|'+String(w?.t||w?.kind||'')+'|'+slot);
    const scene=choose(scenes,seed,slot+3);
    const reason=choose(reasons,seed,slot+11);
    const kind=typeOfTerm(term,def);
    let s='';
    if(kind==='verb'){
      s=choose(verbSubjects,seed,slot+5)+' often '+term+' '+choose(verbTails,seed,slot+13)+', '+reason;
    }else if(kind==='adj'){
      s=choose(adjSubjects,seed,slot+7)+' seemed '+term+' '+scene+', '+reason;
    }else if(kind==='adverb'){
      s=choose(advSubjects,seed,slot+9)+' '+term+' '+scene+', '+reason;
    }else{
      s=choose(nounFrames,seed,slot+2)(term)+' '+scene+', '+reason;
    }
    return s.replace(/\s+/g,' ').replace(/\s+,/g,',').replace(/\.+$/,'')+'.';
  }

  function escapeRx(s){return String(s||'').replace(/[.*+?^$(){}|[\]\\]/g,'\\$&')}
  function mask(text,term){
    try{const r=new RegExp(escapeRx(term),'i');if(r.test(text))return text.replace(r,'_____')}catch{}
    return text+' _____';
  }

  try{
    practiceExampleFor=(w,variant=0)=>sentence(w,100+Number(variant||0));
    naturalExampleFor=(w,variant=0)=>sentence(w,200+Number(variant||0));
    gapText=(w,variant=0)=>mask(sentence(w,300+Number(variant||0)),w.w);

    gameTypingPrompt=(w)=>{
      const n=hash(String(w.id??w.w)+'|typing')%4;
      if(n===0)return{label:'Yangi kontekstdagi bo‘shliqni to‘ldiring',text:mask(sentence(w,401),w.w)};
      if(n===1)return{label:'O‘zbekcha ma’noga qarab inglizchasini yozing',text:w.u};
      if(n===2)return{label:'Boshqa kontekstdagi iborani yozing',text:mask(sentence(w,402),w.w)};
      return{label:'Harf yordami bilan so‘z yoki iborani yozing',text:String(w.u||'')+' · '+String(w.w||'').split(/\s+/).map(x=>x.charAt(0).toUpperCase()+'…').join(' ')};
    };

    gameChoicePrompt=(w,mode,index)=>{
      const base=mode==='rush'?520:510;
      const n=hash(String(w.id??w.w)+'|'+mode+'|'+index)%3;
      if(n===0)return{reverse:false,label:'Kontekstdagi so‘z yoki iboraning ma’nosini toping',text:sentence(w,base+(index%17))};
      if(n===1)return{reverse:true,label:'Qaysi inglizcha so‘z yoki ibora shu ma’noga mos?',text:w.u};
      return{reverse:false,label:'Bu yangi misolda ishlatilgan iboraning ma’nosi qaysi?',text:sentence(w,base+31+(index%19))};
    };

    const oldCardMarkup=cardMarkup;
    cardMarkup=(w,back=false,cls='')=>{
      if(!back)return oldCardMarkup(w,false,cls);
      return oldCardMarkup({...w,e:sentence(w,600)},true,cls);
    };
  }catch(e){console.warn('Unique game context overrides:',e)}

  try{
    if(typeof maxSpeakingBank!=='undefined'&&Array.isArray(maxSpeakingBank.topics)){
      for(const topic of maxSpeakingBank.topics){
        for(const entry of topic.entries||[]){
          const item={id:entry.id,w:entry.term,u:entry.uz,d:entry.uz,t:topic.title};
          entry.examples=[sentence(item,701),sentence(item,702)];
          entry.prompts=[
            topic.title+': “'+entry.uz+'” ma’nosini o‘z fikringizda ishlating va bitta aniq sabab qo‘shing.',
            topic.title+': “'+entry.uz+'” ma’nosini boshqa real vaziyat bilan tushuntiring va natijasini ayting.'
          ];
        }
      }
    }
  }catch(e){console.warn('Speaking collocation contexts:',e)}

  window.VividUniqueGameContexts={version:VERSION,sentence};
})();