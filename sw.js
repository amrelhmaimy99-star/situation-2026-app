const CACHE='situation-v2';
const ASSETS=['/','/index.html','/css/style.css','/js/api.js','/js/app.js'];
self.addEventListener('install',e=>e.waitUntil(caches.open(CACHE).then(c=>c.addAll(ASSETS))));
self.addEventListener('fetch',e=>{
  if(e.request.url.includes('script.google.com'))return;
  e.respondWith(caches.match(e.request).then(r=>r||fetch(e.request).then(res=>{
    const c=res.clone();caches.open(CACHE).then(cache=>cache.put(e.request,c));return res;
  }).catch(()=>caches.match('/index.html'))));
});
