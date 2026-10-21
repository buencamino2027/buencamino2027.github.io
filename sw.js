// Service worker: guarda la app en el móvil para que funcione sin cobertura.
// Si cambias index.html, sube el número de versión para que todos reciban la nueva.
const CACHE = "camino-v24";
const CORE = [
  "./",
  "./index.html",
  "./trip.json",
  "./mapa.json?v=153b6c42",
  "./manifest.webmanifest",
  "./favicon.png",
  "./apple-touch-icon.png",
  "./icon-192.png",
  "./icon-512.png",
  "./img/aloj-arzua-1.jpg",
  "./img/aloj-arzua-2.jpg",
  "./img/aloj-arzua-3.jpg",
  "./img/aloj-palas-1.jpg",
  "./img/aloj-palas-2.jpg",
  "./img/aloj-palas-3.jpg",
  "./img/aloj-palas.jpg",
  "./img/aloj-pedrouzo-1.jpg",
  "./img/aloj-pedrouzo-2.jpg",
  "./img/aloj-pedrouzo-3.jpg",
  "./img/aloj-santiago-1.jpg",
  "./img/aloj-santiago-2.jpg",
  "./img/aloj-santiago-3.jpg",
  "./img/aloj-sarria-1.jpg",
  "./img/aloj-sarria-2.jpg",
  "./img/aloj-sarria-3.jpg",
  "./img/aloj-sarria.jpg",
  "./img/fondo.jpg",
  "./img/g-botas.jpg",
  "./img/g-hierba.jpg",
  "./img/g-monte.jpg",
  "./img/g-niebla.jpg",
  "./img/g-pasos.jpg",
  "./img/g-rebano.jpg",
  "./img/g-valle.jpg",
  "./img/g-verde.jpg",
  "./img/intro.jpg",
  "./img/mochila.jpg",
  "./img/p-lana.jpg",
  "./img/p-madera.jpg",
  "./img/p-musgo.jpg",
  "./img/p-ovejas.jpg",
  "./img/santiago-mini.jpg",
  "./img/santiago.jpg",
  "./img/av/alberto.png",
  "./img/av/alvaro.png",
  "./img/av/ana.png",
  "./img/av/fran.png",
  "./img/av/janina.png",
  "./img/av/javi.png",
  "./img/av/jorge.png",
  "./img/av/marina.png",
  "./img/av/marta.png",
  "./img/av/pablo.png",
  "./img/av/sandra.png"
];

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE).then((c) => c.addAll(CORE)).then(() => self.skipWaiting()));
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches.keys()
      .then((keys) => Promise.all(keys.filter((k) => k !== CACHE && k !== SAT).map((k) => caches.delete(k))))
      .then(() => self.clients.claim())
  );
});

// Satélite (PNOA): primero lo guardado en el móvil; si no, internet y se guarda.
const SAT = "camino-sat";
async function satFirst(request) {
  const cache = await caches.open(SAT);
  const hit = await cache.match(request.url);
  if (hit) return hit;
  try {
    const res = await fetch(request.url, { mode: "cors" });
    if (res && res.ok) cache.put(request.url, res.clone());
    return res;
  } catch (e) { return new Response("", { status: 504 }); }
}

// Red primero (para recibir cambios de trip.json); si no hay cobertura, la copia guardada.
async function networkFirst(request) {
  const cache = await caches.open(CACHE);
  try {
    const fresh = await fetch(request);
    if (fresh && fresh.ok) cache.put(request, fresh.clone());
    return fresh;
  } catch (e) {
    return (await cache.match(request, { ignoreSearch: true })) || (await cache.match("./index.html"));
  }
}

// Copia guardada al instante y se actualiza en segundo plano (fuentes e iconos).
async function staleWhileRevalidate(request) {
  const cache = await caches.open(CACHE);
  const cached = await cache.match(request);
  const update = fetch(request)
    .then((res) => { if (res && (res.ok || res.type === "opaque")) cache.put(request, res.clone()); return res; })
    .catch(() => cached);
  return cached || update;
}

self.addEventListener("fetch", (event) => {
  const req = event.request;
  if (req.method !== "GET") return;
  const url = new URL(req.url);

  if (url.hostname === "www.ign.es") { event.respondWith(satFirst(req)); return; }
  if (url.origin === self.location.origin) {
    if (req.mode === "navigate" || url.pathname.endsWith("/trip.json") || url.pathname.endsWith("/index.html")) {
      event.respondWith(networkFirst(req));
    } else {
      event.respondWith(staleWhileRevalidate(req));
    }
  } else if (url.hostname === "fonts.googleapis.com" || url.hostname === "fonts.gstatic.com" || url.hostname.endsWith("basemaps.cartocdn.com") || url.hostname === "tile.openstreetmap.org" || url.hostname === "server.arcgisonline.com") {
    event.respondWith(staleWhileRevalidate(req));
  }
});
