// Service Worker for Cal-Pro PWA
// This enables offline functionality and app-like experience

const CACHE_NAME = 'cal-pro-v1'
const ASSETS_TO_CACHE = [
  '/',
  '/index.html',
  '/manifest.json',
]

// Install event - cache static assets
self.addEventListener('install', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE_NAME)
      await cache.addAll(ASSETS_TO_CACHE).catch((err) => {
        console.warn('Cache asset failed:', err)
      })
      self.skipWaiting()
    })()
  )
})

// Activate event - clean up old caches
self.addEventListener('activate', (event: ExtendableEvent) => {
  event.waitUntil(
    (async () => {
      const cacheNames = await caches.keys()
      await Promise.all(
        cacheNames
          .filter((name) => name !== CACHE_NAME)
          .map((name) => caches.delete(name))
      )
      self.clients.claim()
    })()
  )
})

// Fetch event - network first, fall back to cache
self.addEventListener('fetch', (event: FetchEvent) => {
  const { request } = event

  // Skip non-GET requests
  if (request.method !== 'GET') {
    return
  }

  // Skip API calls and external requests (they will fail offline)
  if (request.url.includes('/api/') || request.url.includes('supabase') || request.url.includes('openfoodfacts')) {
    return
  }

  event.respondWith(
    (async () => {
      try {
        // Try network first
        const response = await fetch(request)
        if (response.ok) {
          // Cache successful responses
          const cache = await caches.open(CACHE_NAME)
          cache.put(request, response.clone())
          return response
        }
      } catch (err) {
        // Network failed, try cache
        const cachedResponse = await caches.match(request)
        if (cachedResponse) {
          return cachedResponse
        }
      }

      // Return offline page if available
      return caches.match('/index.html') || new Response('Offline', { status: 503 })
    })()
  )
})
