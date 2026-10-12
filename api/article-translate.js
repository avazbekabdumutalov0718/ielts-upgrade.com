/* Server-side Uzbek translation for the Articles learning module.
   External translation services can be unavailable; callers must handle missing results. */
'use strict';
const clean = value => String(value || '').replace(/[\r\n\t<>]/g,' ').replace(/\s+/g,' ').trim().slice(0,120);
async function fetchJSON(url) {
 const controller = new AbortController();
 const timer = setTimeout(() => controller.abort(), 5000);
 try {
  const resp = await fetch(url,{signal:controller.signal,headers:{'User-Agent':'VIVID-IELTS-Articles/1.0'}});
  if(!resp.ok)throw Error('HTTP '+resp.status);
  return await resp.json();
 } finally {clearTimeout(timer)}
}
async function translate(value){
 const word=clean(value);if(!word)return '';
 try{
  const data=await fetchJSON('https://translate.googleapis.com/translate_a/single?client=gtx&sl=en&tl=uz&dt=t&q='+encodeURIComponent(word));
  const translated=Array.isArray(data?.[0])?data[0].map(x=>String(x?.[0]||'')).join('').trim():'';
  if(translated&&translated.toLowerCase()!==word.toLowerCase())return translated.slice(0,320);
 }catch{}
 try{
  const data=await fetchJSON('https://api.mymemory.translated.net/get?langpair=en%7Cuz&q='+encodeURIComponent(word));
  const translated=String(data?.responseData?.translatedText||'').trim();
  if(translated&&translated.toLowerCase()!==word.toLowerCase()&&!/MYMEMORY WARNING/i.test(translated))return translated.slice(0,320);
 }catch{}
 return '';
}
module.exports=async function handler(req,res){
 res.setHeader('Content-Type','application/json; charset=utf-8');
 res.setHeader('Cache-Control','public, s-maxage=86400, stale-while-revalidate=604800');
 if(req.method!=='GET')return res.status(405).json({error:'GET only'});
 const values=req.query?.words ? String(req.query.words).split('|').slice(0,15) : [req.query?.word];
 const words=[...new Set(values.map(clean).filter(x=>x&&x.length<=120))];
 if(!words.length)return res.status(400).json({error:'word required'});
 // Process in limited batches to avoid overwhelming the free translation backends.
 const out={};
 for(let i=0;i<words.length;i+=3){
  const batch=words.slice(i,i+3);
  const translated=await Promise.all(batch.map(word=>translate(word)));
  for(let j=0;j<batch.length;j++)out[batch[j]]=translated[j];
 }
 return res.status(200).json({translations:out});
};
