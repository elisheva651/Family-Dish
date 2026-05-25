const CACHE_NAME = 'family-dish-v1'

// Cache the app shell on install
self.addEventListener('install', (event) => {
  self.skipWaiting()
})

// Clean up old caches on activate
self.addEventListener('activate', (event) => {
  event.waitUntil(
    caches.keys().then((names) =>
      Promise.all(
        names
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
    )
  )
  self.clients.claim()
})

// Network-first strategy: try network, fall back to cache
self.addEventListener('fetch', (event) => {
  // Skip non-GET requests and chrome-extension requests
  if (event.request.method !== 'GET') return
  if (event.request.url.startsWith('chrome-extension://')) return

  event.respondWith(
    fetch(event.request)
      .then((response) => {
        // Cache successful responses
        if (response.ok) {
          const clone = response.clone()
          caches.open(CACHE_NAME).then((cache) => {
            cache.put(event.request, clone)
          })
        }
        return response
      })
      .catch(() => {
        // Fall back to cache when offline
        return caches.match(event.request)
      })
  )
})
