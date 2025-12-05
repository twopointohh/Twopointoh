// Nome do Cache - MUDANÇA CRÍTICA: 'v2' para forçar o Service Worker a atualizar
const CACHE_NAME = 'editor-3d-v3';

// Ficheiros a armazenar em cache: Inclui todos os assets locais e TODOS os CDNs (bibliotecas externas)
const urlsToCache = [
    // Ficheiros Locais
    './',
    './twopointoh.html',
    './manifest.json',
    './twopointoh.png',
    './Fundo.jpg', // <--- ADICIONADO: Garante que a imagem de fundo está no cache
    './xray.js',
    './scanner.js',
    './criador.js',
    
    // Dependências Externas (CDNs) - CRÍTICAS PARA O FUNCIONAMENTO OFFLINE
    'https://cdnjs.cloudflare.com/ajax/libs/font-awesome/6.0.0-beta3/css/all.min.css',
    'https://cdn.tailwindcss.com',
    'https://cdnjs.cloudflare.com/ajax/libs/three.js/r128/three.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/OrbitControls.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/controls/TransformControls.js',
    'https://cdn.jsdelivr.net/npm/dxf-parser@1.1.2/dist/dxf-parser.min.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/GLTFLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/OBJLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/MTLLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/STLLoader.js',
    'https://cdn.jsdelivr.net/npm/three@0.128.0/examples/js/loaders/ColladaLoader.js',
];

// Instalar o Service Worker e armazenar o cache
self.addEventListener('install', event => {
  event.waitUntil(
    caches.open(CACHE_NAME)
      .then(cache => {
        console.log('Cache aberta com sucesso');
        // Adiciona todos os ficheiros à cache
        return cache.addAll(urlsToCache); 
      })
      .catch(err => {
        console.error('Falha ao adicionar ficheiros à cache:', err);
      })
  );
});

// Intercetar pedidos de rede e servir a partir da cache (Cache-First)
self.addEventListener('fetch', event => {
  event.respondWith(
    caches.match(event.request)
      .then(response => {
        // Cache hit - devolve a resposta da cache
        if (response) {
          return response;
        }
        // Nenhuma resposta na cache - executa pedido de rede
        return fetch(event.request);
      }
    )
  );
});

// Limpar caches antigas 
self.addEventListener('activate', event => {
  const cacheWhitelist = [CACHE_NAME];
  event.waitUntil(
    caches.keys().then(cacheNames => {
      return Promise.all(
        cacheNames.map(cacheName => {
          // Se o nome da cache não for a versão 'v2', elimina-a
          if (cacheWhitelist.indexOf(cacheName) === -1) { // Mudança para indexOf(cacheName) === -1
            return caches.delete(cacheName);
          }
        })
      );
    })
  );
});