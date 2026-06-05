// RS-TK04 — Service Worker para Web Push.
// Vive em /sw.js (escopo raiz) para conseguir interceptar push events em
// background mesmo com o app fechado. O payload esperado é o JSON serializado
// por sendPushToNearbyUsers em src/lib/notifications/dispatch.ts.

self.addEventListener("install", (event) => {
  // skipWaiting deixa este SW ativar imediatamente em deploys novos, sem
  // esperar todas as abas antigas fecharem. Aceitável aqui porque o SW
  // não compartilha estado com a página além das notificações.
  event.waitUntil(self.skipWaiting());
});

self.addEventListener("activate", (event) => {
  event.waitUntil(self.clients.claim());
});

function parsePushPayload(event) {
  if (!event.data) return null;
  try {
    return event.data.json();
  } catch {
    return { title: "Rota Segura", body: event.data.text() };
  }
}

self.addEventListener("push", (event) => {
  const payload = parsePushPayload(event) ?? {};
  const title = payload.title || "⚠️ Alerta próximo";
  const options = {
    body: payload.body || "Nova ocorrência registrada perto de você.",
    icon: payload.icon || "/favicon.ico",
    badge: payload.badge || "/favicon.ico",
    tag: payload.occurrenceId ? `occurrence:${payload.occurrenceId}` : undefined,
    data: {
      occurrenceId: payload.occurrenceId ?? null,
      lat: payload.lat ?? null,
      lng: payload.lng ?? null,
      url: payload.url ?? "/",
    },
  };
  event.waitUntil(self.registration.showNotification(title, options));
});

self.addEventListener("notificationclick", (event) => {
  event.notification.close();
  const { occurrenceId, lat, lng, url } = event.notification.data ?? {};
  const params = new URLSearchParams();
  if (occurrenceId) params.set("occurrence", occurrenceId);
  if (lat != null && lng != null) {
    params.set("lat", String(lat));
    params.set("lng", String(lng));
  }
  const target = `${url || "/"}${params.toString() ? `?${params}` : ""}`;

  event.waitUntil(
    (async () => {
      const allClients = await self.clients.matchAll({
        type: "window",
        includeUncontrolled: true,
      });
      for (const client of allClients) {
        if ("focus" in client) {
          await client.navigate(target).catch(() => {});
          return client.focus();
        }
      }
      if (self.clients.openWindow) {
        return self.clients.openWindow(target);
      }
      return null;
    })(),
  );
});
