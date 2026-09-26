const CACHE='hay-masaleh-v12';
const CORE=['index.dc.html','products.dc.html','categories.dc.html','about.dc.html','contact.dc.html','login.dc.html','driver-register.dc.html','panel.dc.html','driver-panel.dc.html','admin.dc.html','admin-referral.dc.html','ReferCard.dc.html','admin-cms.dc.html','admin-inventory.dc.html','admin-team.dc.html','admin-rewards.dc.html','driver-panel-advanced.dc.html','supplier-panel-advanced.dc.html','admin-finance.dc.html','supplier-panel.dc.html','WaybillCard.dc.html','MapPicker.dc.html','SiteHeader.dc.html','SiteFooter.dc.html','PageHero.dc.html','ConsultModal.dc.html','support.js','manifest.webmanifest','assets/hero.jpg','assets/warehouse.jpg','assets/ctabg.jpg','assets/c1.jpg','assets/c2.jpg','assets/c3.jpg','assets/c4.jpg','assets/c5.jpg','assets/logo-light.png','assets/logo-dark.png','assets/icon-192.png','assets/icon-512.png'];
self.addEventListener('install',e=>{e.waitUntil(caches.open(CACHE).then(c=>c.addAll(CORE)).catch(()=>{}));self.skipWaiting();});
self.addEventListener('activate',e=>{e.waitUntil(caches.keys().then(ks=>Promise.all(ks.filter(k=>k!==CACHE).map(k=>caches.delete(k)))).then(()=>self.clients.claim()));});
const put=(r,res)=>{ if(res&&res.ok&&(res.type==='basic'||res.type==='cors')){const cp=res.clone();caches.open(CACHE).then(c=>c.put(r,cp));} return res; };
self.addEventListener('fetch',e=>{
  const r=e.request; if(r.method!=='GET') return;
  const url=new URL(r.url);
  const isStatic=/\.(png|jpe?g|webp|svg|gif|woff2?|ttf)$/i.test(url.pathname)||url.hostname.includes('fonts.g')||url.hostname.includes('jsdelivr');
  if(isStatic){ e.respondWith(caches.match(r).then(m=>m||fetch(r).then(res=>put(r,res)))); return; }
  e.respondWith(fetch(r).then(res=>put(r,res)).catch(()=>caches.match(r,{ignoreSearch:r.mode==='navigate'}).then(m=>m||(r.mode==='navigate'?caches.match('index.dc.html'):undefined))));
});
