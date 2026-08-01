const CACHE_NAME = "artistos-pwa-v1"
const APP_SHELL = ["/", "/login", "/signup", "/dashboard", "/icon.png", "/apple-icon.png"]

self.addEventListener("install", (event) => {
  event.waitUntil(caches.open(CACHE_NAME).then((cache) => cache.addAll(APP_SHELL)))
  self.skipWaiting()
})

self.addEventListener("activate", (event) => {
  event.waitUntil(
    caches
      .keys()
      .then((keys) => Promise.all(keys.filter((key) => key !== CACHE_NAME).map((key) => caches.delete(key))))
      .then(() => self.clients.claim())
  )
})

self.addEventListener("fetch", (event) => {
  if (event.request.method !== "GET") return

  event.respondWith(
    fetch(event.request)
      .then((response) => response)
      .catch(() => caches.match(event.request).then((cached) => cached || caches.match("/")))
  )
})

self.addEventListener("push", (event) => {
  let data = {}
  try {
    data = event.data ? event.data.json() : {}
  } catch {
    data = {}
  }

  event.waitUntil(
    self.registration.showNotification(data.title || "ArtistOS", {
      body: data.body || "",
      icon: "/icons/icon-192x192.png",
      badge: "/icons/icon-96x96.png",
      data: { url: data.url || "/dashboard" },
    })
  )
})

self.addEventListener("notificationclick", (event) => {
  event.notification.close()

  const target = (event.notification.data && event.notification.data.url) || "/dashboard"

  event.waitUntil(
    self.clients.matchAll({ type: "window", includeUncontrolled: true }).then((clientList) => {
      for (const client of clientList) {
        if (new URL(client.url).pathname === target && "focus" in client) {
          return client.focus()
        }
      }

      // Reuse an already-open app window rather than stacking new ones.
      const existing = clientList[0]
      if (existing && "navigate" in existing) {
        return existing.navigate(target).then((client) => client && client.focus())
      }

      return self.clients.openWindow(target)
    })
  )
})
