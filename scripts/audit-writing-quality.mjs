/**
 * Run with: node scripts/audit-writing-quality.mjs
 * Audits the real writing-data.json in the repository, without network access.
 */
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';
const load=p=>readFileSync(new URL('../'+p,import.meta.url),'utf8');
const data=JSON.parse(load('writing-data.json'));
const win={};
const doc={addEventListener(){}};
runInNewContext(load('writing-grammar-refresh.js'),{window:win,console});
runInNewContext(load('writing-collocation-games.js'),{window:win,document:doc,console});
const issues=[];
const report={banks:[],topics:[],collocations:0,contexts:0,grammarExercises:0};
const modes=['flashcard','multiple-choice','fill-gap','word-rush','typing','sentence-builder','study-0','study-1'];
for(const [bankName,bank] of Object.entries({GrammarBook:data.bookGrammarTopics||[],Task1:data.task1Structures||[],Task2:data.task2Structures||[]})){
 const before=bank.length;
 win.VividWritingGrammar2026.refresh(data);
 let count=0;
 for(const topic of bank){
  const tests=topic.exercises||[];
  count+=tests.length;
  if(tests.length!==30)issues.push(bankName+': '+(topic.title||topic.pattern||topic.id)+' has '+tests.length+' exercises, expected 30');
  const prompts=tests.map(x=>x.prompt.replace(/\s+/g,' ').toLowerCase());
  if(new Set(prompts).size!==prompts.length)issues.push(bankName+': '+(topic.title||topic.pattern||topic.id)+' has duplicate prompts');
  for(const t of tests){
   if(t.type==='mcq'&&!(t.options||[]).includes(t.answer))issues.push(bankName+': invalid MCQ answer, '+topic.id+' #'+t.n);
   if(t.type==='gap'&&!t.prompt.includes('________'))issues.push(bankName+': missing gap, '+topic.id+' #'+t.n);
  }
 }
 report.grammarExercises+=count;report.banks.push({name:bankName,topics:before,exercises:count});
}
for(const topic of data.collocationTopics||[]){
 const title=topic.topic||topic.title||'Writing';
 const original=topic.cards||[];
 const cards=win.VividWritingCollocations.cardsOf(original,title);
 report.collocations+=cards.length;
 if(!cards.length&&original.length)issues.push('No recognised collocations in '+title);
 let checked=0;
 for(const c of cards){
  const sentences=modes.map(mode=>win.VividWritingCollocations.sentence(c,mode));
  report.contexts+=sentences.length;checked++;
  if(new Set(sentences.map(s=>s.toLowerCase())).size!==sentences.length)issues.push('Duplicate practice sentences: '+title+' / '+c.term);
  if(sentences.some(s=>!s.toLowerCase().includes(c.term.replace(/^to\s+/i,'').toLowerCase())))issues.push('Collocation absent from model: '+title+' / '+c.term);
 }
 report.topics.push({topic:title,cards:checked});
}
console.log(JSON.stringify({...report,problems:issues.length,issues:issues.slice(0,150)},null,2));
if(issues.length)process.exitCode=1;
