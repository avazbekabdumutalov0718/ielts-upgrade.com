(() => {
  'use strict';
  if(window.parent===window)return;
  const link=document.querySelector('.parent-link a');
  if(link)link.target='_top';
  let queued=false;
  function notify(){
    if(queued)return;queued=true;
    requestAnimationFrame(()=>{
      queued=false;
      const height=Math.max(document.body?.scrollHeight||0,document.documentElement.scrollHeight||0);
      window.parent.postMessage({type:'vivid:last-chance:height',height},location.origin);
    });
  }
  if('ResizeObserver' in window){
    const observer=new ResizeObserver(notify);
    if(document.body)observer.observe(document.body);
    const main=document.querySelector('main');
    if(main)observer.observe(main);
  }
  window.addEventListener('load',notify);
  document.addEventListener('input',notify);
  document.addEventListener('click',notify);
  setTimeout(notify,250);
})();
