(() => {
  'use strict';
  const navId='lastChanceNav';
  const frameId='vividLastChanceFrame';
  function openLastChance(){
    const host=document.getElementById('mainContent'),nav=document.getElementById(navId);
    if(!host||!nav)return;
    document.querySelectorAll('#primaryNav .nav-item.active').forEach(el=>el.classList.remove('active'));
    nav.classList.add('active');
    host.innerHTML='<section class="vivid-last-chance-shell" style="width:100%;max-width:none;margin:0;padding:0"><div style="display:flex;align-items:center;gap:12px;justify-content:space-between;flex-wrap:wrap;margin:0 0 14px"><div><small style="letter-spacing:.15em;opacity:.65">PERSONAL PLANNER · VIVID IELTS</small><h1 style="margin:2px 0 0;font-size:clamp(24px,4vw,38px)">LAST CHANCE</h1></div><a href="/last-chance/index.html" style="text-decoration:none;font-weight:700;color:inherit" target="_blank" rel="noopener">↗ Alohida oynada ochish</a></div><iframe id="'+frameId+'" title="LAST CHANCE — kunlik rejalar va kuzatuv" src="/last-chance/index.html" style="width:100%;height:100vh;min-height:700px;border:0;border-radius:18px;background:#0b1020;display:block" loading="eager" allow="fullscreen"></iframe></section>';
    document.querySelector('.main-area')?.scrollTo?.({top:0,behavior:'instant'});
    window.scrollTo?.({top:0,behavior:'instant'});
  }
  document.addEventListener('click',event=>{
    const btn=event.target.closest('#'+navId);
    if(btn){event.preventDefault();event.stopPropagation();openLastChance();return}
    if(event.target.closest('#primaryNav [data-view]'))document.getElementById(navId)?.classList.remove('active');
  },true);
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||!event.data||event.data.type!=='vivid:last-chance:height')return;
    const frame=document.getElementById(frameId);
    if(frame&&frame.contentWindow===event.source){
      const h=Number(event.data.height);
      if(Number.isFinite(h)&&h>0)frame.style.height=Math.max(700,Math.min(30000,h+20))+'px';
    }
  });
  window.VividLastChance=Object.freeze({open:openLastChance});
})();
