const fs = require('fs');
const path = require('path');
const vm = require('vm');
const repo = path.resolve(__dirname, '../..');

// Extract only bounded data literals, never execute an application or HTML page.
function literalAt(text, start) {
  const stack=[]; let quote=null, escaped=false, lineComment=false, blockComment=false;
  for(let i=start;i<text.length;i++) {
    const c=text[i], n=text[i+1];
    if(lineComment){if(c==='\n')lineComment=false;continue;}
    if(blockComment){if(c==='*'&&n==='/'){blockComment=false;i++;}continue;}
    if(quote){if(escaped)escaped=false;else if(c==='\\')escaped=true;else if(c===quote)quote=null;continue;}
    if(c==='"'||c==="'"){quote=c;continue;}
    if(c==='/'&&n==='/'){lineComment=true;i++;continue;}
    if(c==='/'&&n==='*'){blockComment=true;i++;continue;}
    if(c==='['||c==='{')stack.push(c);
    else if(c===']'||c==='}') {
      const expected=c===']'?'[':'{';
      if(stack.pop()!==expected)throw Error('Unbalanced literal');
      if(!stack.length)return text.slice(start,i+1);
    }
  }
  throw Error('Unclosed literal');
}
function readLiteral(file, pattern){
  const text=fs.readFileSync(path.join(repo,file),'utf8'),match=pattern.exec(text);
  if(!match)throw Error('Missing literal in '+file);
  const start=match.index+match[0].length-1;
  const raw=literalAt(text,start);
  const value=vm.runInNewContext('('+raw+')',Object.create(null),{timeout:1000,contextCodeGeneration:{strings:false,wasm:false}});
  return {file,line:text.slice(0,start).split('\n').length,value};
}
const out={c1:[]};
for(const file of fs.readdirSync(repo).filter(x=>x.endsWith('.html')).sort()) {
  const text=fs.readFileSync(path.join(repo,file),'utf8');
  if(/const\s+C1_WORDS\s*=\s*\[/.test(text))out.c1.push(readLiteral(file,/const\s+C1_WORDS\s*=\s*\[/));
}
out.readingHints=readLiteral('app.js',/function rbWordHints\(sentence\)\{const dictionary=\[/);
out.articleCore=readLiteral('articles-engine.js',/const ARTICLE_CORE_TRANSLATIONS=\{/);
out.maxBank=readLiteral('app.js',/const maxSpeakingBank=\{/);
out.readingBank=readLiteral('app.js',/const readingBoosterBank=\{/);
process.stdout.write(JSON.stringify(out));
